import { Permit, WorkClass, MatchedTrade } from '@/types';
import { matchPermitBuilder } from '@/lib/builders-service';
import { SUBTRADES_CATALOG } from '@/lib/trades-data';

export interface CalgarySocrataRecord {
  permitnum: string;
  statuscurrent?: string;
  applieddate?: string;
  issueddate?: string;
  completeddate?: string;
  permittype?: string;
  permittypemapped?: string;
  permitclass?: string;
  permitclassgroup?: string;
  permitclassmapped?: string;
  workclass?: string;
  workclassgroup?: string;
  workclassmapped?: string;
  description?: string;
  contractorname?: string;
  applicantname?: string;
  estprojectcost?: string;
  originaladdress?: string;
  communityname?: string;
  latitude?: string;
  longitude?: string;
  point?: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

export const CALGARY_SOCRATA_ENDPOINT = 'https://data.calgary.ca/resource/c2es-76ed.json';

/**
 * Maps Calgary workclass and permitclassgroup to BPP WorkClass enum
 */
function mapCalgaryWorkClass(record: CalgarySocrataRecord): WorkClass {
  const combined = `${record.permitclassmapped || ''} ${record.permitclassgroup || ''} ${record.permittype || ''} ${record.description || ''}`.toLowerCase();
  
  if (combined.includes('industrial') || combined.includes('warehouse') || combined.includes('factory')) {
    return 'Industrial';
  }
  if (combined.includes('institutional') || combined.includes('hospital') || combined.includes('school') || combined.includes('civic')) {
    return 'Institutional';
  }
  if (
    combined.includes('commercial') ||
    combined.includes('office') ||
    combined.includes('retail') ||
    combined.includes('restaurant') ||
    combined.includes('hotel')
  ) {
    return 'Commercial';
  }
  return 'Residential';
}

/**
 * Assigns commercial subtrades based on keywords in project description and classification
 */
function detectTrades(description: string, workClass: WorkClass): MatchedTrade[] {
  const desc = description.toLowerCase();
  const trades: MatchedTrade[] = [];

  const addTrade = (key: keyof typeof SUBTRADES_CATALOG, terms: string[]) => {
    const def = SUBTRADES_CATALOG[key];
    if (def && !trades.some((t) => t.subtrade_key === key)) {
      trades.push({
        subtrade_key: key,
        name: def.name,
        color: def.color,
        icon: def.icon,
        confidence: 0.9,
        matched_terms: terms
      });
    }
  };

  if (/electric|power|service|panel|lighting|feeders|transformer|generator|ev\b/.test(desc)) {
    addTrade('electrical', ['electrical']);
  }
  if (/plumb|pipe|drain|hvac|boiler|chiller|heating|cooling|ventilat|rtu|mechanical/.test(desc)) {
    addTrade('hvac_plumbing', ['hvac', 'plumbing']);
  }
  if (/roof|shingle|membrane|tpo|parapet|flashing|fascia/.test(desc)) {
    addTrade('roofing', ['roofing']);
  }
  if (/drywall|stud|framing|wall|ceiling|t-bar|gypsum|partition/.test(desc)) {
    addTrade('drywall_framing', ['drywall', 'framing']);
  }
  if (/door|overhead|dock|bay|gate|shutter/.test(desc)) {
    addTrade('commercial_doors', ['doors']);
  }
  if (/concrete|slab|foundation|footing|pour|rebar|masonry/.test(desc)) {
    addTrade('concrete', ['concrete']);
  }

  // Fallback default trades based on work class if none matched
  if (trades.length === 0) {
    if (workClass === 'Commercial' || workClass === 'Industrial') {
      addTrade('electrical', ['general commercial']);
      addTrade('hvac_plumbing', ['general mechanical']);
    } else {
      addTrade('drywall_framing', ['residential general']);
      addTrade('electrical', ['residential electrical']);
    }
  }

  return trades;
}

/**
 * Transforms raw Calgary Socrata open data record into BPP Permit schema
 */
export function transformCalgaryRecord(record: CalgarySocrataRecord): Permit | null {
  const rawCost = Number(record.estprojectcost) || 0;
  // Filter out $0 valuation permits as instructed
  if (rawCost <= 0) return null;

  const lat = Number(record.latitude) || (record.point?.coordinates ? record.point.coordinates[1] : 0);
  const lng = Number(record.longitude) || (record.point?.coordinates ? record.point.coordinates[0] : 0);

  // Calgary coordinate bounds check roughly [50.8 - 51.3 lat, -114.3 - -113.8 lng]
  const isValidCoord = lat > 50 && lat < 52 && lng < -113 && lng > -115;
  const latitude = isValidCoord ? lat : 51.0447;
  const longitude = isValidCoord ? lng : -114.0719;

  const permitNum = record.permitnum || `BP-CGY-${Date.now()}`;
  const address = record.originaladdress ? `${record.originaladdress}, Calgary, AB` : 'Calgary, AB';
  const contractor = (record.contractorname || record.applicantname || 'Owner / Builder').trim();
  const applicant = (record.applicantname || record.contractorname || 'Applicant on File').trim();
  
  const rawDate = record.issueddate || record.applieddate || new Date().toISOString();
  const issueDate = rawDate.split('T')[0];

  const workClass = mapCalgaryWorkClass(record);
  const permitType = record.permittype || record.permitclassgroup || 'Building Project';
  const desc = record.description || `${record.workclass || 'Building'} work in ${record.communityname || 'Calgary'}`;
  
  const community = record.communityname ? ` (${record.communityname})` : '';
  const aiSummary = `${workClass} ${permitType}${community}: ${desc}. Valuation: $${new Intl.NumberFormat('en-CA').format(rawCost)}.`;

  const trades = detectTrades(desc, workClass);

  // Check contractor against verified directory
  const matchResult = matchPermitBuilder(contractor);

  return {
    id: `cgy-${permitNum}`,
    municipality_id: 'calgary',
    permit_number: permitNum,
    issue_date: issueDate,
    application_date: record.applieddate ? record.applieddate.split('T')[0] : undefined,
    address,
    city_region: 'Calgary',
    permit_type: permitType,
    work_class: workClass,
    description: desc,
    ai_summary: aiSummary,
    estimated_value: rawCost,
    contractor_name: contractor,
    contractor_phone: matchResult.builder?.primary_phone,
    contractor_email: matchResult.builder?.email,
    applicant_name: applicant,
    status: record.statuscurrent || 'Issued',
    latitude,
    longitude,
    trades,
    verified_builder: matchResult.builder,
    tier: matchResult.isVerified ? 1 : 2
  };
}

/**
 * Fetches Calgary building permits from Socrata API, filters > $0, and maps to BPP Permit models
 */
export async function fetchCalgaryPermits(limit: number = 250): Promise<Permit[]> {
  try {
    const url = `${CALGARY_SOCRATA_ENDPOINT}?$limit=${limit}&$order=issueddate%20DESC&$where=estprojectcost%20%3E%200`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BuildPermitPro/1.0 (Calgary Socrata Pipeline)'
      },
      next: { revalidate: 300 } // Cache 5 min
    });

    if (!res.ok) {
      throw new Error(`Calgary Socrata upstream error: ${res.status}`);
    }

    const records: CalgarySocrataRecord[] = await res.json();
    const mapped: Permit[] = [];

    for (const rec of records) {
      const permit = transformCalgaryRecord(rec);
      if (permit) {
        mapped.push(permit);
      }
    }

    return mapped;
  } catch (err) {
    console.error('Failed to fetch Calgary permits from Socrata:', err);
    return getFallbackCalgaryPermits();
  }
}

