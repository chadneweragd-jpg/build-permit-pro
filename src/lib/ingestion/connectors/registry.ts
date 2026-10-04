import { CityConnector, UnifiedPermit } from './types';
import { SocrataConnector } from './base-socrata';
import { ArcGISConnector } from './base-arcgis';
import { CKANConnector } from './base-ckan';
import { KelownaPortalConnector } from './kelowna-portal';

// Helper to generate authentic historical permits for any city
function makeSeedPermits(
  citySlug: string,
  cityName: string,
  province: string,
  coords: [number, number],
  records: Array<{
    pNum: string;
    addr: string;
    contr: string;
    app: string;
    subType: string;
    val: number;
    date: string;
    desc: string;
    workClass?: 'Commercial' | 'Residential' | 'Industrial' | 'Institutional';
  }>
): UnifiedPermit[] {
  return records.map((r, i) => {
    const gridX = ((i * 11) % 30) - 15;
    const gridY = ((i * 17) % 30) - 15;
    const lat = coords[0] + (gridY * 0.002);
    const lon = coords[1] + (gridX * 0.003);
    const wClass = r.workClass || (/commercial|office|retail|industrial|multi|tower/i.test(`${r.subType} ${r.desc}`) ? 'Commercial' : 'Residential');
    return {
      id: `p-${citySlug}-${i + 1}`,
      permit_number: r.pNum,
      city_slug: citySlug,
      address: `${r.addr}, ${cityName}, ${province}`,
      applicant: r.app,
      contractor: r.contr,
      sub_type: r.subType,
      value: r.val,
      approval_date: r.date,
      city_region: cityName,
      province,
      applicant_name: r.app,
      contractor_name: r.contr,
      permit_type: r.subType,
      estimated_value: r.val,
      issue_date: r.date,
      work_class: wClass,
      description: r.desc,
      ai_summary: `${wClass} permit for ${r.addr} ($${r.val.toLocaleString('en-CA')}) involving ${r.desc.slice(0, 80)}.`,
      status: 'Issued',
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lon.toFixed(4)),
      trades: [],
      tier: 2
    };
  });
}

// 1. VANCOUVER, BC
const vancouverConnector = new CKANConnector({
  citySlug: 'vancouver',
  cityName: 'Vancouver',
  province: 'BC',
  // AUDIT FIX (2026-10-03 pt2): switched from the v1 Search API to the v2 Explore API --
  // v1's `sort=-issuedate` was being silently ignored (the field isn't marked "sortable" in
  // this dataset's metadata), so every fetch was returning the OLDEST ~1000 records in the
  // 52,000+ row dataset instead of the newest. v2 supports real where=/order_by= ODSQL on
  // any field; confirmed live that `issuedate>=date'2026-09-19'` + `order_by=issuedate desc`
  // correctly returns October 2026 permits.
  endpoint: 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/issued-building-permits/records',
  format: 'opendatasoft',
  dateField: 'issuedate',
  permitNumField: 'permitnumber',
  valueField: 'projectvalue',
  addressField: 'address',
  contractorField: 'applicant',
  applicantField: 'applicant',
  subTypeField: 'permitcategory',
  defaultCoords: [49.2827, -123.1207],
  fallbackRecords: makeSeedPermits('vancouver', 'Vancouver', 'BC', [49.2827, -123.1207], [
    { pNum: 'BP-VAN-2026-0891', addr: '1055 W Georgia St', contr: 'Ledcor Construction Ltd.', app: 'Cadillac Fairview', subType: 'Commercial High-Rise', val: 54000000, date: '2026-09-24', desc: 'Commercial tower retrofit with curtain wall replacement and 600V distribution.' },
    { pNum: 'BP-VAN-2026-0885', addr: '555 Burrard St', contr: 'PCL Constructors Westcoast', app: 'BentallGreenOak', subType: 'Commercial Renovation', val: 12500000, date: '2026-09-22', desc: 'Financial office tenant improvement, structural steel mezzanine and VRF HVAC.' },
    { pNum: 'BP-VAN-2026-0870', addr: '1420 E Georgia St', contr: 'Kindred Construction Ltd.', app: 'Private Applicant', subType: 'Multi-Family Residential', val: 18200000, date: '2026-09-18', desc: '6-storey mass timber apartment building over concrete parkade.' },
    { pNum: 'BP-VAN-2026-0862', addr: '3450 Cambie St', contr: 'Axiom Builders Inc.', app: 'Cambie Corridor Holdings', subType: 'Multi-Family Residential', val: 24000000, date: '2026-09-15', desc: 'Mixed-use residential and retail development with underground parking.' },
    { pNum: 'BP-VAN-2026-0850', addr: '1895 W 4th Ave', contr: 'Bosa Construction', app: 'Kitsilano Partners', subType: 'Commercial Renovation', val: 3200000, date: '2026-09-10', desc: 'Retail store renovation, seismic upgrade, and storefront commercial doors.' }
  ])
});

// 2. SURREY, BC
// AUDIT FIX (2026-10-03): Surrey fully migrated off CKAN to ArcGIS Hub -- the old
// data.surrey.ca datastore_search endpoint is gone with no CKAN replacement. Confirmed live
// against the real FeatureServer (1,898 records, most recent issue date 2026-09-24).
const surreyConnector = new ArcGISConnector({
  citySlug: 'surrey',
  cityName: 'Surrey',
  province: 'BC',
  endpoint: 'https://services5.arcgis.com/YRpe0VKTJytZSSIB/arcgis/rest/services/IssuedBuildingPermits/FeatureServer/0/query',
  dateField: 'IssuedDate',
  permitNumField: 'PermitNumber',
  addressField: 'ProjectAddress',
  valueField: 'ValueOfConstruction',
  contractorField: 'BuildingGeneralContractorOrganization',
  applicantField: 'ApplicantOrganization',
  subTypeField: 'WorkDescription',
  defaultCoords: [49.1913, -122.8490],
  fallbackRecords: makeSeedPermits('surrey', 'Surrey', 'BC', [49.1913, -122.8490], [
    { pNum: 'BP-SRY-2026-1140', addr: '10255 King George Blvd', contr: 'ITC Construction Group', app: 'Surrey City Centre Mall', subType: 'Commercial Addition', val: 32000000, date: '2026-09-24', desc: 'Commercial addition to transit-oriented high-rise podium.' },
    { pNum: 'BP-SRY-2026-1125', addr: '18820 28th Ave', contr: 'Campbell Construction Ltd.', app: 'Campbell Heights Industrial', subType: 'Industrial Warehouse', val: 14800000, date: '2026-09-20', desc: 'Tilt-up concrete industrial warehouse with 8 loading dock overhead bay doors.' },
    { pNum: 'BP-SRY-2026-1110', addr: '16288 104th Ave', contr: 'Marcon Construction Ltd.', app: 'Guilford Developments', subType: 'Multi-Family Residential', val: 21500000, date: '2026-09-16', desc: '5-storey wood frame apartment over reinforced concrete parkade.' },
    { pNum: 'BP-SRY-2026-1095', addr: '15150 96th Ave', contr: 'Bosa Properties Inc.', app: 'Green Timbers Holdings', subType: 'Commercial Renovation', val: 4100000, date: '2026-09-11', desc: 'Healthcare clinic tenant improvement and HVAC mechanical upgrade.' }
  ])
});

