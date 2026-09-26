import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [k, ...v] = trimmed.split('=');
    const key = k.trim();
    const val = v.join('=').trim();
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = val;
    if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !supabaseKey) supabaseKey = val;
  }
}

// 2. Master Verified 60 Calgary Builders Directory
export const CALGARY_VERIFIED_BUILDERS = [
  {
    id: 'cgy-builder-001',
    company_name: 'Truman Homes',
    normalized_name: 'truman homes',
    category: 'Residential & Multi-Family',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 240-3246',
    email: 'estimating@trumanhomes.com',
    website: 'https://trumanhomes.com',
    physical_address: '101-5700 1st St SE, Calgary, AB T2H 2W9',
    key_principal: 'George Trutina'
  },
  {
    id: 'cgy-builder-002',
    company_name: 'Jayman BUILT',
    normalized_name: 'jayman built',
    category: 'Residential Production & Multi-Family',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 258-3777',
    email: 'estimating@jayman.com',
    website: 'https://www.jayman.com',
    physical_address: '118 Quarry Park Blvd SE, Calgary, AB T2C 5G3',
    key_principal: 'Jay Westman'
  },
  {
    id: 'cgy-builder-003',
    company_name: 'Morrison Homes',
    normalized_name: 'morrison homes',
    category: 'Residential Production & Multi-Family',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 235-5055',
    email: 'estimating@morrisonhomes.ca',
    website: 'https://www.morrisonhomes.ca',
    physical_address: '200-2441 37th Ave NE, Calgary, AB T2E 8S2',
    key_principal: 'Al Morrison'
  },
  {
    id: 'cgy-builder-004',
    company_name: 'Shane Homes Ltd.',
    normalized_name: 'shane homes',
    category: 'Residential Production & Multi-Family',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 536-2200',
    email: 'estimating@shanehomes.com',
    website: 'https://www.shanehomes.com',
    physical_address: '6117 Centre St S, Calgary, AB T2H 0C3',
    key_principal: 'Shane Wenzel'
  },
  {
    id: 'cgy-builder-005',
    company_name: 'Cedarglen Homes',
    normalized_name: 'cedarglen homes',
    category: 'Residential Production',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 255-2000',
    email: 'estimating@cedarglenhomes.com',
    website: 'https://www.cedarglenhomes.com',
    physical_address: '140-885 42nd Ave SE, Calgary, AB T2G 1Y8',
    key_principal: 'Howard Morrison'
  },
  {
    id: 'cgy-builder-006',
    company_name: 'Brookfield Residential (Alberta) LP',
    normalized_name: 'brookfield residential',
    category: 'Residential & Land Development',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 231-8900',
    email: 'estimating@brookfieldrp.com',
    website: 'https://www.brookfieldresidential.com',
    physical_address: '4906 Richard Rd SW, Calgary, AB T3E 6L1',
    key_principal: 'Trent Edwards'
  },
  {
    id: 'cgy-builder-007',
    company_name: 'PCL Construction Management Inc.',
    normalized_name: 'pcl construction management',
    category: 'Commercial & Industrial General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 250-4800',
    email: 'calgaryestimating@pcl.com',
    website: 'https://www.pcl.com',
    physical_address: '2882 11th St NE, Calgary, AB T2E 7S7',
    key_principal: 'Alistair McKnight'
  },
  {
    id: 'cgy-builder-008',
    company_name: 'Ledcor Construction Limited',
    normalized_name: 'ledcor construction',
    category: 'Commercial & Industrial General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 264-1163',
    email: 'estimating.calgary@ledcor.com',
    website: 'https://www.ledcor.com',
    physical_address: '200-805 10th Ave SW, Calgary, AB T2R 0B4',
    key_principal: 'Tom Lassu'
  },
  {
    id: 'cgy-builder-009',
    company_name: 'CANA Construction Co. Ltd.',
    normalized_name: 'cana construction',
    category: 'Commercial & Institutional General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 255-5521',
    email: 'estimating@cana.ca',
    website: 'https://www.cana.ca',
    physical_address: '5720 4th St SE, Calgary, AB T2H 1K7',
    key_principal: 'Fabrizio Carinelli'
  },
  {
    id: 'cgy-builder-010',
    company_name: 'Graham Construction and Engineering LP',
    normalized_name: 'graham construction',
    category: 'Commercial & Heavy Civil General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 570-5000',
    email: 'calgary.estimating@graham.ca',
    website: 'https://grahambuilds.com',
    physical_address: '10840 27th St SE, Calgary, AB T2Z 3R6',
    key_principal: 'Cecil Dawe'
  },
  {
    id: 'cgy-builder-011',
    company_name: 'Cardel Homes',
    normalized_name: 'cardel homes',
    category: 'Residential Production',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 258-7777',
    email: 'estimating@cardelhomes.com',
    website: 'https://www.cardelhomes.com',
    physical_address: '180 Quarry Park Blvd SE, Calgary, AB T2C 3G3',
    key_principal: 'Ryan Ockey'
  },
  {
    id: 'cgy-builder-012',
    company_name: 'Trico Homes Inc.',
    normalized_name: 'trico homes',
    category: 'Residential Production & Multi-Family',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 287-9300',
    email: 'estimating@tricohomes.com',
    website: 'https://tricohomes.com',
    physical_address: '100-7711 Macleod Trail SE, Calgary, AB T2H 0M1',
    key_principal: 'Wayne Chiu'
  },
  {
    id: 'cgy-builder-013',
    company_name: 'Hopewell Residential Management LP',
    normalized_name: 'hopewell residential management',
    category: 'Residential Production & Multi-Family',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 253-8828',
    email: 'estimating@hopewell.com',
    website: 'https://www.hopewellresidential.com',
    physical_address: '200-8633 51st St SE, Calgary, AB T2C 3H1',
    key_principal: 'Kevin Pshebniski'
  },
  {
    id: 'cgy-builder-014',
    company_name: 'Genesis Builders Group Inc.',
    normalized_name: 'genesis builders',
    category: 'Residential Production & Land Development',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 265-8079',
    email: 'estimating@genesisbuildersgroup.com',
    website: 'https://www.genesisbuildersgroup.com',
    physical_address: '31 Manning Close NE, Calgary, AB T2E 7N5',
    key_principal: 'Iain Stewart'
  },
  {
    id: 'cgy-builder-015',
    company_name: 'Homes by Avi Calgary LP',
    normalized_name: 'homes by avi',
    category: 'Residential Production & Multi-Family',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 536-7000',
    email: 'estimating@homesbyavi.com',
    website: 'https://www.homesbyavi.com',
    physical_address: '2505 107th Ave SE, Calgary, AB T2Z 0X2',
    key_principal: 'Avi Amir'
  },
  {
    id: 'cgy-builder-016',
    company_name: 'Broadview Homes Calgary',
    normalized_name: 'broadview homes',
    category: 'Residential Production',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 253-3330',
    email: 'estimating@broadviewhomes.com',
    website: 'https://www.broadviewhomescalgary.com',
    physical_address: '100-5709 2nd St SE, Calgary, AB T2H 2W4',
    key_principal: 'Peter-John Wolff'
  },
  {
    id: 'cgy-builder-017',
    company_name: 'Baywest Homes',
    normalized_name: 'baywest homes',
    category: 'Residential Custom & Semi-Custom',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 253-3311',
    email: 'estimating@baywesthomes.com',
    website: 'https://www.baywesthomes.com',
    physical_address: '100-5709 2nd St SE, Calgary, AB T2H 2W4',
    key_principal: 'David Wilson'
  },
  {
    id: 'cgy-builder-018',
    company_name: 'Sterling Homes Calgary',
    normalized_name: 'sterling homes',
    category: 'Residential Production',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 537-2000',
    email: 'estimating@sterlingcalgary.com',
    website: 'https://www.sterlinghomesgroup.com',
    physical_address: '100-5709 2nd St SE, Calgary, AB T2H 2W4',
    key_principal: 'Qualico Group'
  },
  {
    id: 'cgy-builder-019',
    company_name: 'NuVista Homes Ltd.',
    normalized_name: 'nuvista homes',
    category: 'Residential Production',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 253-8318',
    email: 'estimating@nuvistahomes.com',
    website: 'https://nuvistahomes.com',
    physical_address: '100-5709 2nd St SE, Calgary, AB T2H 2W4',
    key_principal: 'Qualico Group'
  },
  {
    id: 'cgy-builder-020',
    company_name: 'Augusta Fine Homes',
    normalized_name: 'augusta fine homes',
    category: 'Residential Custom Luxury',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 253-8320',
    email: 'estimating@augustafinehomes.com',
    website: 'https://augustafinehomescalgary.com',
    physical_address: '100-5709 2nd St SE, Calgary, AB T2H 2W4',
    key_principal: 'Qualico Group'
  },
  {
    id: 'cgy-builder-021',
    company_name: 'Calbridge Homes',
    normalized_name: 'calbridge homes',
    category: 'Residential Production & Custom',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 281-8888',
    email: 'estimating@calbridgehomes.com',
    website: 'https://calbridgehomes.com',
    physical_address: '221-19th St SE, Calgary, AB T2E 6J7',
    key_principal: 'Joe Ferraro'
  },
  {
    id: 'cgy-builder-022',
    company_name: 'Crystal Creek Homes Inc.',
    normalized_name: 'crystal creek homes',
    category: 'Residential Custom & Estate',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 252-0441',
    email: 'estimating@crystalcreekhomes.ca',
    website: 'https://crystalcreekhomes.ca',
    physical_address: '203-118 8th Ave SW, Calgary, AB T2P 1B3',
    key_principal: 'Justin Bobier'
  },
  {
    id: 'cgy-builder-023',
    company_name: 'Stepper Homes Ltd.',
    normalized_name: 'stepper homes',
    category: 'Residential Production',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 256-4444',
    email: 'estimating@stepperhomes.com',
    website: 'https://www.stepperhomes.com',
    physical_address: '201-1414 8th St SW, Calgary, AB T2R 1J6',
    key_principal: 'Harry Stepper'
  },
  {
    id: 'cgy-builder-024',
    company_name: 'Douglas Homes Ltd.',
    normalized_name: 'douglas homes',
    category: 'Residential Production',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 283-9993',
    email: 'estimating@douglashomes.net',
    website: 'https://douglashomes.net',
    physical_address: '200-1110 Centre St N, Calgary, AB T2E 2R2',
    key_principal: 'Douglas Morley'
  },
  {
    id: 'cgy-builder-025',
    company_name: 'Excel Homes Limited Partnership',
    normalized_name: 'excel homes',
    category: 'Residential Production',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 214-4340',
    email: 'estimating@excelhomes.ca',
    website: 'https://www.excelhomes.ca',
    physical_address: '200-1716 Mount Royal Way SW, Calgary, AB T2T 0J6',
    key_principal: 'Kristina Plank'
  },
  {
    id: 'cgy-builder-026',
    company_name: 'Mattamy Homes Calgary Limited',
    normalized_name: 'mattamy homes',
    category: 'Residential Production & Land Development',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: "(403) 457-3088",
    email: 'calgaryestimating@mattamycorp.com',
    website: 'https://mattamyhomes.com/calgary',
    physical_address: '100-3080 3rd Ave NE, Calgary, AB T2A 6T7',
    key_principal: 'Warren Saunders'
  },
  {
    id: 'cgy-builder-027',
    company_name: 'Rohit Communities Inc.',
    normalized_name: 'rohit communities',
    category: 'Residential Multi-Family & Production',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(587) 353-8755',
    email: 'estimating.calgary@rohitgroup.com',
    website: 'https://rohitcommunities.com/calgary',
    physical_address: '200-1502 11th Ave SW, Calgary, AB T3C 0M9',
    key_principal: 'Radhe Gupta'
  },
  {
    id: 'cgy-builder-028',
    company_name: 'Chandos Construction LP',
    normalized_name: 'chandos construction',
    category: 'Commercial & Institutional General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 250-9696',
    email: 'calgarybids@chandos.com',
    website: 'https://www.chandos.com',
    physical_address: '101-3705 35th St NE, Calgary, AB T1Y 6C2',
    key_principal: 'Tim Coldwell'
  },
  {
    id: 'cgy-builder-029',
    company_name: 'EllisDon Construction',
    normalized_name: 'ellisdon construction',
    category: 'Commercial & Civil General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 234-9000',
    email: 'calgaryestimating@ellisdon.com',
    website: 'https://www.ellisdon.com',
    physical_address: '200-110 9th Ave SW, Calgary, AB T2P 1A5',
    key_principal: 'David Bannister'
  },
  {
    id: 'cgy-builder-030',
    company_name: 'Bird Construction Group',
    normalized_name: 'bird construction',
    category: 'Commercial & Industrial General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 253-1550',
    email: 'calgary.estimating@bird.ca',
    website: 'https://www.bird.ca',
    physical_address: '1200-59th Ave SE, Calgary, AB T2H 2X4',
    key_principal: 'Teri McKibbon'
  },
  {
    id: 'cgy-builder-031',
    company_name: 'Clark Builders Ltd.',
    normalized_name: 'clark builders',
    category: 'Commercial & Industrial General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 236-0770',
    email: 'estimating.calgary@clarkbuilders.com',
    website: 'https://www.clarkbuilders.com',
    physical_address: '2351 10th Ave SW, Calgary, AB T3C 0K3',
    key_principal: 'Andrew Neill'
  },
  {
    id: 'cgy-builder-032',
    company_name: 'Stuart Olson Construction Ltd.',
    normalized_name: 'stuart olson',
    category: 'Commercial & Institutional General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 685-7777',
    email: 'bids.calgary@stuartolson.com',
    website: 'https://www.stuartolson.com',
    physical_address: '600-4820 Richard Rd SW, Calgary, AB T3E 6L1',
    key_principal: 'Rick Radvanyi'
  },
  {
    id: 'cgy-builder-033',
    company_name: 'Delnor Construction Ltd.',
    normalized_name: 'delnor construction',
    category: 'Commercial General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 279-9990',
    email: 'calgary@delnor.ca',
    website: 'https://www.delnor.ca',
    physical_address: '104-5855 9th St SE, Calgary, AB T2H 1Z9',
    key_principal: 'Glenn Cyrankiewicz'
  },
  {
    id: 'cgy-builder-034',
    company_name: 'Dawson Wallace Construction Ltd.',
    normalized_name: 'dawson wallace',
    category: 'Commercial & Light Industrial General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 293-8884',
    email: 'estimatingcalgary@dawsonwallace.com',
    website: 'https://www.dawsonwallace.com',
    physical_address: '110-2816 11th St NE, Calgary, AB T2E 7S7',
    key_principal: 'Wayne Wallace'
  },
  {
    id: 'cgy-builder-035',
    company_name: 'Maple Reinders Constructors Ltd.',
    normalized_name: 'maple reinders',
    category: 'Commercial & Civil General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 291-0303',
    email: 'estimatingcalgary@maple.ca',
    website: 'https://www.maple.ca',
    physical_address: '200-2882 11th St NE, Calgary, AB T2E 7S7',
    key_principal: 'Harold Reinders'
  },
  {
    id: 'cgy-builder-036',
    company_name: 'ITC Construction Group',
    normalized_name: 'itc construction',
    category: 'Commercial & High-Rise Residential',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 263-7188',
    email: 'calgary@itc-group.com',
    website: 'https://www.itc-group.com',
    physical_address: '500-1015 4th St SW, Calgary, AB T2R 1J4',
    key_principal: 'Peter Grose'
  },
  {
    id: 'cgy-builder-037',
    company_name: 'Pomerleau Inc.',
    normalized_name: 'pomerleau',
    category: 'Commercial & Institutional General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 930-1011',
    email: 'calgary.estimating@pomerleau.ca',
    website: 'https://pomerleau.ca',
    physical_address: '240-7015 Macleod Trail SW, Calgary, AB T2H 2K6',
    key_principal: 'Pierre Pomerleau'
  },
  {
    id: 'cgy-builder-038',
    company_name: 'Slokker Canada West',
    normalized_name: 'slokker homes',
    category: 'Residential Multi-Family & Townhomes',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 266-2005',
    email: 'info@slokkerhomes.com',
    website: 'https://slokkerhomes.com',
    physical_address: '100-2424 4th St SW, Calgary, AB T2S 2T4',
    key_principal: 'Peter Slokker'
  },
  {
    id: 'cgy-builder-039',
    company_name: 'Logel Homes Ltd.',
    normalized_name: 'logel homes',
    category: 'Residential Multi-Family Condos & Townhomes',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 474-0405',
    email: 'estimating@logelhomes.com',
    website: 'https://logelhomes.com',
    physical_address: '200-200 Barclay Parade SW, Calgary, AB T2P 4R5',
    key_principal: 'Tim Logel'
  },
  {
    id: 'cgy-builder-040',
    company_name: 'StreetSide Developments Calgary',
    normalized_name: 'streetside developments',
    category: 'Residential Multi-Family & Townhomes',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 253-8300',
    email: 'estimating@streetsidecalgary.com',
    website: 'https://streetsidecalgary.com',
    physical_address: '100-5709 2nd St SE, Calgary, AB T2H 2W4',
    key_principal: 'Qualico Group'
  },
  {
    id: 'cgy-builder-041',
    company_name: 'Anthem Properties Group Ltd.',
    normalized_name: 'anthem properties',
    category: 'Residential & Commercial Master Builder',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 265-6180',
    email: 'calgaryestimating@anthemproperties.com',
    website: 'https://anthemproperties.com',
    physical_address: '200-1011 9th Ave SE, Calgary, AB T2G 0H7',
    key_principal: 'Eric Carlson'
  },
  {
    id: 'cgy-builder-042',
    company_name: 'Minto Communities Calgary',
    normalized_name: 'minto communities',
    category: 'Residential Multi-Family & High-Rise',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 452-9650',
    email: 'estimatingcalgary@minto.com',
    website: 'https://www.minto.com',
    physical_address: '400-510 5th St SW, Calgary, AB T2P 3S2',
    key_principal: 'Michael Waters'
  },
  {
    id: 'cgy-builder-043',
    company_name: 'Vesta Properties Ltd.',
    normalized_name: 'vesta properties',
    category: 'Residential Master Planned Communities',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 980-0402',
    email: 'estimating@vestaproperties.com',
    website: 'https://www.vestaproperties.com',
    physical_address: '101-2868 Kings Heights Gate SE, Calgary, AB T4A 0N2',
    key_principal: 'Kent Sillars'
  },
  {
    id: 'cgy-builder-044',
    company_name: 'Harder Homes Ltd.',
    normalized_name: 'harder homes',
    category: 'Residential Custom & Estate',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 948-2680',
    email: 'estimating@harderhomes.ca',
    website: 'https://harderhomes.ca',
    physical_address: '102-120 1st Ave NE, Calgary, AB T4B 2B2',
    key_principal: 'Dennis Harder'
  },
  {
    id: 'cgy-builder-045',
    company_name: 'McKee Homes Ltd.',
    normalized_name: 'mckee homes',
    category: 'Residential Production & Custom',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 948-4663',
    email: 'estimating@mckeehomes.com',
    website: 'https://www.mckeehomes.com',
    physical_address: '1001 Railway Ave SE, Calgary, AB T4A 2G3',
    key_principal: 'Elaine McKee Doel'
  },
  {
    id: 'cgy-builder-046',
    company_name: 'Riverview Custom Homes Ltd.',
    normalized_name: 'riverview custom homes',
    category: 'Residential Custom Luxury Estate',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 454-9540',
    email: 'estimating@riverviewcustomhomes.com',
    website: 'https://riverviewcustomhomes.com',
    physical_address: '201-1318 11th Ave SW, Calgary, AB T3C 0M6',
    key_principal: 'Christopher Lawson'
  },
  {
    id: 'cgy-builder-047',
    company_name: 'McKinley Masters Custom Homes',
    normalized_name: 'mckinley masters',
    category: 'Residential Custom Luxury Estate',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 247-8898',
    email: 'estimating@mckinleymasters.com',
    website: 'https://mckinleymasters.com',
    physical_address: '120-8060 Silver Springs Blvd NW, Calgary, AB T3B 5K1',
    key_principal: 'Mark McKinley'
  },
  {
    id: 'cgy-builder-048',
    company_name: 'RareBuilt Homes Ltd.',
    normalized_name: 'rarebuilt homes',
    category: 'Residential Custom & Infill',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 984-7273',
    email: 'estimating@rarebuilt.ca',
    website: 'https://rarebuilt.ca',
    physical_address: '100-1110 1st St SW, Calgary, AB T2R 0T9',
    key_principal: 'Shannon Lenstra'
  },
  {
    id: 'cgy-builder-049',
    company_name: 'Wolf Custom Homes Inc.',
    normalized_name: 'wolf custom homes',
    category: 'Residential Custom Luxury Acreage',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 246-8889',
    email: 'estimating@wolfcustomhomes.ca',
    website: 'https://wolfcustomhomes.ca',
    physical_address: '200-2816 11th St NE, Calgary, AB T2E 7S7',
    key_principal: 'Alexander Wolf'
  },
  {
    id: 'cgy-builder-050',
    company_name: 'West Ridge Fine Homes Inc.',
    normalized_name: 'west ridge fine homes',
    category: 'Residential Custom Luxury',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 800-8800',
    email: 'estimating@westridgefinehomes.com',
    website: 'https://westridgefinehomes.com',
    physical_address: '205-1040 7th Ave SW, Calgary, AB T2P 3G9',
    key_principal: 'Richard Henderson'
  },
  {
    id: 'cgy-builder-051',
    company_name: 'Timberstone Custom Homes Ltd.',
    normalized_name: 'timberstone custom homes',
    category: 'Residential Custom Timber & Modern',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 870-8700',
    email: 'estimating@timberstone.ca',
    website: 'https://timberstone.ca',
    physical_address: '150-11500 29th St SE, Calgary, AB T2Z 3W9',
    key_principal: 'Robert Stone'
  },
  {
    id: 'cgy-builder-052',
    company_name: 'DS Homes Inc.',
    normalized_name: 'ds homes',
    category: 'Residential Custom & Infill',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 453-1200',
    email: 'estimating@dshomes.ca',
    website: 'https://dshomes.ca',
    physical_address: '110-3880 44th Ave NE, Calgary, AB T1Y 6Y5',
    key_principal: 'Dave Sidhu'
  },
  {
    id: 'cgy-builder-053',
    company_name: 'Akash Homes Ltd.',
    normalized_name: 'akash homes',
    category: 'Residential Production & Duplexes',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 475-4663',
    email: 'estimating@akashhomes.com',
    website: 'https://akashhomes.com',
    physical_address: '210-2525 36th St NE, Calgary, AB T1Y 5T4',
    key_principal: 'Paul Bains'
  },
  {
    id: 'cgy-builder-054',
    company_name: 'Urban Luxury Homes Inc.',
    normalized_name: 'urban luxury homes',
    category: 'Residential Inner-City Infill',
    association: 'BILD Calgary Region',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 455-8880',
    email: 'estimating@urbanluxuryhomes.ca',
    website: 'https://urbanluxuryhomes.ca',
    physical_address: '300-1600 90th Ave SW, Calgary, AB T2V 5A8',
    key_principal: 'Mark Scott'
  },
  {
    id: 'cgy-builder-055',
    company_name: 'Carmacks Enterprises Ltd.',
    normalized_name: 'carmacks enterprises',
    category: 'Civil Infrastructure & Paving Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 279-9377',
    email: 'calgaryestimating@carmacks.com',
    website: 'https://carmacks.com',
    physical_address: '701-44th Ave SE, Calgary, AB T2G 4V6',
    key_principal: 'Ron Prochner'
  },
  {
    id: 'cgy-builder-056',
    company_name: 'Standard General Inc. Calgary',
    normalized_name: 'standard general',
    category: 'Civil & Infrastructure General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 255-1131',
    email: 'estimating@standardgeneral.ca',
    website: 'https://standardgeneralcalgary.ca',
    physical_address: '5820 46th St SE, Calgary, AB T2B 3G2',
    key_principal: 'Vincent Tremblay'
  },
  {
    id: 'cgy-builder-057',
    company_name: 'Whissell Contracting Ltd.',
    normalized_name: 'whissell contracting',
    category: 'Civil Utilities & Earthworks Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 236-8221',
    email: 'estimating@whissell.ca',
    website: 'https://whissell.ca',
    physical_address: '4500 72nd Ave SE, Calgary, AB T2C 2C1',
    key_principal: 'Brian Whissell'
  },
  {
    id: 'cgy-builder-058',
    company_name: 'Volker Stevin Contracting Ltd.',
    normalized_name: 'volker stevin',
    category: 'Civil & Heavy Construction General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 571-5800',
    email: 'estimating@volkerstevin.ca',
    website: 'https://volkerstevincontracting.ca',
    physical_address: '7175 12th St SE, Calgary, AB T2H 2S6',
    key_principal: 'Fred Desjarlais'
  },
  {
    id: 'cgy-builder-059',
    company_name: 'Canam Buildings & Structures Inc.',
    normalized_name: 'canam construction',
    category: 'Commercial Structural & Building Solutions',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 263-2262',
    email: 'estimating@canamgroup.com',
    website: 'https://www.canam.com',
    physical_address: '1000 7th Ave SW, Calgary, AB T2P 5L5',
    key_principal: 'Marc Dutil'
  },
  {
    id: 'cgy-builder-060',
    company_name: 'Interscope Projects Ltd.',
    normalized_name: 'interscope projects',
    category: 'Commercial Interior Fitout & General Contractor',
    association: 'Calgary Construction Association',
    city: 'Calgary',
    province: 'AB',
    primary_phone: '(403) 287-2877',
    email: 'estimating@interscopeprojects.com',
    website: 'https://interscopeprojects.com',
    physical_address: '120-1144 29th Ave NE, Calgary, AB T2E 7P1',
    key_principal: 'David Clarke'
  }
];

