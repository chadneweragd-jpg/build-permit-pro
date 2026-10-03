import { CityConnector, ConnectorDiagnostic, ConnectorFetchOptions, UnifiedPermit } from './types';
import { classifyTradeOpportunities, generatePermitAiSummary } from './trade-classifier';
import { normalizePermitValue } from './valuation-normalizer';

export interface CKANConfig {
  citySlug: string;
  cityName: string;
  province: string;
  endpoint: string;
  format?: 'ckan_action' | 'opendatasoft';
  dateField?: string;
  permitNumField?: string;
  addressField?: string;
  contractorField?: string;
  applicantField?: string;
  subTypeField?: string;
  valueField?: string;
  defaultQuery?: string;
  defaultCoords: [number, number]; // [lat, lng]
  fallbackRecords: any[];
}

export class CKANConnector implements CityConnector {
  public citySlug: string;
  public cityName: string;
  public province: string;
  public platform = 'ckan' as const;
  public endpointUrl: string;
  public lastDiagnostic?: ConnectorDiagnostic;
  private config: CKANConfig;

  constructor(config: CKANConfig) {
    this.citySlug = config.citySlug;
    this.cityName = config.cityName;
    this.province = config.province;
    this.endpointUrl = config.endpoint;
    this.config = config;
  }

  public async fetchPermits(options?: ConnectorFetchOptions): Promise<UnifiedPermit[]> {
    const limit = options?.limit || 100;
    const sinceDate = options?.sinceDate;
    const fetchAll = options?.fetchAll || limit > 500;
    const isODS = this.config.format === 'opendatasoft';
    const pageSize = isODS ? Math.min(limit, 100) : Math.min(limit, 1000);

    try {
      let offset = options?.offset || 0;
      let allRecords: any[] = [];
      let hasMore = true;
      let lastStatus: number | null = null;
      let lastBodySnippet: string | undefined;

      while (hasMore) {
        const url = new URL(this.config.endpoint);
        if (isODS) {
          // AUDIT FIX (2026-10-03): the `field:[date TO *]` Lucene-style range query this used
          // to send gets rejected by Vancouver's OpenDataSoft API with a "Wrong date format"
          // 400 error regardless of date formatting tried (plain date, full ISO datetime) --
          // this API version's date-range syntax is its own `refine`/`rangefilter` mechanism,
          // not a `q=` Lucene range. Simpler and more robust: just sort newest-first and take
          // the most recent page; the daily cron's permit_number upsert is idempotent, so
          // re-fetching recent records on every run is harmless, and this never breaks again
          // if the exact query syntax changes on their end.
          url.searchParams.set('rows', String(pageSize));
          url.searchParams.set('start', String(offset));
          url.searchParams.set('sort', `-${this.config.dateField || 'issue_date'}`);
        } else {
          url.searchParams.set('limit', String(pageSize));
          url.searchParams.set('offset', String(offset));
          if (this.config.defaultQuery) {
            url.searchParams.set('q', this.config.defaultQuery);
          }
        }

        const res = await fetch(url.toString(), {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 3600 }
        });
        lastStatus = res.status;

        if (res.ok) {
          const rawText = await res.text();
          let data: any;
          try {
            data = JSON.parse(rawText);
          } catch {
            lastBodySnippet = rawText.slice(0, 300);
            hasMore = false;
            break;
          }
          let pageRecords: any[] = [];
          if (data.records) pageRecords = data.records;
          else if (data.result && data.result.records) pageRecords = data.result.records;

          if (Array.isArray(pageRecords) && pageRecords.length > 0) {
            allRecords.push(...pageRecords);
            offset += pageRecords.length;
            if (!fetchAll || pageRecords.length < pageSize || allRecords.length >= limit) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } else {
          lastBodySnippet = (await res.text().catch(() => '')).slice(0, 300);
          hasMore = false;
        }
      }

      this.lastDiagnostic = {
        httpStatus: lastStatus,
        ok: lastStatus === 200,
        rawRecordCount: allRecords.length,
        note: allRecords.length > 0 ? 'ok' : (lastBodySnippet ? 'non-JSON or error response body' : 'request succeeded but returned zero records'),
        bodySnippet: lastBodySnippet
      };

      if (allRecords.length > 0) {
        const transformed = this.transformRecords(allRecords);
        // Since records are sorted newest-first with no server-side date filter (see the ODS
        // note above), apply the sinceDate cutoff here instead so we don't write a city's
        // entire history to the database on every run.
        return sinceDate ? transformed.filter((p) => (p.approval_date || p.issue_date || '') >= sinceDate) : transformed;
      }
    } catch (err) {
      this.lastDiagnostic = {
        httpStatus: null,
        ok: false,
        rawRecordCount: 0,
        note: `threw: ${err instanceof Error ? err.message : String(err)}`
      };
      console.warn(`[CKANConnector: ${this.cityName}] Live endpoint notice:`, err);
    }

    if (options?.allowFallback === false) return [];

    let list = this.config.fallbackRecords;
    if (sinceDate) {
      list = list.filter(r => (r.approval_date || r.issue_date || '') >= sinceDate);
    }
    return list.slice(0, limit);
  }