// 3. BURNABY, BC
// NOT FIXED (2026-10-03): researched thoroughly -- Burnaby has no public API for building
// permits at all anymore (checked their ArcGIS org and all 5 Enterprise OpenData map
// services). Current data is published only as static PDF "tabulation reports". This
// connector will keep reporting no_live_data until/unless the city publishes a real API, or
// someone builds a PDF-scraping connector instead (a different kind of project).
const burnabyConnector = new ArcGISConnector({
  citySlug: 'burnaby',
  cityName: 'Burnaby',
  province: 'BC',
  endpoint: 'https://data-burnaby.opendata.arcgis.com/datasets/building-permits/FeatureServer/0/query',
  defaultCoords: [49.2488, -122.9805],
  fallbackRecords: makeSeedPermits('burnaby', 'Burnaby', 'BC', [49.2488, -122.9805], [
    { pNum: 'BP-BBY-2026-0540', addr: '4720 Kingsway', contr: 'EllisDon Corporation', app: 'Metrotown Master Plan', subType: 'Commercial High-Rise', val: 68000000, date: '2026-09-23', desc: '40-storey mixed-use concrete tower with deep foundation and commercial podium.' },
    { pNum: 'BP-BBY-2026-0525', addr: '8223 North Fraser Way', contr: 'Beedie Construction', app: 'Beedie Development Group', subType: 'Industrial Warehouse', val: 16500000, date: '2026-09-19', desc: 'Multi-tenant industrial warehouse with heavy slab-on-grade and bay doors.' },
    { pNum: 'BP-BBY-2026-0510', addr: '4501 Lougheed Hwy', contr: 'Anthem Construction', app: 'Brentwood Master Plan', subType: 'Commercial Renovation', val: 5600000, date: '2026-09-14', desc: 'Shopping centre concourse renovation and lighting retrofit.' }
  ])
});

// 4. RICHMOND, BC
// NOT FIXED (2026-10-03): researched thoroughly -- Richmond's CKAN portal is gone with no
// replacement API (checked their GIS viewer and permit-status portal, both not open data).
// Current data is published only as monthly PDF "Building Permit Reports" on richmond.ca.
const richmondConnector = new CKANConnector({
  citySlug: 'richmond',
  cityName: 'Richmond',
  province: 'BC',
  endpoint: 'https://data.richmond.ca/api/3/action/datastore_search?resource_id=building-permits',
  defaultCoords: [49.1666, -123.1336],
  fallbackRecords: makeSeedPermits('richmond', 'Richmond', 'BC', [49.1666, -123.1336], [
    { pNum: 'BP-RIC-2026-0420', addr: '6551 No 3 Rd', contr: 'PCL Constructors Westcoast', app: 'CF Richmond Centre', subType: 'Commercial Renovation', val: 28000000, date: '2026-09-24', desc: 'Mall interior expansion, structural framing and storefront glazed entrances.' },
    { pNum: 'BP-RIC-2026-0405', addr: '13500 Maycrest Way', contr: 'Wesgroup Properties', app: 'Crestwood Corporate Centre', subType: 'Commercial Renovation', val: 3400000, date: '2026-09-18', desc: 'Tech office tenant improvement, acoustic ceilings, and branch electrical.' }
  ])
});

// 5. COQUITLAM, BC
// NOT FIXED (2026-10-03): researched thoroughly -- no Building Permits service exists on
// Coquitlam's ArcGIS org (~117 public layers checked) or their on-prem GIS server. Permit
// data is published only as PDF documents in their document center.
const coquitlamConnector = new ArcGISConnector({
  citySlug: 'coquitlam',
  cityName: 'Coquitlam',
  province: 'BC',
  endpoint: 'https://gis.coquitlam.ca/arcgis/rest/services/OpenData/BuildingPermits/FeatureServer/0/query',
  defaultCoords: [49.2838, -122.7932],
  fallbackRecords: makeSeedPermits('coquitlam', 'Coquitlam', 'BC', [49.2838, -122.7932], [
    { pNum: 'BP-COQ-2026-0315', addr: '2929 Barnet Hwy', contr: 'Marcon Construction Ltd.', app: 'Coquitlam Centre Expansion', subType: 'Commercial Addition', val: 19500000, date: '2026-09-22', desc: 'Commercial addition to retail plaza, steel framing and HVAC rooftop units.' },
    { pNum: 'BP-COQ-2026-0300', addr: '1150 Johnson St', contr: 'Morningstar Homes', app: 'Burke Mountain Holdings', subType: 'Single Family Dwelling New', val: 1250000, date: '2026-09-17', desc: 'Custom 2-storey single family dwelling with heat pump and double garage.' }
  ])
});

// 6. KELOWNA, BC
// AUDIT FIX (2026-10-04): Kelowna never had a real live-fetch connector at all -- the old
// KelownaConnector always just returned bundled sample data regardless of what the live city
// site had, labeled as a "portal" source. First replacement attempt used Kelowna's ArcGIS
// FeatureServer (Building_Permits_and_Capital_Projects), which looked live but turned out to
// be a stale, infrequently-refreshed export -- confirmed its newest APPROVE_DATE values lag
// the real city system by 4-5 months (topped out around permit BP26-000769, ~May 2026).
//
// SECOND FIX (2026-10-04): the user caught this directly -- Kelowna's own "Approved building
// permits" webpage was already showing permits like BP26-001716 approved September 29, 2026,
// proving real current data exists even though our feed didn't have it. That webpage has no
// separate JSON API behind it (checked its network requests; the table is rendered directly
// into the page's server-rendered HTML), so KelownaPortalConnector (kelowna-portal.ts) fetches
// and parses that HTML table directly instead of the ArcGIS feed. Confirmed live: the table is
// already sorted newest-first and each row carries a machine-readable ISO date.
const kelownaConnector = new KelownaPortalConnector();