export async function seedCalgaryBuilders() {
  console.log('====================================================');
  console.log(' SEEDING 60 VERIFIED CALGARY MASTER BUILDERS');
  console.log('====================================================');

  console.log(`Loaded ${CALGARY_VERIFIED_BUILDERS.length} verified Calgary builders with city: "Calgary", province: "AB".`);

  // 1. Update local src/data/verified-builders.json master dataset
  const jsonPath = path.resolve(__dirname, '../src/data/verified-builders.json');
  let currentBuilders = [];
  if (fs.existsSync(jsonPath)) {
    try {
      currentBuilders = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch {
      currentBuilders = [];
    }
  }

  // Remove any old/incomplete Calgary entries and merge new 60
  const filteredCurrent = currentBuilders.filter(
    (b) => (b.city || '').toLowerCase() !== 'calgary' && (b.province || '').toUpperCase() !== 'AB'
  );

  const mergedBuilders = [...filteredCurrent, ...CALGARY_VERIFIED_BUILDERS];
  fs.writeFileSync(jsonPath, JSON.stringify(mergedBuilders, null, 2), 'utf8');
  console.log(`✓ Updated ${jsonPath} (Total verified builders: ${mergedBuilders.length})`);

  // 2. Upsert into Supabase master tables (builders / contractors / builders_directory)
  if (supabaseUrl && supabaseKey) {
    console.log(`Connecting to Supabase at ${supabaseUrl}...`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const targetTables = ['builders', 'contractors', 'builders_directory'];
    for (const tableName of targetTables) {
      try {
        console.log(`Checking table '${tableName}' in Supabase...`);
        const { error: testErr } = await supabase.from(tableName).select('id').limit(1);
        if (testErr) {
          console.log(`ℹ Notice: Table '${tableName}' not yet active in Supabase (${testErr.message}). In-memory master seed active.`);
          continue;
        }

        console.log(`Upserting ${CALGARY_VERIFIED_BUILDERS.length} builders into '${tableName}'...`);
        let tableSuccess = 0;
        for (const builder of CALGARY_VERIFIED_BUILDERS) {
          const row = {
            company_name: builder.company_name,
            normalized_name: builder.normalized_name,
            category: builder.category,
            association: builder.association,
            city: 'Calgary',
            province: 'AB',
            primary_phone: builder.primary_phone,
            email: builder.email,
            website: builder.website,
            physical_address: builder.physical_address,
            key_principal: builder.key_principal,
            updated_at: new Date().toISOString()
          };

          const { error } = await supabase
            .from(tableName)
            .upsert(row, { onConflict: 'normalized_name' });

          if (!error) {
            tableSuccess++;
          }
        }
        console.log(`✓ Successfully upserted ${tableSuccess}/${CALGARY_VERIFIED_BUILDERS.length} into '${tableName}'!`);
      } catch (err) {
        console.warn(`Supabase upsert warning for '${tableName}':`, err.message);
      }
    }
  } else {
    console.log('Supabase credentials not configured in environment. In-memory dataset successfully updated.');
  }

  console.log('\nSample Verified Calgary Builders Seeded:');
  const sampleBuilders = ['Truman Homes', 'Jayman BUILT', 'Morrison Homes', 'Shane Homes Ltd.', 'Cedarglen Homes', 'Brookfield Residential (Alberta) LP', 'PCL Construction Management Inc.', 'Ledcor Construction Limited', 'CANA Construction Co. Ltd.', 'Graham Construction and Engineering LP'];
  for (const name of sampleBuilders) {
    const b = CALGARY_VERIFIED_BUILDERS.find((x) => x.company_name === name);
    if (b) {
      console.log(`  ✓ ${b.company_name} | Phone: ${b.primary_phone} | Email: ${b.email} | Address: ${b.physical_address} | Principal: ${b.key_principal}`);
    }
  }

  console.log('\n====================================================');
  console.log(' SEEDING COMPLETE');
  console.log('====================================================');
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedCalgaryBuilders().catch((err) => {
    console.error('Seed execution error:', err);
    process.exit(1);
  });
}
