const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const permitsFile = path.join(__dirname, '../src/data/permits.json');
const existingPermits = JSON.parse(fs.readFileSync(permitsFile, 'utf8'));

const TRADE_LOOKUP = {
  electrical: {
    subtrade_key: 'electrical',
    name: 'Electrical (200A Service)',
    color: '#2563EB',
    icon: 'Zap',
    confidence: 0.95,
    matched_terms: ['electrical', '200a', 'wiring', 'panel']
  },
  hvac_plumbing: {
    subtrade_key: 'hvac_plumbing',
    name: 'Plumbing & Mechanical / HVAC',
    color: '#DC2626',
    icon: 'Flame',
    confidence: 0.9,
    matched_terms: ['hvac', 'plumbing', 'heat pump', 'furnace']
  },
  roofing: {
    subtrade_key: 'roofing',
    name: 'Roofing & Sheet Metal',
    color: '#16A34A',
    icon: 'Home',
    confidence: 0.85,
    matched_terms: ['roofing', 'shingles', 'sheet metal']
  },
  drywall_framing: {
    subtrade_key: 'drywall_framing',
    name: 'Framing, Drywall & Steel Stud',
    color: '#D97706',
    icon: 'Layers',
    confidence: 1.0,
    matched_terms: ['framing', 'drywall', 'lumber']
  },
  commercial_doors: {
    subtrade_key: 'commercial_doors',
    name: 'Overhead Garage Doors',
    color: '#EA580C',
    icon: 'DoorOpen',
    confidence: 0.8,
    matched_terms: ['overhead doors', 'garage door']
  },
  glazing: {
    subtrade_key: 'glazing',
    name: 'Glazing & Building Envelope',
    color: '#0891B2',
    icon: 'Maximize',
    confidence: 0.75,
    matched_terms: ['glazing', 'windows', 'envelope']
  },
  concrete: {
    subtrade_key: 'concrete',
    name: 'Concrete & Foundations',
    color: '#4B5563',
    icon: 'Hammer',
    confidence: 0.9,
    matched_terms: ['foundation', 'concrete footings', 'slab']
  }
};