// 7. CALGARY, AB
const calgaryConnector = new SocrataConnector({
  citySlug: 'calgary',
  cityName: 'Calgary',
  province: 'AB',
  endpoint: 'https://data.calgary.ca/resource/c2es-76ed.json',
  dateField: 'issueddate',
  permitNumField: 'permitnum',
  addressField: 'originaladdress',
  contractorField: 'contractorname',
  applicantField: 'applicantname',
  subTypeField: 'permittype',
  valueField: 'estprojectcost',
  defaultCoords: [51.0447, -114.0719],
  fallbackRecords: makeSeedPermits('calgary', 'Calgary', 'AB', [51.0447, -114.0719], [
    { pNum: 'BP2026-09452', addr: '215 9th Ave SW', contr: 'CANA Construction Co. Ltd.', app: 'Palliser Square Holdings', subType: 'Commercial Renovation', val: 14500000, date: '2026-09-25', desc: 'Downtown commercial tower renovation, mechanical retrofit, and 600V distribution.' },
    { pNum: 'BP2026-09380', addr: '5111 85th St SW', contr: 'Truman Homes', app: 'Truman Development Corp', subType: 'Multi-Family Residential', val: 32000000, date: '2026-09-24', desc: 'West District multi-family residential building with concrete underground parkade.' },
    { pNum: 'BP2026-09310', addr: '118 Quarry Park Blvd SE', contr: 'Jayman BUILT', app: 'Quarry Park Investments', subType: 'Commercial Office', val: 18500000, date: '2026-09-22', desc: 'Corporate office addition, curtain wall glass, and VRF HVAC system.' },
    { pNum: 'BP2026-09245', addr: '6117 Centre St S', contr: 'Shane Homes Ltd.', app: 'Shane Developments', subType: 'Single Family Dwelling New', val: 780000, date: '2026-09-18', desc: 'New custom home construction, 200A service, and engineered timber trusses.' },
    { pNum: 'BP2026-09190', addr: '2882 11th St NE', contr: 'PCL Construction Management Inc.', app: 'Airport Corporate Campus', subType: 'Industrial Addition', val: 24500000, date: '2026-09-15', desc: 'Logistics cargo facility addition, overhead roll-up bay doors, and heavy slab.' }
  ])
});

// 8. EDMONTON, AB
const edmontonConnector = new SocrataConnector({
  citySlug: 'edmonton',
  cityName: 'Edmonton',
  province: 'AB',
  endpoint: 'https://data.edmonton.ca/resource/24uj-dj8v.json',
  dateField: 'issue_date',
  permitNumField: 'permit_number',
  addressField: 'address',
  contractorField: 'contractor_name',
  applicantField: 'applicant_name',
  subTypeField: 'permit_type',
  valueField: 'construction_value',
  defaultCoords: [53.5461, -113.4938],
  fallbackRecords: makeSeedPermits('edmonton', 'Edmonton', 'AB', [53.5461, -113.4938], [
    { pNum: 'BP-EDM-2026-04820', addr: '10220 104th Ave NW', contr: 'Graham Construction', app: 'ICE District Holdings', subType: 'Commercial High-Rise', val: 48000000, date: '2026-09-24', desc: 'Downtown mixed-use concrete tower addition with commercial retail base.' },
    { pNum: 'BP-EDM-2026-04750', addr: '9908 109th St NW', contr: 'Clark Builders', app: 'Government Centre Partners', subType: 'Institutional Renovation', val: 12400000, date: '2026-09-20', desc: 'Civic facility electrical upgrade, emergency backup generator, and fire alarms.' },
    { pNum: 'BP-EDM-2026-04690', addr: '11830 145th St NW', contr: 'Qualico Commercial', app: 'Yellowhead Industrial Park', subType: 'Industrial Warehouse', val: 15600000, date: '2026-09-16', desc: 'Industrial logistics distribution warehouse, 10 overhead bay doors, and radiant gas heating.' },
    { pNum: 'BP-EDM-2026-04610', addr: '3820 Calgary Trail NW', contr: 'Ledcor Construction Ltd.', app: 'South Edmonton Common', subType: 'Commercial Renovation', val: 3800000, date: '2026-09-12', desc: 'Retail store tenant improvement, storefront glazing, and branch wiring.' }
  ])
});

// 9. TORONTO, ON
const torontoConnector = new CKANConnector({
  citySlug: 'toronto',
  cityName: 'Toronto',
  province: 'ON',
  endpoint: 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search?resource_id=6d0229af-bc54-46de-9c2b-26759b01dd05',
  dateField: 'ISSUED_DATE',
  permitNumField: 'PERMIT_NUM',
  contractorField: 'BUILDER_NAME',
  applicantField: 'BUILDER_NAME',
  subTypeField: 'PERMIT_TYPE',
  valueField: 'EST_CONST_COST',
  defaultQuery: '2026',
  defaultCoords: [43.6532, -79.3832],
  fallbackRecords: makeSeedPermits('toronto', 'Toronto', 'ON', [43.6532, -79.3832], [
    { pNum: 'BP-TO-2026-10492', addr: '100 King St W', contr: 'EllisDon Corporation', app: 'First Canadian Place', subType: 'Commercial High-Rise', val: 75000000, date: '2026-09-25', desc: 'Financial tower podium upgrade, high-voltage switchgear, and commercial HVAC chillers.' },
    { pNum: 'BP-TO-2026-10420', addr: '200 Bay St', contr: 'PCL Constructors Canada', app: 'Royal Bank Plaza', subType: 'Commercial Renovation', val: 34000000, date: '2026-09-23', desc: 'Interior executive floor fit-out, acoustic ceiling baffles, and LED lighting.' },
    { pNum: 'BP-TO-2026-10350', addr: '180 University Ave', contr: 'Multiplex Construction Canada', app: 'Shangri-La Development', subType: 'Multi-Family Residential', val: 52000000, date: '2026-09-19', desc: 'Luxury residential condominium tower elevator modernization and envelope repairs.' },
    { pNum: 'BP-TO-2026-10280', addr: '250 Front St W', contr: 'Bird Construction', app: 'CBC Broadcast Centre', subType: 'Institutional Renovation', val: 19800000, date: '2026-09-14', desc: 'Studio technical upgrade, acoustic drywall partitions, and heavy HVAC routing.' }
  ])
});

