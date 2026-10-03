import { CityConnector, ConnectorFetchOptions, UnifiedPermit } from './types';
import { getFallbackKelownaPermits } from '../kelowna';

export class KelownaConnector implements CityConnector {
  public citySlug = 'kelowna';
  public cityName = 'Kelowna';
  public province = 'BC';
  public platform = 'portal' as const;
  public endpointUrl = 'https://www.kelowna.ca/homes-building/building-permits-inspections/approved-building-permits';

  public async fetchPermits(options?: ConnectorFetchOptions): Promise<UnifiedPermit[]> {
    // AUDIT NOTE (2026-10-03): unlike the other 16 cities, Kelowna has no live-fetch code
    // path at all right now -- this always returns the bundled sample set. When the cron
    // asks for allowFallback: false (its honest-data-only mode), be upfront about that
    // instead of silently handing back sample data, so the city is correctly reported as
    // having no live source rather than looking like a successful real sync.
    if (options?.allowFallback === false) return [];

    const raw = getFallbackKelownaPermits({
      sinceDate: options?.sinceDate,
      limit: options?.limit
    });

    return raw.map(p => ({
      id: p.id,
      permit_number: p.permit_number,
      city_slug: 'kelowna',
      address: p.address,
      applicant: p.applicant_name,
      contractor: p.contractor_name,
      sub_type: p.permit_type,
      value: p.estimated_value,
      approval_date: p.issue_date,
      city_region: 'Kelowna',
      province: 'BC',
      applicant_name: p.applicant_name,
      contractor_name: p.contractor_name,
      permit_type: p.permit_type,
      estimated_value: p.estimated_value,
      issue_date: p.issue_date,
      work_class: p.work_class,
      description: p.description,
      ai_summary: p.ai_summary,
      status: p.status,
      latitude: p.latitude,
      longitude: p.longitude,
      trades: p.trades,
      tier: p.tier || 2,
      contractor_phone: p.contractor_phone,
      contractor_email: p.contractor_email
    }));
  }
}