  private transformRecords(records: any[]): UnifiedPermit[] {
    const dField = this.config.dateField || 'issue_date';
    const pField = this.config.permitNumField || 'permit_number';
    const aField = this.config.addressField || 'address';
    const cField = this.config.contractorField || 'contractor';
    const appField = this.config.applicantField || 'applicant';
    const sField = this.config.subTypeField || 'type';
    const vField = this.config.valueField || 'value';

    return records.map((item, idx) => {
      // In OpenDataSoft, fields are nested in item.fields
      const r = item.fields || item;

      const pNum = r[pField] || r.permitnumber || r.PERMIT_NUM || `BP-${this.citySlug.toUpperCase()}-${idx + 1}`;
      
      let addr = r[aField] || r.address;
      if (!addr && (r.STREET_NUM || r.STREET_NAME)) {
        addr = `${r.STREET_NUM || ''} ${r.STREET_NAME || ''} ${r.STREET_TYPE || ''}`.trim();
      }
      if (!addr) addr = `${this.cityName}, ${this.province}`;

      const contr = r[cField] || r.BUILDER_NAME || r.applicant || 'Standard Permittee';
      const app = r[appField] || r.BUILDER_NAME || r.applicant || 'Private Applicant';
      const subType = r[sField] || r.permitcategory || r.PERMIT_TYPE || r.typeofwork || 'Commercial Building Permit';
      const desc = r.projectdescription || r.DESCRIPTION || `${subType} at ${addr}. Standard commercial or residential municipal permit scope.`;
      const rawVal = parseFloat(String(r[vField] || r.projectvalue || r.EST_CONST_COST || '0').replace(/[^0-9.]/g, '')) || 0;
      const val = normalizePermitValue(rawVal, subType, desc, idx + 1);

      const rawDate = r[dField] ? String(r[dField]).split('T')[0] : (r.issuedate ? String(r.issuedate).split('T')[0] : (r.ISSUED_DATE ? String(r.ISSUED_DATE).split('T')[0] : '2026-09-25'));

      let lat = this.config.defaultCoords[0];
      let lon = this.config.defaultCoords[1];

      if (r.geo_point_2d && Array.isArray(r.geo_point_2d) && r.geo_point_2d.length >= 2) {
        lat = Number(r.geo_point_2d[0]);
        lon = Number(r.geo_point_2d[1]);
      } else if (r.geom && r.geom.coordinates && Array.isArray(r.geom.coordinates)) {
        lon = Number(r.geom.coordinates[0]);
        lat = Number(r.geom.coordinates[1]);
      } else if (r.latitude && r.longitude) {
        lat = parseFloat(r.latitude);
        lon = parseFloat(r.longitude);
      }
      const workClass = /commercial|office|retail|industrial|multi|tower|renovation/i.test(`${subType} ${desc}`) ? 'Commercial' : 'Residential';
      const trades = classifyTradeOpportunities(desc, subType, workClass);
      const aiSummary = generatePermitAiSummary(pNum, addr, workClass, val, desc, trades);

      return {
        id: `p-${this.citySlug}-${idx + 1}`,
        permit_number: pNum,
        city_slug: this.citySlug,
        address: `${addr}, ${this.cityName}, ${this.province}`,
        applicant: app,
        contractor: contr,
        sub_type: subType,
        value: Math.round(val),
        approval_date: rawDate,
        city_region: this.cityName,
        province: this.province,
        applicant_name: app,
        contractor_name: contr,
        permit_type: subType,
        estimated_value: Math.round(val),
        issue_date: rawDate,
        work_class: workClass,
        description: desc.slice(0, 300),
        ai_summary: aiSummary,
        status: r.STATUS || r.status || 'Issued',
        latitude: Number(lat.toFixed(4)),
        longitude: Number(lon.toFixed(4)),
        trades,
        tier: 2
      };
    });
  }
}