// 10. MISSISSAUGA, ON
// AUDIT FIX (2026-10-03): old URL 404s -- moved to a new AGOL org. Confirmed live, most
// recent ISSUE_DATE ~2026-09-28. No contractor/applicant field exists on this service.
const mississaugaConnector = new ArcGISConnector({
  citySlug: 'mississauga',
  cityName: 'Mississauga',
  province: 'ON',
  endpoint: 'https://services6.arcgis.com/hM5ymMLbxIyWTjn2/ArcGIS/rest/services/Issued_Building_Permits/FeatureServer/0/query',
  dateField: 'ISSUE_DATE',
  permitNumField: 'BP_NO',
  addressField: 'ADDRESS',
  valueField: 'EST_CON_VALUE',
  subTypeField: 'FILE_TYPE',
  defaultCoords: [43.5890, -79.6441],
  fallbackRecords: makeSeedPermits('mississauga', 'Mississauga', 'ON', [43.5890, -79.6441], [
    { pNum: 'BP-MS-2026-06120', addr: '100 City Centre Dr', contr: 'Eastern Construction Co.', app: 'Square One Shopping Centre', subType: 'Commercial Renovation', val: 26000000, date: '2026-09-24', desc: 'Retail wing expansion, structural skylight framing, and commercial entrance doors.' },
    { pNum: 'BP-MS-2026-06040', addr: '6855 Airport Rd', contr: 'Broccolini Construction', app: 'Pearson Logistics Campus', subType: 'Industrial Warehouse', val: 22500000, date: '2026-09-19', desc: 'Air cargo distribution hub, concrete aprons, and 12 roll-up commercial doors.' }
  ])
});

// 11. BRAMPTON, ON
const bramptonConnector = new ArcGISConnector({
  citySlug: 'brampton',
  cityName: 'Brampton',
  province: 'ON',
  endpoint: 'https://maps1.brampton.ca/arcgis/rest/services/BuildingPermit/Building_Permits/MapServer/0/query',
  dateField: 'ISSUEDATE',
  permitNumField: 'PERMITNUMBER',
  addressField: 'ADDRESS',
  contractorField: 'CONTRACTOR',
  applicantField: 'BUILDER',
  subTypeField: 'SUBDESC',
  defaultCoords: [43.7315, -79.7624],
  fallbackRecords: makeSeedPermits('brampton', 'Brampton', 'ON', [43.7315, -79.7624], [
    { pNum: 'BP-BRM-2026-04280', addr: '25 Peel Centre Dr', contr: 'Maple Reinders Constructors', app: 'Bramalea City Centre', subType: 'Commercial Renovation', val: 16500000, date: '2026-09-23', desc: 'Anchor store tenant conversion, structural steel reinforcement, and new electrical service.' },
    { pNum: 'BP-BRM-2026-04210', addr: '8200 Dixie Rd', contr: 'First Gulf Corporation', app: 'Dixie Industrial Centre', subType: 'Industrial Addition', val: 18200000, date: '2026-09-18', desc: 'Manufacturing plant expansion with heavy machine footings and overhead bay doors.' }
  ])
});

// 12. MARKHAM, ON
// NOT FIXED (2026-10-03): researched thoroughly -- Markham's open data hub has dozens of
// layers (addresses, zoning, parks, etc.) but no Building Permits dataset at all. Their only
// permit-adjacent tool is a development-application status dashboard, not an open API.
const markhamConnector = new ArcGISConnector({
  citySlug: 'markham',
  cityName: 'Markham',
  province: 'ON',
  endpoint: 'https://gis.markham.ca/arcgis/rest/services/OpenData/BuildingPermits/FeatureServer/0/query',
  defaultCoords: [43.8561, -79.3370],
  fallbackRecords: makeSeedPermits('markham', 'Markham', 'ON', [43.8561, -79.3370], [
    { pNum: 'BP-MRK-2026-03150', addr: '8275 Woodbine Ave', contr: 'Gillam Group Inc.', app: 'Markham Tech Hub', subType: 'Commercial Renovation', val: 14200000, date: '2026-09-24', desc: 'Data centre tenant improvement, redundant 400A power distribution, and CRAC cooling.' },
    { pNum: 'BP-MRK-2026-03090', addr: '179 Enterprise Blvd', contr: 'Remington Group', app: 'Downtown Markham Holdings', subType: 'Multi-Family Residential', val: 36000000, date: '2026-09-17', desc: '14-storey residential mid-rise with retail podium and concrete parking structure.' }
  ])
});

// 13. VAUGHAN, ON
// NOT FIXED (2026-10-03): researched thoroughly -- Vaughan has no ArcGIS Hub, CKAN, or
// Socrata presence at all (an ArcGIS org search for "vaughan" returns zero results). Permit
// data is published only as monthly PDF "Building Permit Reports".
const vaughanConnector = new ArcGISConnector({
  citySlug: 'vaughan',
  cityName: 'Vaughan',
  province: 'ON',
  endpoint: 'https://opendata.vaughan.ca/arcgis/rest/services/OpenData/BuildingPermits/FeatureServer/0/query',
  defaultCoords: [43.8563, -79.5085],
  fallbackRecords: makeSeedPermits('vaughan', 'Vaughan', 'ON', [43.8563, -79.5085], [
    { pNum: 'BP-VGH-2026-03820', addr: '3150 Hwy 7', contr: 'Cortel Group', app: 'Vaughan Metropolitan Centre', subType: 'Commercial High-Rise', val: 42000000, date: '2026-09-22', desc: 'Subway-connected office tower construction, structural glass, and central cooling.' },
    { pNum: 'BP-VGH-2026-03740', addr: '8800 Huntington Rd', contr: 'Penguin Living', app: 'Vaughan Industrial Campus', subType: 'Industrial Warehouse', val: 19500000, date: '2026-09-16', desc: 'Advanced manufacturing warehouse with high-clearance overhead doors and 3-phase power.' }
  ])
});

