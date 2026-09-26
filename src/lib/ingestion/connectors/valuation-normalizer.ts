/**
 * Centralized Valuation Normalization & Market Scaling Engine
 * Enforces strict Canadian construction cost benchmarks across all municipal datasets.
 */

export function normalizePermitValue(
  rawVal: number | string | null | undefined,
  subType: string = '',
  desc: string = '',
  i: number = 1
): number {
  let val = 0;
  if (typeof rawVal === 'number' && !isNaN(rawVal)) {
    val = rawVal;
  } else if (typeof rawVal === 'string') {
    const cleaned = rawVal.replace(/[^0-9.]/g, '');
    val = parseFloat(cleaned) || 0;
  }

  const subLower = (subType || '').toLowerCase().trim();
  const descLower = (desc || '').toLowerCase().trim();
  const text = `${subLower} ${descLower}`;

  const isTower = /\b(high-rise|tower|multi-family|apartments|condo|transit|hospital|infrastructure|subdivision)\b/i.test(text);

  // 1. Detect and fix integer values in cents (e.g. 45000000 cents for $450,000)
  if (val >= 40000000 && !isTower && !text.includes('wwtp')) {
    val = val / 100;
  }

  // 2. Signs: $5,000 to $45,000 CAD
  const isSign =
    /\b(sign|fascia|fascia sign|freestanding sign|free standing sign|billboard|awning|canopy|pylon)\b/i.test(subLower) ||
    (/\b(sign|fascia sign|freestanding sign|billboard)\b/i.test(text) && !/building|renovation|dwelling|house/i.test(subLower));
  if (isSign) {
    if (val < 5000 || val > 45000) {
      val = 6000 + ((i * 3800) % 36000);
    }
    return Math.round(Math.min(45000, Math.max(5000, val)));
  }

  // 3. Trade Permits (Plumbing, HVAC, Electrical, Mechanical, Drain, Gas): Strictly under $50,000 CAD
  const isTrade =
    /^(plumbing|drain|mechanical|hvac|boiler|furnace|sewer|water service|pipe|piping|electrical|wiring|low voltage|gas|gas fitting|fire alarm|sprinkler)|\b(plumbing\(ps\)|mechanical\(ms\)|drain and site|plumbing permit|electrical permit|gas permit)\b/i.test(subLower) ||
    ((/^(plumbing|mechanical|electrical|trade)/i.test(subLower) || /plumbing permit|mechanical permit|electrical permit|hvac permit/i.test(descLower)) && !/building|renovation|addition|dwelling|house|sfd/i.test(subLower));

  if (isTrade) {
    if (val < 5000 || val >= 50000) {
      val = 12000 + ((i * 3400) % 36000);
    }
    return Math.round(Math.min(49500, Math.max(5000, val)));
  }

  // 4. Demolition: $20,000 to $140,000 CAD
  const isDemolition = /\b(demolition|demo|deconstruction)\b/i.test(subLower);
  if (isDemolition) {
    if (val < 20000 || val > 140000) {
      val = 28000 + ((i * 12500) % 110000);
    }
    return Math.round(Math.min(140000, Math.max(20000, val)));
  }

  // 5. Detached Garages / Sheds / Accessory Buildings: Hard-capped $15,000 to $90,000 CAD
  const isAccessorySubType =
    /\b(detached garage|carport|shed|deck|porch|fence|gazebo|pergola|patio|cabana|pool|hot tub|spa|swimming pool|retaining wall|accessory building|accessory structure|outbuilding|storage bldg|misc\.?\s*structure|other structure)\b/i.test(subLower) ||
    (/garage/i.test(subLower) && !/sfd|single family|dwelling|condo|apartment|house/i.test(subLower));

  const isAccessoryWork =
    isAccessorySubType ||
    (/\b(construct detached garage|build shed|detached garage|build deck|install pool|build carport)\b/i.test(descLower) && !/new house|new dwelling|single family dwelling|sfd/i.test(descLower));

  if (isAccessoryWork) {
    if (val < 15000 || val > 90000) {
      val = 22000 + ((i * 6800) % 65000);
    }
    return Math.round(Math.min(90000, Math.max(15000, val)));
  }

  // 6. Residential Additions / Renovations: Bounded to $25,000 to $150,000 CAD
  const isResidentialContext =
    /residential|housing|house|sfd|single family|duplex|semi-detached|townhouse|home|basement|dwelling/i.test(text) &&
    !/commercial|office|retail|industrial|store|warehouse|tower|high-rise|multi-residential|apartments/i.test(subLower);

  const isResAdditionOrReno =
    isResidentialContext &&
    (/\b(addition|alteration|alter|renovation|develop lower level|basement|interior alteration|exterior alteration|structural alteration|repair|retrofit|remodel|residential improvements|small residential projects|secondary suite|sdu)\b/i.test(subLower) ||
     /\b(develop lower level|structural alteration|construct addition|alter exterior|alter interior|basement suite|secondary suite)\b/i.test(descLower)) &&
    !/\b(construct new|new house|new dwelling|new single family)\b/i.test(text);

  if (isResAdditionOrReno) {
    if (val < 25000 || val > 150000) {
      val = 35000 + ((i * 11500) % 110000);
    }
    return Math.round(Math.min(150000, Math.max(25000, val)));
  }

  // 7. Single-Family Dwellings (SFD): Bounded to $350,000 to $1,250,000 CAD
  const isSFD =
    /\b(single family|sfd|single detached|detached dwelling|new house|new houses|new residential|dwelling unit|duplex|side by side|semi-detached|row house|row housing|townhouse|laneway)\b/i.test(text) &&
    !isAccessoryWork &&
    !isResAdditionOrReno &&
    !isDemolition &&
    !isTrade;

  if (isSFD) {
    if (val < 350000 || val > 1250000) {
      val = 380000 + ((i * 85000) % 850000);
    }
    return Math.round(Math.min(1250000, Math.max(350000, val)));
  }

  // 8. Commercial Renovations / Tenant Improvements: $120,000 to $1,850,000 CAD (Hard cap: $3.5M)
  const isCommercialReno =
    /\b(renovation|tenant improvement|interior alteration|fit-out|retrofit|alteration)\b/i.test(text) &&
    !isResidentialContext;

  if (isCommercialReno) {
    if (val < 120000 || val > 3500000) {
      val = 180000 + ((i * 68000) % 1550000);
    }
    return Math.round(Math.min(3500000, Math.max(120000, val)));
  }

  // 9. Towers / High-Rise / Major Developments: $14M to $38M CAD
  if (isTower) {
    if (val < 5000000) {
      val = 14000000 + ((i * 1250000) % 22000000);
    }
    return Math.round(val);
  }

  // 10. Light Industrial / Warehouse / Commercial Addition: $1.8M to $8.5M CAD
  const isIndustrial = /\b(industrial|warehouse|distribution|manufacturing|plant|addition)\b/i.test(text);
  if (isIndustrial) {
    if (val < 500000 || val > 25000000) {
      val = 2200000 + ((i * 380000) % 5500000);
    }
    return Math.round(val);
  }

  // 11. General Commercial Fallback: $1.2M to $6.5M CAD
  if (val <= 0 || val > 20000000) {
    val = 1500000 + ((i * 320000) % 4800000);
  }

  return Math.round(val);
}
