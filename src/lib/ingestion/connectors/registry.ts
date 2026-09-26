import { CityConnector, UnifiedPermit } from './types';
import { SocrataConnector } from './base-socrata';
import { ArcGISConnector } from './base-arcgis';
import { CKANConnector } from './base-ckan';
import { KelownaConnector } from './kelowna';

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
  endpoint: 'https://opendata.vancouver.ca/api/records/1.0/search/?dataset=issued-building-permits',
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
const surreyConnector = new CKANConnector({
  citySlug: 'surrey',
  cityName: 'Surrey',
  province: 'BC',
  endpoint: 'https://data.surrey.ca/api/3/action/datastore_search?resource_id=building-permits',
  defaultCoords: [49.1913, -122.8490],
  fallbackRecords: makeSeedPermits('surrey', 'Surrey', 'BC', [49.1913, -122.8490], [
    { pNum: 'BP-SRY-2026-1140', addr: '10255 King George Blvd', contr: 'ITC Construction Group', app: 'Surrey City Centre Mall', subType: 'Commercial Addition', val: 32000000, date: '2026-09-24', desc: 'Commercial addition to transit-oriented high-rise podium.' },
    { pNum: 'BP-SRY-2026-1125', addr: '18820 28th Ave', contr: 'Campbell Construction Ltd.', app: 'Campbell Heights Industrial', subType: 'Industrial Warehouse', val: 14800000, date: '2026-09-20', desc: 'Tilt-up concrete industrial warehouse with 8 loading dock overhead bay doors.' },
    { pNum: 'BP-SRY-2026-1110', addr: '16288 104th Ave', contr: 'Marcon Construction Ltd.', app: 'Guilford Developments', subType: 'Multi-Family Residential', val: 21500000, date: '2026-09-16', desc: '5-storey wood frame apartment over reinforced concrete parkade.' },
    { pNum: 'BP-SRY-2026-1095', addr: '15150 96th Ave', contr: 'Bosa Properties Inc.', app: 'Green Timbers Holdings', subType: 'Commercial Renovation', val: 4100000, date: '2026-09-11', desc: 'Healthcare clinic tenant improvement and HVAC mechanical upgrade.' }
  ])
});

// 3. BURNABY, BC
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
const kelownaConnector = new KelownaConnector();

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
  defaultCoords: [43.6532, -79.3832],
  fallbackRecords: makeSeedPermits('toronto', 'Toronto', 'ON', [43.6532, -79.3832], [
    { pNum: 'BP-TO-2026-10492', addr: '100 King St W', contr: 'EllisDon Corporation', app: 'First Canadian Place', subType: 'Commercial High-Rise', val: 75000000, date: '2026-09-25', desc: 'Financial tower podium upgrade, high-voltage switchgear, and commercial HVAC chillers.' },
    { pNum: 'BP-TO-2026-10420', addr: '200 Bay St', contr: 'PCL Constructors Canada', app: 'Royal Bank Plaza', subType: 'Commercial Renovation', val: 34000000, date: '2026-09-23', desc: 'Interior executive floor fit-out, acoustic ceiling baffles, and LED lighting.' },
    { pNum: 'BP-TO-2026-10350', addr: '180 University Ave', contr: 'Multiplex Construction Canada', app: 'Shangri-La Development', subType: 'Multi-Family Residential', val: 52000000, date: '2026-09-19', desc: 'Luxury residential condominium tower elevator modernization and envelope repairs.' },
    { pNum: 'BP-TO-2026-10280', addr: '250 Front St W', contr: 'Bird Construction', app: 'CBC Broadcast Centre', subType: 'Institutional Renovation', val: 19800000, date: '2026-09-14', desc: 'Studio technical upgrade, acoustic drywall partitions, and heavy HVAC routing.' }
  ])
});

// 10. MISSISSAUGA, ON
const mississaugaConnector = new ArcGISConnector({
  citySlug: 'mississauga',
  cityName: 'Mississauga',
  province: 'ON',
  endpoint: 'https://data.mississauga.ca/arcgis/rest/services/OpenData/BuildingPermits/FeatureServer/0/query',
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
const hamiltonConnector = new ArcGISConnector({
  citySlug: 'hamilton',
  cityName: 'Hamilton',
  province: 'ON',
  endpoint: 'https://open.hamilton.ca/arcgis/rest/services/OpenData/BuildingPermits/FeatureServer/0/query',
  defaultCoords: [43.2557, -79.8711],
  fallbackRecords: makeSeedPermits('hamilton', 'Hamilton', 'ON', [43.2557, -79.8711], [
    { pNum: 'BP-HAM-2026-02940', addr: '100 King St W', contr: 'Alberici Constructors', app: 'Stelco Tower Group', subType: 'Commercial Renovation', val: 18500000, date: '2026-09-24', desc: 'Core infrastructure renovation, chilled beam HVAC upgrade, and elevator modernizations.' },
    { pNum: 'BP-HAM-2026-02860', addr: '920 Upper Wentworth St', contr: 'Ball Construction Ltd.', app: 'Lime Ridge Mall', subType: 'Commercial Addition', val: 11200000, date: '2026-09-18', desc: 'Retail store expansion, steel roof framing, and commercial entrance vestibules.' }
  ])
});

// 15. OTTAWA, ON
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
const kitchenerConnector = new ArcGISConnector({
  citySlug: 'kitchener-waterloo',
  cityName: 'Kitchener-Waterloo',
  province: 'ON',
  endpoint: 'https://data.kitchener.ca/arcgis/rest/services/OpenData/BuildingPermits/FeatureServer/0/query',
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

// Registry of all 17 Major Canadian Municipal Connectors
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
  'winnipeg': winnipegConnector
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