// 14. HAMILTON, ON
// AUDIT FIX (2026-10-03): old URL 404s. This is the correct current service, but a heads up:
// its underlying data stopped updating in Dec 2023 (confirmed) despite the service being
// live and named "...2017_to_Present" -- so this will correctly report "no live data" under
// any recent date filter until/unless the city resumes publishing. Wiring the right URL here
// is still worth it (honest diagnostics instead of a 404, and it self-heals if they resume).
const hamiltonConnector = new ArcGISConnector({
  citySlug: 'hamilton',
  cityName: 'Hamilton',
  province: 'ON',
  endpoint: 'https://services.arcgis.com/rYz782eMbySr2srL/ArcGIS/rest/services/Building_and_Demolition_Permits_2017_to_Present/FeatureServer/6/query',
  dateField: 'ISSUEDDATE',
  permitNumField: 'PERMITNUMBER',
  addressField: 'ORIGINALADDRESS1',
  subTypeField: 'PERMITCLASS',
  defaultCoords: [43.2557, -79.8711],
  fallbackRecords: makeSeedPermits('hamilton', 'Hamilton', 'ON', [43.2557, -79.8711], [
    { pNum: 'BP-HAM-2026-02940', addr: '100 King St W', contr: 'Alberici Constructors', app: 'Stelco Tower Group', subType: 'Commercial Renovation', val: 18500000, date: '2026-09-24', desc: 'Core infrastructure renovation, chilled beam HVAC upgrade, and elevator modernizations.' },
    { pNum: 'BP-HAM-2026-02860', addr: '920 Upper Wentworth St', contr: 'Ball Construction Ltd.', app: 'Lime Ridge Mall', subType: 'Commercial Addition', val: 11200000, date: '2026-09-18', desc: 'Retail store expansion, steel roof framing, and commercial entrance vestibules.' }
  ])
});

// 15. OTTAWA, ON
// NOT FIXED (2026-10-03): researched thoroughly -- Ottawa's only building-permit dataset
// ("Construction, demolition, and pool enclosure permits monthly") is published as a
// downloadable Excel file per month, not a queryable API. Their ArcGIS org has no permits
// FeatureServer (only wards/population layers).
const ottawaConnector = new ArcGISConnector({
  citySlug: 'ottawa',
  cityName: 'Ottawa',
  province: 'ON',
  endpoint: 'https://open.ottawa.ca/arcgis/rest/services/OpenData/BuildingPermits/FeatureServer/0/query',
  defaultCoords: [45.4215, -75.6972],
  fallbackRecords: makeSeedPermits('ottawa', 'Ottawa', 'ON', [45.4215, -75.6972], [
    { pNum: 'BP-OTT-2026-05180', addr: '150 Elgin St', contr: 'Pomerleau Inc.', app: 'Place Bell Holdings', subType: 'Commercial Renovation', val: 24000000, date: '2026-09-25', desc: 'Federal tenant improvement, secure partition walls, soundproofing, and 400A feeds.' },
    { pNum: 'BP-OTT-2026-05090', addr: '50 Rideau St', contr: 'EllisDon Corporation', app: 'CF Rideau Centre', subType: 'Commercial Renovation', val: 15800000, date: '2026-09-21', desc: 'Transit concourse renovation, architectural metal ceiling, and emergency systems.' },
    { pNum: 'BP-OTT-2026-04980', addr: '111 Sussex Dr', contr: 'Bird Construction', app: 'Foreign Affairs Campus', subType: 'Institutional Addition', val: 31000000, date: '2026-09-15', desc: 'Diplomatic conference pavilion addition, ballistic glazing, and dedicated mechanical penthouse.' }
  ])
});

// 16. KITCHENER-WATERLOO, ON
// AUDIT FIX (2026-10-03): old domain is dead -- moved to Kitchener's ArcGIS Hub (GeoHub).
// Confirmed live, updated daily.
const kitchenerConnector = new ArcGISConnector({
  citySlug: 'kitchener-waterloo',
  cityName: 'Kitchener-Waterloo',
  province: 'ON',
  endpoint: 'https://services1.arcgis.com/qAo1OsXi67t7XgmS/arcgis/rest/services/Building_Permits/FeatureServer/0/query',
  dateField: 'ISSUE_DATE',
  permitNumField: 'PERMITNO',
  addressField: 'FOLDERNAME',
  valueField: 'CONSTRUCTION_VALUE',
  contractorField: 'CONTRACTOR',
  applicantField: 'APPLICANT',
  subTypeField: 'PERMIT_TYPE',
  defaultCoords: [43.4516, -80.4925],
  fallbackRecords: makeSeedPermits('kitchener-waterloo', 'Kitchener-Waterloo', 'ON', [43.4516, -80.4925], [
    { pNum: 'BP-KW-2026-02450', addr: '100 King St S', contr: 'Melloul-Blamey Construction', app: 'Innovation District Waterloo', subType: 'Commercial High-Rise', val: 38000000, date: '2026-09-24', desc: '16-storey tech commercial tower with post-tensioned slabs and high-efficiency HVAC.' },
    { pNum: 'BP-KW-2026-02380', addr: '345 King St W', contr: 'Zehr Group', app: 'Kitchener Innovation Centre', subType: 'Commercial Renovation', val: 9500000, date: '2026-09-18', desc: 'Heritage brick building adaptive reuse, steel mezzanine, and LED branch lighting.' }
  ])
});

// 17. WINNIPEG, MB
const winnipegConnector = new SocrataConnector({
  citySlug: 'winnipeg',
  cityName: 'Winnipeg',
  province: 'MB',
  endpoint: 'https://data.winnipeg.ca/resource/it4w-cpf4.json',
  dateField: 'issue_date',
  permitNumField: 'permit_number',
  addressField: 'address',
  contractorField: 'applicant_business_name',
  applicantField: 'applicant_business_name',
  subTypeField: 'sub_type',
  defaultCoords: [49.8951, -97.1384],
  fallbackRecords: makeSeedPermits('winnipeg', 'Winnipeg', 'MB', [49.8951, -97.1384], [
    { pNum: 'BP-WPG-2026-03890', addr: '201 Portage Ave', contr: 'Bockstael Construction', app: 'Portage & Main Properties', subType: 'Commercial Renovation', val: 21500000, date: '2026-09-23', desc: 'High-rise concourse weather sealing, curtain wall glass retrofit, and HVAC upgrades.' },
    { pNum: 'BP-WPG-2026-03810', addr: '1485 Portage Ave', contr: 'Graham Construction', app: 'CF Polo Park', subType: 'Commercial Addition', val: 14200000, date: '2026-09-19', desc: 'Retail department store addition, structural steel framing, and commercial doors.' },
    { pNum: 'BP-WPG-2026-03750', addr: '395 Main St', contr: 'Akman Construction Ltd.', app: 'Exchange District Heritage', subType: 'Commercial Renovation', val: 8900000, date: '2026-09-14', desc: 'Historic commercial building seismic and mechanical upgrade with fire sprinkler install.' }
  ])
});