const newSFDPermits = [
  // Wilden
  {
    permit_number: 'BP2026-00401',
    address: '1480 Skyland Drive, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1150000,
    description: 'Construct new 2-storey single family dwelling with unfinished walkout basement, 200A electrical service, rough-in for EV charger, engineered wood framing, ducted heat pump HVAC, and asphalt fiberglass shingle roof.',
    ai_summary: 'Single-family residential construction for 1480 Skyland Drive ($1,150,000) in Wilden. Bidding opportunities in Framing, Electrical (200A), Plumbing/HVAC, and Roofing.',
    contractor_name: 'AuthenTech Homes Ltd.',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Wilden Construction Dept',
    latitude: 49.9324,
    longitude: -119.4621,
    issue_date: '2026-09-17',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.roofing, TRADE_LOOKUP.electrical, TRADE_LOOKUP.hvac_plumbing]
  },
  {
    permit_number: 'BP2026-00402',
    address: '240 Echo Ridge Drive, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 980000,
    description: 'Construct 3-bedroom hillside single family home with attached double garage, PEX plumbing system, 96% high-efficiency gas furnace with AC, and drywall finishing throughout.',
    ai_summary: 'New single family build at 240 Echo Ridge Drive ($980,000). Active subtrade packages for Framing, Plumbing/HVAC, and Drywall/Insulation.',
    contractor_name: 'Rykon Construction Management',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Rykon Homes',
    latitude: 49.9288,
    longitude: -119.4645,
    issue_date: '2026-09-16',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.hvac_plumbing, TRADE_LOOKUP.electrical]
  },
  {
    permit_number: 'BP2026-00403',
    address: '1120 Hidden Lake Mews, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1420000,
    description: 'Construct luxury single family dwelling with legal 1-bedroom secondary suite in basement, triple bay garage with smart overhead doors, standing seam metal roofing, and 200A dual-meter electrical panel.',
    ai_summary: 'Custom residence with legal suite at 1120 Hidden Lake Mews ($1,420,000). Immediate estimation needed for Framing, Electrical, Metal Roofing, and Overhead Doors.',
    contractor_name: 'Chatham Homes Ltd.',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Hidden Lake Developments',
    latitude: 49.9351,
    longitude: -119.4678,
    issue_date: '2026-09-15',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.electrical, TRADE_LOOKUP.roofing, TRADE_LOOKUP.commercial_doors]
  },
  {
    permit_number: 'BP2026-00404',
    address: '1552 Long Ridge Drive, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1250000,
    description: 'Construct modern craftsman single family dwelling on walk-out lot with step 4 energy code envelope, concrete foundation retaining walls, and multi-zone heat pump system.',
    ai_summary: 'Craftsman residential build on Long Ridge Dr ($1,250,000) in Wilden. Bidding open for Concrete/Foundations, Framing, Electrical, and HVAC.',
    contractor_name: 'Fawdry Homes Ltd.',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Fawdry Custom Builders',
    latitude: 49.9372,
    longitude: -119.4589,
    issue_date: '2026-09-14',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.electrical, TRADE_LOOKUP.hvac_plumbing, TRADE_LOOKUP.concrete]
  },

  // Upper Mission & Kettle Valley
  {
    permit_number: 'BP2026-00405',
    address: '5230 Chute Lake Road, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1650000,
    description: 'Construct executive single family home with vaulted timber ceilings, 400A high-capacity electrical service, hydronic in-floor radiant heating, and architectural cedar shake roofing.',
    ai_summary: 'Executive single family build on Chute Lake Rd ($1,650,000) in Upper Mission. Scope covers Timber Framing, Electrical (400A), Hydronic HVAC, and Roofing.',
    contractor_name: 'Frame Custom Homes',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Bill Frame',
    latitude: 49.8021,
    longitude: -119.5085,
    issue_date: '2026-09-17',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.electrical, TRADE_LOOKUP.hvac_plumbing, TRADE_LOOKUP.roofing]
  },
  {
    permit_number: 'BP2026-00406',
    address: '890 Kuipers Crescent, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1280000,
    description: 'Construct contemporary 2-storey single family dwelling with attached 3-car garage, ducted heat pump, complete electrical rough-in, and plumbing fixture installation.',
    ai_summary: 'Contemporary residence at 890 Kuipers Crescent ($1,280,000) with lake views. Prime opportunities for Framing, Electrical, and Mechanical/Plumbing.',
    contractor_name: 'Richmond Custom Homes',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Kuipers Peak Developments',
    latitude: 49.8184,
    longitude: -119.4972,
    issue_date: '2026-09-15',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.electrical, TRADE_LOOKUP.hvac_plumbing]
  },
  {
    permit_number: 'BP2026-00407',
    address: '410 South Ridge Drive, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 890000,
    description: 'Major renovation and 2-storey addition to existing single family dwelling including complete roof structure replacement, new second-floor master suite, and updated electrical service panel.',
    ai_summary: 'Major single-family home addition & remodel on South Ridge Drive ($890,000). Bidding active for Roofing & Sheet Metal, Drywall, and Electrical.',
    contractor_name: 'Square One Contracting',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'South Ridge Residential',
    latitude: 49.8242,
    longitude: -119.4910,
    issue_date: '2026-09-12',
    trades: [TRADE_LOOKUP.roofing, TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.electrical]
  },
  {
    permit_number: 'BP2026-00408',
    address: '388 Quinn Court, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1550000,
    description: 'Construct custom architectural single family home in Kettle Valley featuring floor-to-ceiling high-efficiency glazing package, smart home automation wiring, and ducted multi-zone HVAC.',
    ai_summary: 'High-end custom single-family build at 388 Quinn Court ($1,550,000). Major trade packages in Glazing/Envelope, Framing, Electrical, and HVAC.',
    contractor_name: 'Dilworth Homes (Kettle Valley)',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Kettle Valley Holdings',
    latitude: 49.8055,
    longitude: -119.5020,
    issue_date: '2026-09-13',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.glazing, TRADE_LOOKUP.electrical, TRADE_LOOKUP.hvac_plumbing]
  },
  {
    permit_number: 'BP2026-00409',
    address: '5410 Mountainside Drive, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1850000,
    description: 'Construct luxury mountain modern single family estate with in-ground concrete swimming pool, expansive suspended concrete patio slabs, backup generator wiring, and geothermal heat loop.',
    ai_summary: 'Luxury single family estate on Mountainside Drive ($1,850,000). Extensive subcontractor opportunities in Concrete, Framing, Geothermal HVAC, and Electrical.',
    contractor_name: 'Kodiak Custom Construction',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Mountainside Estates',
    latitude: 49.7995,
    longitude: -119.5122,
    issue_date: '2026-09-11',
    trades: [TRADE_LOOKUP.concrete, TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.hvac_plumbing, TRADE_LOOKUP.electrical]
  },

  // Black Mountain
  {
    permit_number: 'BP2026-00410',
    address: '1725 Loseth Road, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 850000,
    description: 'Construct 2-storey single family dwelling with unfinished basement, standard 200A electrical service, rough-in plumbing for 3.5 baths, and wood frame construction.',
    ai_summary: 'New single family home build at 1725 Loseth Road ($850,000) in Black Mountain. Trade scope covers Framing, Electrical, and Residential Plumbing.',
    contractor_name: 'Edgecombe Builders Group',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Loseth Ridge Developments',
    latitude: 49.8785,
    longitude: -119.3490,
    issue_date: '2026-09-16',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.electrical, TRADE_LOOKUP.hvac_plumbing]
  },
  {
    permit_number: 'BP2026-00411',
    address: '2110 Mine Hill Drive, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 920000,
    description: 'Construct single family dwelling with attached insulated 2-car garage, premium roll-up overhead doors, architectural fiberglass shingle roofing, and engineered roof trusses.',
    ai_summary: 'Single family residential home at 2110 Mine Hill Drive ($920,000). Packages available in Framing, Roofing & Sheet Metal, and Overhead Garage Doors.',
    contractor_name: 'Bellamy Homes',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Mine Hill Joint Venture',
    latitude: 49.8820,
    longitude: -119.3412,
    issue_date: '2026-09-14',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.roofing, TRADE_LOOKUP.commercial_doors]
  },
  {
    permit_number: 'BP2026-00412',
    address: '1450 Black Mountain Drive, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1050000,
    description: 'Construct rancher with daylight walk-out basement, high-efficiency heat pump with auxiliary electric coil, drywall taping and texture, and 200A underground service connection.',
    ai_summary: 'Walk-out rancher single family build on Black Mountain Drive ($1,050,000). Trade bidding open for Framing, Drywall, Electrical, and HVAC.',
    contractor_name: 'Okanagan Dream Builders',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Black Mountain Golf Community',
    latitude: 49.8741,
    longitude: -119.3565,
    issue_date: '2026-09-10',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.electrical, TRADE_LOOKUP.hvac_plumbing]
  },

  // Glenmore & Dilworth
  {
    permit_number: 'BP2026-00413',
    address: '640 Valley Road, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 750000,
    description: 'Construct single family infill dwelling with crawl space foundation, wood stud framing, 200A panel, PEX water lines, and dual head ductless mini-split HVAC.',
    ai_summary: 'Single family infill home at 640 Valley Road ($750,000) in Glenmore. Key trades include Wood Framing, Electrical, and Mini-Split HVAC.',
    contractor_name: 'Kelowna Urban Infill Ltd.',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Glenmore Holdings',
    latitude: 49.9125,
    longitude: -119.4480,
    issue_date: '2026-09-18',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.electrical, TRADE_LOOKUP.hvac_plumbing]
  },
  {
    permit_number: 'BP2026-00414',
    address: '910 Summit Drive, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1100000,
    description: 'Construct modern 2-storey single family dwelling on Dilworth Mountain with metal standing seam roof, wood frame construction, and recessed LED architectural lighting layout.',
    ai_summary: 'Single family custom build on Dilworth Mountain ($1,100,000). Active subtrade tenders for Framing, Standing Seam Roofing, and Electrical.',
    contractor_name: 'Dilworth Mountain Builders',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Summit View Investments',
    latitude: 49.8970,
    longitude: -119.4395,
    issue_date: '2026-09-15',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.roofing, TRADE_LOOKUP.electrical]
  },
  {
    permit_number: 'BP2026-00415',
    address: '1825 Dilworth Drive, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1320000,
    description: 'Construct custom executive single family home with legal 1-bedroom secondary suite, fire-rated drywall separation, separate electrical panels, and dual heat pump condensers.',
    ai_summary: 'Executive single family build with suite at 1825 Dilworth Drive ($1,320,000). Scope includes Framing, Fire-Rated Drywall, Dual Electrical, and HVAC.',
    contractor_name: 'Troika Management Corp',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Troika Developments',
    latitude: 49.8920,
    longitude: -119.4310,
    issue_date: '2026-09-13',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.electrical, TRADE_LOOKUP.hvac_plumbing]
  },
  {
    permit_number: 'BP2026-00416',
    address: '240 Clifton Road, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1400000,
    description: 'Construct contemporary single family dwelling with panoramic Okanagan Lake views, extensive aluminum curtain-wall window packages, metal fascia roofing, and high-end electrical.',
    ai_summary: 'Lakeview contemporary home on Clifton Road ($1,400,000). Key trades in Glazing & Building Envelope, Framing, Metal Roofing, and Electrical.',
    contractor_name: 'Worman Commercial & Residential',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Clifton Highlands Ltd.',
    latitude: 49.9215,
    longitude: -119.4750,
    issue_date: '2026-09-12',
    trades: [TRADE_LOOKUP.glazing, TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.roofing, TRADE_LOOKUP.electrical]
  },

  // McKinley Beach & North Kelowna
  {
    permit_number: 'BP2026-00417',
    address: '3350 McKinley Beach Drive, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1750000,
    description: 'Construct luxury waterfront custom single family home with multi-slide thermal break patio doors, architectural flat roof with torch-on membrane, and smart automated electrical.',
    ai_summary: 'Waterfront luxury home at McKinley Beach ($1,750,000). Major bidding packages for Torch-On Roofing, High-End Glazing, Framing, and Electrical.',
    contractor_name: 'Rykon McKinley Division',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'McKinley Beach Corp',
    latitude: 49.9720,
    longitude: -119.4520,
    issue_date: '2026-09-16',
    trades: [TRADE_LOOKUP.glazing, TRADE_LOOKUP.roofing, TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.electrical]
  },
  {
    permit_number: 'BP2026-00418',
    address: '3412 Arrowroot Drive, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1380000,
    description: 'Construct 3-storey tiered hillside single family home with double overhead garage doors, central ducted heat pump, complete electrical wiring, and plumbing rough-ins.',
    ai_summary: 'Hillside tiered residence on Arrowroot Drive ($1,380,000) at McKinley. Bidding for Framing, HVAC, Overhead Doors, and Electrical.',
    contractor_name: 'Nautica Luxury Homes',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Hillside McKinley JV',
    latitude: 49.9765,
    longitude: -119.4490,
    issue_date: '2026-09-11',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.hvac_plumbing, TRADE_LOOKUP.commercial_doors, TRADE_LOOKUP.electrical]
  },

  // Crawford & Lower Mission
  {
    permit_number: 'BP2026-00419',
    address: '4680 Bellevue Drive, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1490000,
    description: 'Construct modern farmhouse custom single family estate on 0.5 acre parcel with board-and-batten exterior, high-efficiency mechanical room, 200A electrical, and concrete patio slabs.',
    ai_summary: 'Custom estate single family dwelling on Bellevue Drive ($1,490,000) in Lower Mission. Subtrades needed: Framing, Electrical, HVAC, and Concrete.',
    contractor_name: 'Mission Group Residential',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Bellevue Estate Holdings',
    latitude: 49.8290,
    longitude: -119.4830,
    issue_date: '2026-09-17',
    trades: [TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.electrical, TRADE_LOOKUP.hvac_plumbing, TRADE_LOOKUP.concrete]
  },
  {
    permit_number: 'BP2026-00420',
    address: '1240 Crawford Road, Kelowna, BC',
    city_region: 'Kelowna',
    permit_type: 'Single-Family Residential (SFD)',
    work_class: 'Residential',
    estimated_value: 1180000,
    description: 'Construct 2-storey single family dwelling with attached 3-car garage, poured concrete foundation, timber frame entry porch, architectural shingle roof, and full electrical package.',
    ai_summary: 'Single family home with 3-car garage at 1240 Crawford Road ($1,180,000). Active tenders for Concrete/Foundations, Framing, Roofing, and Electrical.',
    contractor_name: 'San Marc Homes Ltd.',
    contractor_phone: null,
    contractor_email: null,
    applicant_name: 'Crawford Estates',
    latitude: 49.8250,
    longitude: -119.4680,
    issue_date: '2026-09-14',
    trades: [TRADE_LOOKUP.concrete, TRADE_LOOKUP.drywall_framing, TRADE_LOOKUP.roofing, TRADE_LOOKUP.electrical]
  }
];

