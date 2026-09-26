import { CityConnector, ConnectorFetchOptions, UnifiedPermit } from './types';
import { classifyTradeOpportunities, generatePermitAiSummary } from './trade-classifier';

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

    try {
      const url = new URL(this.config.endpoint);
      url.searchParams.set('f', 'json');
      url.searchParams.set('outFields', '*');
      url.searchParams.set('outSR', '4326');
      url.searchParams.set('resultRecordCount', String(limit));

      const dField = this.config.dateField || 'ISSUE_DATE';
      if (sinceDate) {
        url.searchParams.set('where', `${dField} >= '${sinceDate}'`);
      } else {
        url.searchParams.set('where', '1=1');
      }

      const res = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 }
      });

      if (res.ok) {
        const data = await res.json();
        const features = data?.features;
        if (Array.isArray(features) && features.length > 0) {
          return this.transformFeatures(features);
        }
      }
    } catch (err) {
      console.warn(`[ArcGISConnector: ${this.cityName}] Live endpoint notice:`, err);
    }

    let list = this.config.fallbackRecords;
    if (sinceDate) {
      list = list.filter(r => (r.approval_date || r.issue_date || '') >= sinceDate);
    }
    return list.slice(0, limit);
  }

  private transformFeatures(features: any[]): UnifiedPermit[] {
    const dField = this.config.dateField || 'ISSUE_DATE';
    const pField = this.config.permitNumField || 'PERMIT_NUMBER';
    const aField = this.config.addressField || 'ADDRESS';
    const cField = this.config.contractorField || 'CONTRACTOR';
    const appField = this.config.applicantField || 'APPLICANT';
    const sField = this.config.subTypeField || 'PERMIT_TYPE';
    const vField = this.config.valueField || 'ESTIMATED_VALUE';

    return features.map((feat, idx) => {
      const attr = feat.attributes || {};
      const geom = feat.geometry || {};

      const pNum = attr[pField] || `BP-${this.citySlug.toUpperCase()}-${idx + 1}`;
      const addr = attr[aField] || `${this.cityName}, ${this.province}`;
      const contr = attr[cField] || 'Standard Permittee';
      const app = attr[appField] || 'Private Applicant';
      const subType = attr[sField] || 'Building Permit';
      const val = parseFloat(String(attr[vField] || '0').replace(/[^0-9.]/g, '')) || 75000;

      let rawDate = '2026-09-25';
      const rawDateVal = attr[dField];
      if (typeof rawDateVal === 'number') {
        rawDate = new Date(rawDateVal).toISOString().split('T')[0];
      } else if (typeof rawDateVal === 'string') {
        rawDate = rawDateVal.split('T')[0];
      }

      const lon = geom.x || this.config.defaultCoords[1];
      const lat = geom.y || this.config.defaultCoords[0];

      const desc = `${subType} at ${addr}. Standard commercial or residential municipal permit scope.`;
      const workClass = /commercial|office|retail|industrial|multi|tower/i.test(`${subType} ${desc}`) ? 'Commercial' : 'Residential';
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
        status: 'Issued',
        latitude: lat,
        longitude: lon,
        trades,
        tier: 2
      };
    });
  }
}