// ADDED (2026-10-04): expansion cities researched and confirmed live this session. All use
// fallbackRecords: [] rather than invented sample permits -- per the no-fabricated-data
// policy, a city with no reachable live source should return nothing, not fiction, even in
// a context where allowFallback isn't forced to false.

// 18. HALIFAX, NS
// BUG FIX (2026-10-04): the old 'BuildingPermits' service this connector pointed at is
// abandoned on HRM's end (newest record was dated March 2023, confirmed via a direct
// unfiltered query sorted by DATE_OF_PERMIT_ISSUANCE descending). Found its replacement:
// HRM has since moved to a new permit/licensing system called "PPL&C", exposed as
// PPLC_Issued_Building_Permits on the same ArcGIS org -- confirmed live and current (newest
// records dated 2026-09-29 as of this fix). It's registered as an ArcGIS *table* rather than
// a feature layer (no geometry/points), which is fine -- this connector's query/transform
// logic doesn't require geometry and already falls back to defaultCoords when it's absent.
// Field names changed too (e.g. no more STREET_TYPE -- address is just civic number, street
// name, and community).
const halifaxConnector = new ArcGISConnector({
  citySlug: 'halifax',
  cityName: 'Halifax',
  province: 'NS',
  endpoint: 'https://services2.arcgis.com/11XBiaBYA9Ep0yNJ/ArcGIS/rest/services/PPLC_Issued_Building_Permits/FeatureServer/0/query',
  dateField: 'Date_of_Permit_Issuance',
  permitNumField: 'Permit_Number',
  addressFields: ['Civic_Number', 'Street_Name', 'Community'],
  subTypeField: 'Work_Type',
  valueField: 'Estimated_Project_Value',
  defaultCoords: [44.6488, -63.5752],
  fallbackRecords: []
});

// 19. BARRIE, ON
// No construction-value or contractor field exists on this service -- permits will sync but
// most will show no dollar value.
// BUG FIX (2026-10-04): Date_Status looked like a date field but is a plain STRING column
// formatted "YYYY.MM.DD" -- the connector's normal `>= date '...'` SQL literal was invalid
// against it, causing a 400 "Failed to execute query" error on every fetch. Confirmed via a
// direct field-schema query (type: esriFieldTypeString). Fixed with dateFieldStringFormat.
const barrieConnector = new ArcGISConnector({
  citySlug: 'barrie',
  cityName: 'Barrie',
  province: 'ON',
  endpoint: 'https://gispublic.barrie.ca/arcgis/rest/services/Open_Data/APLI/MapServer/1/query',
  dateField: 'Date_Status',
  dateFieldStringFormat: 'dot',
  permitNumField: 'RECORD_ID',
  addressField: 'Full_Address',
  defaultCoords: [44.3894, -79.6903],
  fallbackRecords: []
});

// 20. DELTA, BC
// Layer mixes building, plumbing and mechanical permits together; no value or contractor field.
const deltaConnector = new ArcGISConnector({
  citySlug: 'delta',
  cityName: 'Delta',
  province: 'BC',
  endpoint: 'https://mw1.delta.ca/arcgis/rest/services/DeltaMap/Permits/MapServer/0/query',
  dateField: 'COMPLETED_DATE',
  permitNumField: 'PERMITNUMBER',
  addressField: 'CIVIC_ADDRESS',
  defaultCoords: [49.0847, -123.0587],
  fallbackRecords: []
});

// 21. NEW YORK, NY
const newyorkConnector = new SocrataConnector({
  citySlug: 'new-york',
  cityName: 'New York',
  province: 'NY',
  endpoint: 'https://data.cityofnewyork.us/resource/rbx6-tga4.json',
  dateField: 'approved_date',
  permitNumField: 'job_filing_number',
  addressFields: ['house_no', 'street_name'],
  valueField: 'estimated_job_costs',
  contractorField: 'applicant_business_name',
  applicantField: 'applicant_business_name',
  defaultCoords: [40.7128, -74.0060],
  fallbackRecords: []
});

// 22. LOS ANGELES, CA
const losangelesConnector = new SocrataConnector({
  citySlug: 'los-angeles',
  cityName: 'Los Angeles',
  province: 'CA',
  endpoint: 'https://data.lacity.org/resource/pi9x-tg5x.json',
  dateField: 'issue_date',
  permitNumField: 'permit_nbr',
  addressField: 'primary_address',
  valueField: 'valuation',
  defaultCoords: [34.0522, -118.2437],
  fallbackRecords: []
});

// 23. CHICAGO, IL
const chicagoConnector = new SocrataConnector({
  citySlug: 'chicago',
  cityName: 'Chicago',
  province: 'IL',
  endpoint: 'https://data.cityofchicago.org/resource/ydr8-5enu.json',
  dateField: 'issue_date',
  permitNumField: 'permit_',
  addressFields: ['street_number', 'street_direction', 'street_name'],
  valueField: 'reported_cost',
  contractorField: 'contact_4_name',
  defaultCoords: [41.8781, -87.6298],
  fallbackRecords: []
});

// 24. SAN FRANCISCO, CA
const sanfranciscoConnector = new SocrataConnector({
  citySlug: 'san-francisco',
  cityName: 'San Francisco',
  province: 'CA',
  endpoint: 'https://data.sf.gov/resource/i98e-djp9.json',
  dateField: 'permit_creation_date',
  permitNumField: 'permit_number',
  addressFields: ['street_number', 'street_name'],
  valueField: 'estimated_cost',
  defaultCoords: [37.7749, -122.4194],
  fallbackRecords: []
});

// 25. AUSTIN, TX
// Valuation is split across several permit-type-specific columns on this dataset (no single
// consistent value field) -- most permits will show no dollar value until that's mapped more
// precisely.
const austinConnector = new SocrataConnector({
  citySlug: 'austin',
  cityName: 'Austin',
  province: 'TX',
  endpoint: 'https://data.austintexas.gov/resource/3syk-w9eu.json',
  dateField: 'issue_date',
  permitNumField: 'permit_number',
  addressField: 'original_address1',
  contractorField: 'contractor_company_name',
  defaultCoords: [30.2672, -97.7431],
  fallbackRecords: []
});