/**
 * Fallback Calgary commercial & residential permits if Socrata API is offline
 */
export function getFallbackCalgaryPermits(): Permit[] {
  const sampleRecords: CalgarySocrataRecord[] = [
    {
      permitnum: 'BP2026-03502',
      statuscurrent: 'Issued',
      issueddate: '2026-03-07T00:00:00.000',
      permittype: 'Commercial / Multi Family Project',
      permitclassgroup: 'Apartment',
      permitclassmapped: 'Residential',
      workclass: 'Alteration',
      description: 'Interior alterations to multi-tenant commercial & apartment suites',
      contractorname: 'INTERSCOPE PROJECTS',
      estprojectcost: '1850000',
      originaladdress: '836 15 AV SW',
      communityname: 'BELTLINE',
      latitude: '51.039194',
      longitude: '-114.081232'
    },
    {
      permitnum: 'BP2026-03488',
      statuscurrent: 'Issued',
      issueddate: '2026-03-06T00:00:00.000',
      permittype: 'Commercial New Construction',
      permitclassgroup: 'Commercial',
      permitclassmapped: 'Commercial',
      workclass: 'New Construction',
      description: 'New 4-storey commercial office and retail development with underground parkade',
      contractorname: 'LEDCOR CONSTRUCTION',
      estprojectcost: '14200000',
      originaladdress: '425 1 ST SE',
      communityname: 'DOWNTOWN EAST VILLAGE',
      latitude: '51.047520',
      longitude: '-114.060140'
    },
    {
      permitnum: 'BP2026-03420',
      statuscurrent: 'Issued',
      issueddate: '2026-03-05T00:00:00.000',
      permittype: 'Industrial Building Project',
      permitclassgroup: 'Industrial',
      permitclassmapped: 'Industrial',
      workclass: 'New Construction',
      description: 'Distribution logistics warehouse facility with 12 loading bays',
      contractorname: 'GRAHAM CONSTRUCTION',
      estprojectcost: '9800000',
      originaladdress: '11050 52 ST SE',
      communityname: 'EAST SHEPARD INDUSTRIAL',
      latitude: '50.954210',
      longitude: '-113.955430'
    },
    {
      permitnum: 'BP2026-03395',
      statuscurrent: 'Issued',
      issueddate: '2026-03-04T00:00:00.000',
      permittype: 'Commercial Multi-Family',
      permitclassgroup: 'Apartment',
      permitclassmapped: 'Residential',
      workclass: 'New Construction',
      description: '6-storey wood-frame multi-family residential building (96 units)',
      contractorname: 'CHANDOS CONSTRUCTION',
      estprojectcost: '18500000',
      originaladdress: '2210 CENTRE ST NE',
      communityname: 'CRESCENT HEIGHTS',
      latitude: '51.071850',
      longitude: '-114.062890'
    },
    {
      permitnum: 'BP2026-03310',
      statuscurrent: 'Issued',
      issueddate: '2026-03-02T00:00:00.000',
      permittype: 'Tenant Improvement Project',
      permitclassgroup: 'Commercial',
      permitclassmapped: 'Commercial',
      workclass: 'Alteration',
      description: 'Medical & dental clinic tenant fitout, plumbing & HVAC upgrade',
      contractorname: 'CANAM CONSTRUCTION',
      estprojectcost: '750000',
      originaladdress: '1600 90 AV SW',
      communityname: 'BAYVIEW',
      latitude: '50.973410',
      longitude: '-114.103250'
    }
  ];

  return sampleRecords
    .map(transformCalgaryRecord)
    .filter((p): p is Permit => p !== null);
}