// 1. Merge into local JSON file
const municipalityId = '22222222-2222-2222-2222-222222222222';
const combined = [...existingPermits];

newSFDPermits.forEach((p, idx) => {
  const existingIdx = combined.findIndex(c => c.permit_number === p.permit_number);
  const fullPermit = {
    id: `permit-sfd-${idx + 1}`,
    municipality_id: municipalityId,
    legal_description: `Lot ${idx + 10} Plan EPP${70000 + idx} District DL 14 ODYD`,
    status: 'Issued',
    application_date: p.issue_date,
    ...p
  };
  if (existingIdx >= 0) {
    combined[existingIdx] = fullPermit;
  } else {
    combined.push(fullPermit);
  }
});

fs.writeFileSync(permitsFile, JSON.stringify(combined, null, 2), 'utf8');
console.log(`Updated permits.json: total ${combined.length} permits now in dataset.`);

// 2. Sync into live Supabase database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xqmdssiiexbqeyzmdeza.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function syncToSupabase() {
  console.log('Syncing 20 Single-Family Dwelling permits into Supabase...');

  const dbPermitRows = newSFDPermits.map(p => ({
    permit_number: p.permit_number,
    issue_date: p.issue_date,
    application_date: p.issue_date,
    address: p.address,
    city_region: p.city_region || 'Kelowna',
    legal_description: 'Lot DL 14 ODYD',
    permit_type: p.permit_type,
    work_class: p.work_class,
    description: p.description,
    ai_summary: p.ai_summary,
    estimated_value: p.estimated_value,
    contractor_name: p.contractor_name,
    contractor_phone: p.contractor_phone,
    contractor_email: p.contractor_email,
    applicant_name: p.applicant_name,
    status: 'Issued',
    latitude: p.latitude,
    longitude: p.longitude
  }));

  const { error: permitErr } = await supabase
    .from('permits')
    .upsert(dbPermitRows, { onConflict: 'permit_number' });

  if (permitErr) {
    console.error('Error syncing permits to Supabase:', permitErr);
    return;
  }

  // Get IDs to link trades
  const { data: insertedPermits } = await supabase
    .from('permits')
    .select('id, permit_number');

  const { data: dbTrades } = await supabase
    .from('subtrades')
    .select('id, slug');

  const permitMap = new Map((insertedPermits || []).map(p => [p.permit_number, p.id]));
  const tradeMap = new Map((dbTrades || []).map(t => [t.slug, t.id]));

  const relRows = [];
  newSFDPermits.forEach(p => {
    const permitId = permitMap.get(p.permit_number);
    if (!permitId) return;
    p.trades.forEach(t => {
      const tradeId = tradeMap.get(t.subtrade_key);
      if (tradeId) {
        relRows.push({
          permit_id: permitId,
          subtrade_id: tradeId,
          confidence_score: t.confidence || 0.9
        });
      }
    });
  });

  if (relRows.length > 0) {
    const { error: relErr } = await supabase
      .from('permit_subtrades')
      .upsert(relRows, { onConflict: 'permit_id,subtrade_id' });

    if (relErr) console.error('Error inserting permit_subtrades:', relErr);
    else console.log(`Linked ${relRows.length} subtrades for new SFD permits in Supabase.`);
  }

  const { count } = await supabase.from('permits').select('*', { count: 'exact', head: true });
  console.log(`Live Supabase permits count: ${count}`);
}

syncToSupabase().catch(console.error);
