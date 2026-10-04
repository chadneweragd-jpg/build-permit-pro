import { CityConnector, ConnectorDiagnostic, ConnectorFetchOptions, UnifiedPermit } from './types';
import { classifyTradeOpportunities, generatePermitAiSummary } from './trade-classifier';
import { normalizePermitValue } from './valuation-normalizer';

export interface SocrataConfig {
  citySlug: string;
  cityName: string;
  province: string;
  endpoint: string;
  dateField?: string;
  permitNumField?: string;
  addressField?: string;
  /**
   * EXPANSION (2026-10-04): some cities (e.g. New York's house_no/street_name) split the
   * address across separate columns instead of one combined field. When set, these are
   * joined (space-separated, blanks dropped) instead of using `addressField`.
   */
  addressFields?: string[];
  contractorField?: string;
  applicantField?: string;
  subTypeField?: string;
  valueField?: string;
  latField?: string;
  lonField?: string;
  defaultCoords: [number, number]; // [lat, lng]
  fallbackRecords: any[];
}

export class SocrataConnector implements CityConnector {
  public citySlug: string;
  public cityName: string;
  public province: string;
  public platform = 'socrata' as const;
  public endpointUrl: string;
  public lastDiagnostic?: ConnectorDiagnostic;
  private config: SocrataConfig;

  constructor(config: SocrataConfig) {
    this.citySlug = config.citySlug;
    this.cityName = config.cityName;
    this.province = config.province;
    this.endpointUrl = config.endpoint;
    this.config = config;
  }

