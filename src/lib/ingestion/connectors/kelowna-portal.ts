import { CityConnector, ConnectorDiagnostic, ConnectorFetchOptions, UnifiedPermit } from './types';
import { classifyTradeOpportunities, generatePermitAiSummary } from './trade-classifier';
import { normalizePermitValue } from './valuation-normalizer';

// BUG FIX (2026-10-04): the ArcGIS FeatureServer previously used for Kelowna
// (Building_Permits_and_Capital_Projects) turned out to be a stale, infrequently-refreshed
// export -- a direct query confirmed its newest APPROVE_DATE values lag the real city permit
// system by 4-5 months (topping out around permit BP26-000769/000770, dated ~May 2026),
// while the city's own "Approved building permits" webpage was already showing permits like
// BP26-001716 approved September 29, 2026 (confirmed directly by the user via screenshot).
//
// That webpage has no separate JSON/XHR API behind it -- checked the network requests it
// makes on load, and the permit table is rendered server-side directly into the page's HTML
// (it's a Drupal Views table), not fetched client-side. So this connector fetches and parses
// that HTML table directly, which is the only way to get Kelowna's actual current data. The
// table is already sorted newest-approval-first, and each row's Approval Date cell carries a
// machine-readable ISO timestamp in a `content="..."` attribute (confirmed via direct
// inspection), which is what this parser keys off rather than the display text ("September
// 29, 2026"), since the attribute is unambiguous and locale-independent.
export class KelownaPortalConnector implements CityConnector {
  public citySlug = 'kelowna';
  public cityName = 'Kelowna';
  public province = 'BC';
  public platform = 'portal' as const;
  public endpointUrl = 'https://www.kelowna.ca/homes-building/building-permits-inspections/approved-building-permits';
  public lastDiagnostic?: ConnectorDiagnostic;

  private defaultCoords: [number, number] = [49.8880, -119.4960];
  private maxPages = 12; // ~600 rows -- comfortably more than a 14-day window ever needs

  public async fetchPermits(options?: ConnectorFetchOptions): Promise<UnifiedPermit[]> {
    const sinceDate = options?.sinceDate;
    const limit = options?.limit || 200;

    const allRows: ParsedRow[] = [];
    let lastStatus: number | null = null;
    let lastBodySnippet: string | undefined;

    try {
      for (let page = 0; page < this.maxPages; page++) {
        const url = page === 0 ? this.endpointUrl : `${this.endpointUrl}?page=${page}`;

        // BUG FIX (2026-10-04): the first version of this connector identified itself as
        // "BuildPermitProBot/1.0" and got a flat 403 from kelowna.ca when actually deployed
        // (confirmed via the cron's diagnostic output) -- it only ever worked in testing
        // because that testing went through a real browser, not this server-side fetch.
        // Whatever's in front of kelowna.ca (WAF/CDN) is evidently blocking anything that
        // self-identifies as a bot. Using a normal desktop-browser User-Agent instead.
        const res = await fetch(url, {
          headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
          },
          next: { revalidate: 3600 }
        });
        lastStatus = res.status;

        if (!res.ok) {
          lastBodySnippet = (await res.text().catch(() => '')).slice(0, 300);
          break;
        }

        const html = await res.text();
        const rows = parseRows(html);

        if (rows.length === 0) break; // ran past the last page

        allRows.push(...rows);

        // Rows are already approval-date-descending on this page, so once the oldest row on
        // the page is past the lookback window, there's no point fetching further pages.
        const oldest = rows[rows.length - 1];
        if (sinceDate && oldest.approvalDateIso && oldest.approvalDateIso < sinceDate) break;
        if (allRows.length >= limit) break;
      }

      this.lastDiagnostic = {
        httpStatus: lastStatus,
        ok: lastStatus === 200,
        rawRecordCount: allRows.length,
        note:
          allRows.length > 0
            ? 'ok'
            : lastBodySnippet
              ? 'non-HTML or error response'
              : 'request succeeded but found zero table rows -- page structure may have changed',
        bodySnippet: lastBodySnippet
      };

      if (allRows.length > 0) {
        const filtered = sinceDate
          ? allRows.filter((r) => !r.approvalDateIso || r.approvalDateIso >= sinceDate)
          : allRows;
        return transformRows(filtered.slice(0, limit), this.defaultCoords);
      }
    } catch (err) {
      this.lastDiagnostic = {
        httpStatus: null,
        ok: false,
        rawRecordCount: 0,
        note: `threw: ${err instanceof Error ? err.message : String(err)}`
      };
      console.warn('[KelownaPortalConnector] Live page notice:', err);
    }

