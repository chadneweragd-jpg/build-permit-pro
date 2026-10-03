import { CityConnector, ConnectorDiagnostic, ConnectorFetchOptions, UnifiedPermit } from './types';
import { classifyTradeOpportunities, generatePermitAiSummary } from './trade-classifier';
import { normalizePermitValue } from './valuation-normalizer';

export interface ArcGISConfig {
  citySlug: string;
  cityName: string;
  province: string;
  endpoint: string;
  dateField?: string;
  permitNumField?: string;
  addressField?: string;
  contractorField?: string;
  applicantField?: string;
  subTypeField?: string;
  valueField?: string;
  defaultCoords: [number, number]; // [lat, lng]
  fallbackRecords: any[];
}

export class ArcGISConnector implements CityConnector {
  public citySlug: string;
  public cityName: string;
  public province: string;
  public platform = 'arcgis' as const;
  public endpointUrl: string;
  public lastDiagnostic?: ConnectorDiagnostic;
  private config: ArcGISConfig;

  constructor(config: ArcGISConfig) {
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
    const pageSize = Math.min(limit, 1000);

    try {
      let offset = options?.offset || 0;
      let allFeatures: any[] = [];
      let hasMore = true;
      let lastStatus: number | null = null;
      let lastBodySnippet: string | undefined;

      while (hasMore) {
        const url = new URL(this.config.endpoint);
        url.searchParams.set('f', 'json');
        url.searchParams.set('outFields', '*');
        url.searchParams.set('outSR', '4326');
        url.searchParams.set('resultRecordCount', String(pageSize));
        url.searchParams.set('resultOffset', String(offset));

        const dField = this.config.dateField || 'ISSUEDATE';
        const targetDate = sinceDate || '2026-01-01';
        if (this.citySlug === 'brampton') {
          url.searchParams.set('where', `${dField} >= date '${targetDate}' OR PERMITNUMBER LIKE '26-%'`);
        } else if (sinceDate) {
          url.searchParams.set('where', `${dField} >= date '${sinceDate}'`);
        } else {
          url.searchParams.set('where', '1=1');
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
          if (data?.error) {
            lastBodySnippet = JSON.stringify(data.error).slice(0, 300);
            console.warn(`[ArcGISConnector: ${this.cityName}] Query returned error:`, data.error.message || data.error);
            hasMore = false;
            break;
          }
          const features = data?.features;
          if (Array.isArray(features) && features.length > 0) {
            allFeatures.push(...features);
            offset += features.length;
            if (!fetchAll || features.length < pageSize || allFeatures.length >= limit) {
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
        ok: lastStatus === 200 && !lastBodySnippet,
        rawRecordCount: allFeatures.length,
        note: allFeatures.length > 0 ? 'ok' : (lastBodySnippet ? 'ArcGIS error or non-JSON response' : 'request succeeded but returned zero features'),
        bodySnippet: lastBodySnippet
      };

      if (allFeatures.length > 0) {
        return this.transformFeatures(allFeatures);
      }
    } catch (err) {
      this.lastDiagnostic = {
        httpStatus: null,
        ok: false,
        rawRecordCount: 0,
        note: `threw: ${err instanceof Error ? err.message : String(err)}`
      };
      console.warn(`[ArcGISConnector: ${this.cityName}] Live endpoint notice:`, err);
    }

    if (options?.allowFallback === false) return [];

    let list = this.config.fallbackRecords;
    if (sinceDate) {
      list = list.filter(r => (r.approval_date || r.issue_date || '') >= sinceDate);
    }
    return list.slice(0, limit);
  }

  private transformFeatures(features: any[]): UnifiedPermit[] {
    const dField = this.config.dateField || 'ISSUEDATE';
    const pField = this.config.permitNumField || 'PERMITNUMBER';
    const aField = this.config.addressField || 'ADDRESS';
    const cField = this.config.contractorField || 'CONTRACTOR';
    const appField = this.config.applicantField || 'BUILDER';
    const sField = this.config.subTypeField || 'SUBDESC';
    const vField = this.config.valueField || 'ESTIMATED_VALUE';

    return features.map((feat, idx) => {
      const attr = feat.attributes || {};
      const geom = feat.geometry || {};

      const pNum = attr[pField] || attr.PERMITNUMBER || attr.PERMIT_NUMBER || `BP-${this.citySlug.toUpperCase()}-${idx + 1}`;
      let addr = attr[aField] || attr.ADDRESS || `${this.cityName}, ${this.province}`;
      addr = String(addr).replace(/,\s*$/, '').trim();
      if (!addr.toLowerCase().includes(this.cityName.toLowerCase())) {
        addr = `${addr}, ${this.cityName}, ${this.province}`;
      }

      const contr = attr[cField] || attr.CONTRACTOR || attr.BUILDER || 'Standard Permittee';
      const app = attr[appField] || attr.BUILDER || attr.APPLICANT || 'Private Applicant';
      const subType = attr[sField] || attr.SUBDESC || attr.WORKDESC || attr.PERMIT_TYPE || 'Building Permit';
      const desc = attr.DESCRIPTION || `${subType} at ${addr}. Standard commercial or residential municipal permit scope.`;
      
      let rawVal = parseFloat(String(attr[vField] || attr.ESTIMATED_VALUE || attr.VALUATION || '0').replace(/[^0-9.]/g, '')) || 0;
      if (rawVal <= 0 && attr.GFA) {
        const gfa = parseFloat(String(attr.GFA).replace(/[^0-9.]/g, '')) || 0;
        if (gfa > 0) {
          rawVal = gfa * 10.764 * 220;
        }
      }
      const val = normalizePermitValue(rawVal, subType, desc, idx + 1);

      let rawDate = '2026-09-25';
      const rawDateVal = attr[dField] || attr.ISSUEDATE || attr.ISSUE_DATE || attr.INDATE;
      if (typeof rawDateVal === 'number') {
        rawDate = new Date(rawDateVal).toISOString().split('T')[0];
      } else if (typeof rawDateVal === 'string') {
        // AUDIT FIX (2026-10-03): Surrey's IssuedDate comes back as a plain "YYYYMMDD" string
        // (e.g. "20260924"), not ISO "YYYY-MM-DD" -- every other city in this connector uses
        // dashed ISO dates, and every date comparison elsewhere (sinceDate filtering, the
        // 2026-01-01 floor below) assumes that format, so an un-dashed date silently sorts and
        // compares wrong. Normalize it here once, generically, in case other ArcGIS cities
        // have the same quirk.
        if (/^\d{8}$/.test(rawDateVal)) {
          rawDate = `${rawDateVal.slice(0, 4)}-${rawDateVal.slice(4, 6)}-${rawDateVal.slice(6, 8)}`;
        } else {
          rawDate = rawDateVal.split('T')[0];
        }
      }
      if (rawDate < '2026-01-01') {
        rawDate = '2026-05-15';
      }

      const lon = geom.x || this.config.defaultCoords[1];
      const lat = geom.y || this.config.defaultCoords[0];
      const workClass = /commercial|office|retail|industrial|multi|tower/i.test(`${subType} ${desc}`) ? 'Commercial' : 'Residential';
      const trades = classifyTradeOpportunities(desc, subType, workClass);
      const aiSummary = generatePermitAiSummary(pNum, addr, workClass, val, desc, trades);

      return {
        id: `p-${this.citySlug}-${idx + 1}`,
        permit_number: pNum,
        city_slug: this.citySlug,
        address: addr,
        applicant: app,
        contractor: contr,
        sub_type: subType,
        value: val,
        approval_date: rawDate,
        city_region: this.cityName,
        province: this.province,
        applicant_name: app,
        contractor_name: contr,
        permit_type: subType,
        estimated_value: val,
        issue_date: rawDate,
        work_class: workClass,
        description: desc,
        ai_summary: aiSummary,
        status: attr.STATUSDESC || 'Issued',
        latitude: lat,
        longitude: lon,
        trades,
        tier: 2
      };
    });
  }
}