  public async fetchPermits(options?: ConnectorFetchOptions): Promise<UnifiedPermit[]> {
    const limit = options?.limit || 100;
    const sinceDate = options?.sinceDate;
    const fetchAll = options?.fetchAll || limit > 1000;
    const pageSize = Math.min(limit, 1000);

    try {
      let offset = options?.offset || 0;
      let allRawRecords: any[] = [];
      let hasMore = true;
      let lastStatus: number | null = null;
      let lastBodySnippet: string | undefined;

      while (hasMore) {
        const url = new URL(this.config.endpoint);
        url.searchParams.set('$limit', String(pageSize));
        url.searchParams.set('$offset', String(offset));
        url.searchParams.set('$order', `${this.config.dateField || 'issueddate'} DESC`);

        if (sinceDate) {
          url.searchParams.set('$where', `${this.config.dateField || 'issueddate'} >= '${sinceDate}'`);
        }

        let data: any[] | null = null;
        let res = await fetch(url.toString(), {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 3600 }
        });
        lastStatus = res.status;

        if (res.ok) {
          const rawText = await res.text();
          try { data = JSON.parse(rawText); } catch { lastBodySnippet = rawText.slice(0, 300); }
        } else {
          lastBodySnippet = (await res.text().catch(() => '')).slice(0, 300);
          // Retry without $order if column not orderable
          const fallbackUrl = new URL(this.config.endpoint);
          fallbackUrl.searchParams.set('$limit', String(pageSize));
          fallbackUrl.searchParams.set('$offset', String(offset));
          if (sinceDate) {
            fallbackUrl.searchParams.set('$where', `${this.config.dateField || 'issueddate'} >= '${sinceDate}'`);
          }
          const retryRes = await fetch(fallbackUrl.toString(), {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 3600 }
          });
          lastStatus = retryRes.status;
          if (retryRes.ok) {
            const retryText = await retryRes.text();
            try { data = JSON.parse(retryText); lastBodySnippet = undefined; } catch { lastBodySnippet = retryText.slice(0, 300); }
          } else {
            lastBodySnippet = (await retryRes.text().catch(() => '')).slice(0, 300);
          }
        }

        if (Array.isArray(data) && data.length > 0) {
          allRawRecords.push(...data);
          offset += data.length;
          if (!fetchAll || data.length < pageSize || allRawRecords.length >= limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      this.lastDiagnostic = {
        httpStatus: lastStatus,
        ok: lastStatus === 200,
        rawRecordCount: allRawRecords.length,
        note: allRawRecords.length > 0 ? 'ok' : (lastBodySnippet ? 'non-JSON or error response body' : 'request succeeded but returned zero records'),
        bodySnippet: lastBodySnippet
      };

      if (allRawRecords.length > 0) {
        return this.transformRecords(allRawRecords);
      }
    } catch (err) {
      this.lastDiagnostic = {
        httpStatus: null,
        ok: false,
        rawRecordCount: 0,
        note: `threw: ${err instanceof Error ? err.message : String(err)}`
      };
      console.warn(`[SocrataConnector: ${this.cityName}] Live API notice:`, err);
    }

    if (options?.allowFallback === false) return [];

    // Use authentic fallback records
    let list = this.config.fallbackRecords;
    if (sinceDate) {
      list = list.filter(r => (r.approval_date || r.issue_date || '') >= sinceDate);
    }
    return list.slice(0, limit);
  }

  private transformRecords(rawRows: any[]): UnifiedPermit[] {
    const dField = this.config.dateField || 'issueddate';
    const pField = this.config.permitNumField || 'permitnum';
    const aField = this.config.addressField || 'originaladdress';
    const cField = this.config.contractorField || 'contractorname';
    const appField = this.config.applicantField || 'applicantname';
    const sField = this.config.subTypeField || 'permittype';
    const vField = this.config.valueField || 'estprojectcost';

    return rawRows.map((row, idx) => {
      const pNum = row[pField] || row.permit_number || row.permitnum || row.row_id || `BP-${this.citySlug.toUpperCase()}-${idx + 1}`;
      
      let addr: string = '';
      if (this.config.addressFields && this.config.addressFields.length > 0) {
        addr = this.config.addressFields.map((f) => row[f]).filter(Boolean).join(' ').trim();
      }
      if (!addr) addr = row[aField] || row.address || row.originaladdress;
      if (!addr && (row.street_number || row.street_name)) {
        addr = `${row.street_number || ''} ${row.street_name || ''} ${row.street_type || row.street_direction || ''}`.trim();
      }
      if (!addr) addr = `${this.cityName}, ${this.province}`;

      const contr = row[cField] || row.contractorname || row.applicant_business_name || (row.job_description ? row.job_description.slice(0, 40) : 'Standard Permittee');
      const app = row[appField] || row.applicantname || row.applicant_business_name || row.building_type || 'Private Applicant';
      const subType = row[sField] || row.permittype || row.sub_type || row.job_category || 'Commercial Building Permit';
      
      const desc = row.job_description || row.description || `${subType} at ${addr}. Standard commercial or residential municipal permit scope.`;
      const rawVal = parseFloat(String(row[vField] || row.construction_value || row.estprojectcost || '0').replace(/[^0-9.]/g, '')) || 0;
      const val = normalizePermitValue(rawVal, subType, desc, idx + 1);

      const rawDate = row[dField] ? String(row[dField]).split('T')[0] : (row.issue_date ? String(row.issue_date).split('T')[0] : (row.issueddate ? String(row.issueddate).split('T')[0] : '2026-09-25'));
      
      let lat = this.config.defaultCoords[0];
      let lon = this.config.defaultCoords[1];

      if (row.latitude && row.longitude) {
        lat = parseFloat(row.latitude);
        lon = parseFloat(row.longitude);
      } else if (row.point && row.point.coordinates) {
        lon = Number(row.point.coordinates[0]);
        lat = Number(row.point.coordinates[1]);
      } else if (row.location && row.location.latitude && row.location.longitude) {
        lat = parseFloat(row.location.latitude);
        lon = parseFloat(row.location.longitude);
      }
      const workClass = /commercial|office|retail|industrial|multi|tower|transit|lrt/i.test(`${subType} ${desc}`) ? 'Commercial' : 'Residential';
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
        status: row.statuscurrent || row.status || 'Issued',
        latitude: Number(lat.toFixed(4)),
        longitude: Number(lon.toFixed(4)),
        trades,
        tier: 2
      };
    });
  }
}