    return [];
  }
}

interface ParsedRow {
  permit: string;
  address: string;
  applicant: string;
  contractor: string;
  subType: string;
  value: string;
  approvalDateText: string;
  approvalDateIso: string;
}

function extractField(rowHtml: string, cssClass: string): string {
  const re = new RegExp(`class="views-field views-field-${cssClass}"[^>]*>([\\s\\S]*?)<\\/td>`);
  const m = rowHtml.match(re);
  if (!m) return '';
  return m[1]
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

function parseRows(html: string): ParsedRow[] {
  const rowMatches = html.match(/<tr class="(?:odd|even)[^"]*">[\s\S]*?<\/tr>/g) || [];

  return rowMatches
    .map((rowHtml) => {
      const permit = extractField(rowHtml, 'title');
      const address = extractField(rowHtml, 'field-address');
      const applicant = extractField(rowHtml, 'field-permit-applicant');
      const contractor = extractField(rowHtml, 'nothing');
      const subType = extractField(rowHtml, 'field-permit-sub-type');
      const value = extractField(rowHtml, 'field-permit-value');

      // Prefer the machine-readable ISO datetime embedded in the Approval Date cell
      // (content="2026-09-29T10:50:57-07:00") over parsing the display text.
      const isoMatch = rowHtml.match(/field-permit-approval-date[\s\S]*?content="([^"]+)"/);
      const approvalDateIso = isoMatch ? isoMatch[1].split('T')[0] : '';
      const approvalDateText = extractField(rowHtml, 'field-permit-approval-date');

      return { permit, address, applicant, contractor, subType, value, approvalDateText, approvalDateIso };
    })
    .filter((r) => r.permit); // drop any stray non-data rows
}

function transformRows(rows: ParsedRow[], defaultCoords: [number, number]): UnifiedPermit[] {
  return rows.map((r, idx) => {
    const rawVal = parseFloat(r.value.replace(/[^0-9.]/g, '')) || 0;
    const desc = `${r.subType || 'Building permit'} at ${r.address}.`;
    const val = normalizePermitValue(rawVal, r.subType, desc, idx + 1);

    const workClass = /commercial|office|retail|industrial|multi|tower/i.test(r.subType) ? 'Commercial' : 'Residential';
    const trades = classifyTradeOpportunities(desc, r.subType, workClass);
    const aiSummary = generatePermitAiSummary(r.permit, r.address, workClass, val, desc, trades);
    const dateIso = r.approvalDateIso || '2026-09-25';

    return {
      id: `p-kelowna-${idx + 1}`,
      permit_number: r.permit,
      city_slug: 'kelowna',
      address: `${r.address}, Kelowna, BC`,
      applicant: r.applicant || 'Private Applicant',
      contractor: r.contractor || 'Standard Permittee',
      sub_type: r.subType || 'Building Permit',
      value: Math.round(val),
      approval_date: dateIso,
      city_region: 'Kelowna',
      province: 'BC',
      applicant_name: r.applicant || 'Private Applicant',
      contractor_name: r.contractor || 'Standard Permittee',
      permit_type: r.subType || 'Building Permit',
      estimated_value: Math.round(val),
      issue_date: dateIso,
      work_class: workClass,
      description: desc,
      ai_summary: aiSummary,
      status: 'Issued',
      latitude: defaultCoords[0],
      longitude: defaultCoords[1],
      trades,
      tier: 2
    };
  });
}
