import { MatchedTrade, WorkClass } from '@/types';

export interface UnifiedPermit {
  id: string;
  permit_number: string;
  city_slug: string;
  address: string;
  applicant: string;
  contractor: string;
  sub_type: string;
  value: number;
  approval_date: string; // ISO YYYY-MM-DD
  
  // Compatibility fields
  city_region: string;
  province: string;
  applicant_name?: string;
  contractor_name?: string;
  permit_type?: string;
  estimated_value?: number;
  issue_date?: string;
  work_class: WorkClass;
  description: string;
  ai_summary: string;
  status: string;
  latitude: number;
  longitude: number;
  trades: MatchedTrade[];
  tier?: 1 | 2;
  verified_builder?: any;
  contractor_phone?: string;
  contractor_email?: string;
}

export interface ConnectorFetchOptions {
  sinceDate?: string;
  limit?: number;
  offset?: number;
}

export interface CityConnector {
  citySlug: string;
  cityName: string;
  province: string;
  platform: 'socrata' | 'ckan' | 'arcgis' | 'portal';
  endpointUrl?: string;
  fetchPermits(options?: ConnectorFetchOptions): Promise<UnifiedPermit[]>;
}
