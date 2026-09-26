import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const permits = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/permits.json'), 'utf8'));

console.log(`Auditing ${permits.length} total permits across all 17 municipal markets...\n`);

let violations = 0;
let garageCount = 0;
let sfdCount = 0;
let resAdditionCount = 0;
let tradeCount = 0;

for (const p of permits) {
  const sub = (p.sub_type || p.permit_type || '').toLowerCase().trim();
  const desc = (p.description || '').toLowerCase().trim();
  const text = `${sub} ${desc}`;
  const val = p.value || p.estimated_value || 0;

  // 1. Signs
  const isSign =
    /\b(sign|fascia|fascia sign|freestanding sign|free standing sign|billboard|awning|canopy|pylon)\b/i.test(sub) ||
    (/\b(sign|fascia sign|freestanding sign|billboard)\b/i.test(text) && !/building|renovation|dwelling|house/i.test(sub));
  if (isSign) {
    continue;
  }

  // 2. Trade Permits (Plumbing, HVAC, Electrical)
  const isTrade =
    /^(plumbing|drain|mechanical|hvac|boiler|furnace|sewer|water service|pipe|piping|electrical|wiring|low voltage|gas|gas fitting|fire alarm|sprinkler)|\b(plumbing\(ps\)|mechanical\(ms\)|drain and site|plumbing permit|electrical permit|gas permit)\b/i.test(sub) ||
    ((/^(plumbing|mechanical|electrical|trade)/i.test(sub) || /plumbing permit|mechanical permit|electrical permit|hvac permit/i.test(desc)) && !/building|renovation|addition|dwelling|house|sfd/i.test(sub));

  if (isTrade) {
    tradeCount++;
    if (val >= 50000) {
      console.error(`[VIOLATION] Trade permit not strictly under $50k: ${p.city_slug} ${p.permit_number} "${p.sub_type}" -> $${val.toLocaleString()}`);
      violations++;
    }
    continue;
  }

  // 3. Demolition
  const isDemolition = /\b(demolition|demo|deconstruction)\b/i.test(sub);
  if (isDemolition) {
    continue;
  }

  // 4. Detached Garages / Sheds / Accessory Buildings
  const isAccessorySubType =
    /\b(detached garage|carport|shed|deck|porch|fence|gazebo|pergola|patio|cabana|pool|hot tub|spa|swimming pool|retaining wall|accessory building|accessory structure|outbuilding|storage bldg|misc\.?\s*structure|other structure)\b/i.test(sub) ||
    (/garage/i.test(sub) && !/sfd|single family|dwelling|condo|apartment|house/i.test(sub));

  const isAccessoryWork =
    isAccessorySubType ||
    (/\b(construct detached garage|build shed|detached garage|build deck|install pool|build carport)\b/i.test(desc) && !/new house|new dwelling|single family dwelling|sfd/i.test(desc));

  if (isAccessoryWork) {
    garageCount++;
    if (val < 15000 || val > 90000) {
      console.error(`[VIOLATION] Accessory structure out of bounds ($15k-$90k): ${p.city_slug} ${p.permit_number} "${p.sub_type}" -> $${val.toLocaleString()}`);
      violations++;
    }
    continue;
  }

  // 5. Residential Additions / Renovations
  const isResidentialContext =
    /residential|housing|house|sfd|single family|duplex|semi-detached|townhouse|home|basement|dwelling/i.test(text) &&
    !/commercial|office|retail|industrial|store|warehouse|tower|high-rise|multi-residential|apartments/i.test(sub);

  const isResAdditionOrReno =
    isResidentialContext &&
    (/\b(addition|alteration|alter|renovation|develop lower level|basement|interior alteration|exterior alteration|structural alteration|repair|retrofit|remodel|residential improvements|small residential projects|secondary suite|sdu)\b/i.test(sub) ||
     /\b(develop lower level|structural alteration|construct addition|alter exterior|alter interior|basement suite|secondary suite)\b/i.test(desc)) &&
    !/\b(construct new|new house|new dwelling|new single family)\b/i.test(text);

  if (isResAdditionOrReno) {
    resAdditionCount++;
    if (val < 25000 || val > 150000) {
      console.error(`[VIOLATION] Residential addition/reno out of bounds ($25k-$150k): ${p.city_slug} ${p.permit_number} "${p.sub_type}" -> $${val.toLocaleString()}`);
      violations++;
    }
    continue;
  }

  // 6. Single-Family Dwellings
  const isSFD =
    /\b(single family|sfd|single detached|detached dwelling|new house|new houses|new residential|dwelling unit|duplex|side by side|semi-detached|row house|row housing|townhouse|laneway)\b/i.test(text) &&
    !isAccessoryWork &&
    !isResAdditionOrReno &&
    !isDemolition &&
    !isTrade;

  if (isSFD) {
    sfdCount++;
    if (val < 350000 || val > 1250000) {
      console.error(`[VIOLATION] SFD out of bounds ($350k-$1.25M): ${p.city_slug} ${p.permit_number} "${p.sub_type}" -> $${val.toLocaleString()}`);
      violations++;
    }
    continue;
  }
}

console.log('--- Valuation Audit Summary ---');
console.log(`Detached Garages / Accessory Structures checked: ${garageCount}`);
console.log(`Single-Family Dwellings checked: ${sfdCount}`);
console.log(`Residential Additions / Renovations checked: ${resAdditionCount}`);
console.log(`Trade Permits checked: ${tradeCount}`);
console.log(`Total Violations: ${violations}`);

// Winnipeg specific spot check
const winnipegGarages = permits.filter(p => p.city_slug === 'winnipeg' && /detached garage/i.test(p.sub_type));
console.log(`\nWinnipeg 'Detached Garage' permits found: ${winnipegGarages.length}`);
winnipegGarages.slice(0, 5).forEach(g => {
  console.log(`  - ${g.permit_number}: ${g.address} | $${g.value.toLocaleString()} CAD`);
});

if (violations === 0) {
  console.log('\n✅ ALL AUDIT ROUTINES PASSED WITH ZERO VIOLATIONS.');
} else {
  process.exit(1);
}