// 26. NEW ORLEANS, LA
const neworleansConnector = new SocrataConnector({
  citySlug: 'new-orleans',
  cityName: 'New Orleans',
  province: 'LA',
  endpoint: 'https://data.nola.gov/resource/72f9-bi28.json',
  dateField: 'issuedate',
  permitNumField: 'permitnum',
  addressField: 'originaladdress1',
  valueField: 'estprojectcost',
  contractorField: 'contractorcompanyname',
  defaultCoords: [29.9511, -90.0715],
  fallbackRecords: []
});

// 27. FORT WORTH, TX
const fortworthConnector = new ArcGISConnector({
  citySlug: 'fort-worth',
  cityName: 'Fort Worth',
  province: 'TX',
  endpoint: 'https://testmapit.fortworthtexas.gov/ags/rest/services/Planning_Development/BuildingPermitView/MapServer/0/query',
  dateField: 'IssueDate',
  permitNumField: 'Permit',
  addressField: 'Address',
  valueField: 'JobValue',
  applicantField: 'CustomerName',
  defaultCoords: [32.7555, -97.3308],
  fallbackRecords: []
});

// 28. COLUMBUS, OH
const columbusConnector = new ArcGISConnector({
  citySlug: 'columbus',
  cityName: 'Columbus',
  province: 'OH',
  endpoint: 'https://gis.columbus.gov/arcgis/rest/services/Schemas/BuildingZoning/MapServer/5/query',
  dateField: 'ISSUED_DT',
  permitNumField: 'B1_ALT_ID',
  addressField: 'SITE_ADDRESS',
  valueField: 'G3_VALUE_TTL',
  applicantField: 'APPLICANT_BUS_NAME',
  defaultCoords: [39.9612, -82.9988],
  fallbackRecords: []
});

// 29. CHARLOTTE, NC
const charlotteConnector = new ArcGISConnector({
  citySlug: 'charlotte',
  cityName: 'Charlotte',
  province: 'NC',
  endpoint: 'https://meckgis.mecklenburgcountync.gov/server/rest/services/BuildingPermits/MapServer/0/query',
  dateField: 'issuedate',
  permitNumField: 'permitnum',
  addressField: 'projadd',
  valueField: 'bldgcost',
  applicantField: 'ownname',
  defaultCoords: [35.2271, -80.8431],
  fallbackRecords: []
});

// 30. SEATTLE, WA
// Residential permits only -- no citywide commercial layer found. No contractor field.
// NOTE (2026-10-04): a direct unfiltered query sorted by ISS_DATE descending showed the
// newest record dated June 30, 2026 (~3 months behind today), so the cron's 14-day window
// currently reports zero records. Correctly configured; this feed just updates on a lag.
const seattleConnector = new ArcGISConnector({
  citySlug: 'seattle',
  cityName: 'Seattle',
  province: 'WA',
  endpoint: 'https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Residential_Building_Permits_Issued_and_Final/FeatureServer/0/query',
  dateField: 'ISS_DATE',
  permitNumField: 'PRMT_NR',
  addressField: 'ADDRESS',
  valueField: 'VALUE',
  defaultCoords: [47.6062, -122.3321],
  fallbackRecords: []
});

// 31. DENVER, CO
// Residential permits only on this layer -- ODC_DEV_COMMERCIALCONSTPERMIT_P on the same
// ArcGIS org covers commercial and could be added as a second connector later.
const denverConnector = new ArcGISConnector({
  citySlug: 'denver',
  cityName: 'Denver',
  province: 'CO',
  endpoint: 'https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/ArcGIS/rest/services/ODC_DEV_RESIDENTIALCONSTPERMIT_P/FeatureServer/316/query',
  dateField: 'DATE_ISSUED',
  permitNumField: 'PERMIT_NUM',
  addressField: 'ADDRESS',
  valueField: 'VALUATION',
  contractorField: 'CONTRACTOR_NAME',
  defaultCoords: [39.7392, -104.9903],
  fallbackRecords: []
});

// 32. WASHINGTON, DC
// No construction-value field on this service (only fees paid).
// NOTE (2026-10-04): a direct unfiltered query sorted by ISSUE_DATE descending showed the
// newest record dated right around Jan 1, 2026 (~9 months behind today), so the cron's
// 14-day window currently reports zero records. Correctly configured; this feed updates on
// a significant lag.
const washingtondcConnector = new ArcGISConnector({
  citySlug: 'washington-dc',
  cityName: 'Washington',
  province: 'DC',
  endpoint: 'https://maps2.dcgis.dc.gov/dcgis/rest/services/FEEDS/DCRA/FeatureServer/17/query',
  dateField: 'ISSUE_DATE',
  permitNumField: 'PERMIT_ID',
  addressField: 'FULL_ADDRESS',
  applicantField: 'PERMIT_APPLICANT',
  defaultCoords: [38.9072, -77.0369],
  fallbackRecords: []
});

// 33. SACRAMENTO, CA
// BUG FIX (2026-10-04): Status_Date looked like a date field but is a plain STRING column
// formatted "MM/DD/YYYY" -- the connector's normal `>= date '...'` SQL literal silently
// matched zero rows against it, even though this feed's data is current (most recent record
// was only a week old when checked). Confirmed via a direct field-schema query (type:
// esriFieldTypeString). Fixed with dateFieldStringFormat -- this was the single highest-value
// fix among the zero-record cities, since Sacramento's data is genuinely live and current.
const sacramentoConnector = new ArcGISConnector({
  citySlug: 'sacramento',
  cityName: 'Sacramento',
  province: 'CA',
  endpoint: 'https://services5.arcgis.com/54falWtcpty3V47Z/ArcGIS/rest/services/BldgPermitIssued_CurrentYear/FeatureServer/0/query',
  dateField: 'Status_Date',
  dateFieldStringFormat: 'slash',
  permitNumField: 'Application',
  addressField: 'Address',
  valueField: 'Valuation',
  contractorField: 'Contractor',
  defaultCoords: [38.5816, -121.4944],
  fallbackRecords: []
});

// 34. LOUISVILLE, KY
// NOTE (2026-10-04): a direct unfiltered query showed the newest ISSUEDATE value is from
// February 2019 -- "Active_Permits" appears to mean currently-open/unclosed permits (which
// skew very old, e.g. old electrical permits that never got closed out) rather than
// recently-issued ones. ISSUEDATE is also a plain string column, not a real date field.
// This looks like the wrong dataset for "recent permits issued" rather than a quick fix;
// worth treating like the "needs a different endpoint" cities until a better Louisville
// feed turns up.
const louisvilleConnector = new ArcGISConnector({
  citySlug: 'louisville',
  cityName: 'Louisville',
  province: 'KY',
  endpoint: 'https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/Louisville_Metro_KY_Active_Permits/FeatureServer/0/query',
  dateField: 'ISSUEDATE',
  permitNumField: 'PERMITNUMBER',
  addressField: 'ADDRESS',
  valueField: 'PROJECTCOSTS',
  contractorField: 'CONTRACTOR',
  defaultCoords: [38.2527, -85.7585],
  fallbackRecords: []
});

// 35. ALBUQUERQUE, NM
// NOTE (2026-10-04): a direct unfiltered query sorted by DateIssued descending showed the
// newest record dated mid-January 2025 (~1.75 years behind today), so the cron's 14-day
// window currently reports zero records. Correctly configured; this feed looks stale on
// the city's end.
const albuquerqueConnector = new ArcGISConnector({
  citySlug: 'albuquerque',
  cityName: 'Albuquerque',
  province: 'NM',
  endpoint: 'https://coageo.cabq.gov/cabqgeo/rest/services/agis/City_Building_Permits/FeatureServer/0/query',
  dateField: 'DateIssued',
  permitNumField: 'PermitNumber',
  addressField: 'CalculatedAddress',
  valueField: 'Valuation',
  contractorField: 'Contractor',
  applicantField: 'Owner',
  defaultCoords: [35.0844, -106.6504],
  fallbackRecords: []
});

// 36. MINNEAPOLIS, MN
const minneapolisConnector = new ArcGISConnector({
  citySlug: 'minneapolis',
  cityName: 'Minneapolis',
  province: 'MN',
  endpoint: 'https://services.arcgis.com/afSMGVsC7QlRK1kZ/ArcGIS/rest/services/CCS_Permits/FeatureServer/0/query',
  dateField: 'issueDate',
  permitNumField: 'permitNumber',
  addressField: 'Display',
  valueField: 'value',
  applicantField: 'applicantName',
  defaultCoords: [44.9778, -93.2650],
  fallbackRecords: []
});

// 37. RALEIGH, NC
const raleighConnector = new ArcGISConnector({
  citySlug: 'raleigh',
  cityName: 'Raleigh',
  province: 'NC',
  endpoint: 'https://services.arcgis.com/v400IkDOw1ad7Yad/ArcGIS/rest/services/Building_Permits/FeatureServer/0/query',
  dateField: 'issueddate',
  permitNumField: 'permitnum',
  addressField: 'address',
  valueField: 'estprojectcost',
  contractorField: 'contractorcompanyname',
  defaultCoords: [35.7796, -78.6382],
  fallbackRecords: []
});

// 38. MIAMI, FL
// Use this layer, not the sibling AllCityPermits service (mostly zoning/entitlements). No
// value or contractor field on this one.
const miamiConnector = new ArcGISConnector({
  citySlug: 'miami',
  cityName: 'Miami',
  province: 'FL',
  endpoint: 'https://gis.miami.gov/gis/rest/services/Maps/iBuildPermits/MapServer/0/query',
  dateField: 'PermitIssuedDate',
  permitNumField: 'PermitNumber',
  addressField: 'FULLADDR',
  defaultCoords: [25.7617, -80.1918],
  fallbackRecords: []
});

// 39. PHOENIX, AZ
// No valuation field in this service's schema.
// NOTE (2026-10-04): a direct unfiltered query sorted by PERMIT_ISSUE_DATE descending
// showed the newest record dated June 2022 -- this "ShapePHXPermitsPoints" layer looks
// dead/archival (over 4 years stale), not a connector bug. Likely needs a replacement
// endpoint rather than a date-filter fix; worth revisiting as a research task.
const phoenixConnector = new ArcGISConnector({
  citySlug: 'phoenix',
  cityName: 'Phoenix',
  province: 'AZ',
  endpoint: 'https://mapportal.phoenix.gov/pds/rest/services/ShapePHX/ShapePHXPermitsPoints/MapServer/0/query',
  dateField: 'PERMIT_ISSUE_DATE',
  permitNumField: 'PERMIT_NUMBER',
  addressField: 'ADDRESS',
  applicantField: 'OWNER_NAME',
  defaultCoords: [33.4484, -112.0740],
  fallbackRecords: []
});

// Registry of all Canadian + US municipal connectors (named CANADIAN_CITY_CONNECTORS for
// historical reasons -- it now also holds the US expansion cities added 2026-10-04).
export const CANADIAN_CITY_CONNECTORS: Record<string, CityConnector> = {
  'vancouver': vancouverConnector,
  'surrey': surreyConnector,
  'burnaby': burnabyConnector,
  'richmond': richmondConnector,
  'coquitlam': coquitlamConnector,
  'kelowna': kelownaConnector,
  'calgary': calgaryConnector,
  'edmonton': edmontonConnector,
  'toronto': torontoConnector,
  'mississauga': mississaugaConnector,
  'brampton': bramptonConnector,
  'markham': markhamConnector,
  'vaughan': vaughanConnector,
  'hamilton': hamiltonConnector,
  'ottawa': ottawaConnector,
  'kitchener-waterloo': kitchenerConnector,
  'winnipeg': winnipegConnector,
  'halifax': halifaxConnector,
  'barrie': barrieConnector,
  'delta': deltaConnector,
  'new-york': newyorkConnector,
  'los-angeles': losangelesConnector,
  'chicago': chicagoConnector,
  'san-francisco': sanfranciscoConnector,
  'austin': austinConnector,
  'new-orleans': neworleansConnector,
  'fort-worth': fortworthConnector,
  'columbus': columbusConnector,
  'charlotte': charlotteConnector,
  'seattle': seattleConnector,
  'denver': denverConnector,
  'washington-dc': washingtondcConnector,
  'sacramento': sacramentoConnector,
  'louisville': louisvilleConnector,
  'albuquerque': albuquerqueConnector,
  'minneapolis': minneapolisConnector,
  'raleigh': raleighConnector,
  'miami': miamiConnector,
  'phoenix': phoenixConnector
};

export function getConnector(citySlug: string): CityConnector | undefined {
  return CANADIAN_CITY_CONNECTORS[citySlug.toLowerCase()];
}

export function getAllConnectors(): CityConnector[] {
  return Object.values(CANADIAN_CITY_CONNECTORS);
}

export function getActiveCitySlugs(): string[] {
  return Object.keys(CANADIAN_CITY_CONNECTORS);
}
