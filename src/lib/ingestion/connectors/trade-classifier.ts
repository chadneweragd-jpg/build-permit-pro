import { MatchedTrade, WorkClass } from '@/types';
import { SUBTRADES_CATALOG } from '@/lib/trades-data';

export function classifyTradeOpportunities(description: string, subType: string = '', workClass: WorkClass = 'Commercial'): MatchedTrade[] {
  const text = `${description} ${subType} ${workClass}`.toLowerCase();
  const trades: MatchedTrade[] = [];

  const add = (key: keyof typeof SUBTRADES_CATALOG, terms: string[], score = 0.9) => {
    const def = SUBTRADES_CATALOG[key];
    if (def && !trades.some(t => t.subtrade_key === key)) {
      trades.push({
        subtrade_key: key,
        name: def.name,
        color: def.color,
        icon: def.icon,
        confidence: score,
        matched_terms: terms
      });
    }
  };

  if (/electr|wiring|panel|200a|400a|600v|lighting|generator|substation/.test(text)) {
    add('electrical', ['electrical']);
  }
  if (/plumb|hvac|heat pump|boiler|chiller|ductwork|ventilat|air conditioning|sprinkler|gas line/.test(text)) {
    add('hvac_plumbing', ['hvac', 'plumbing']);
  }
  if (/roof|shingle|metal roof|membrane|sbs|tpo|parapet|re-roof/.test(text)) {
    add('roofing', ['roofing']);
  }
  if (/drywall|gypsum|steel stud|partition|t-bar|acoustic ceiling|tenant improvement|fit-?out/.test(text)) {
    add('drywall_framing', ['drywall', 'framing']);
  }
  if (/overhead door|bay door|roll-?up door|dock leveler|garage door|storefront door/.test(text)) {
    add('commercial_doors', ['commercial doors']);
  }
  if (/glaz|curtain wall|storefront|aluminum window|thermal glass/.test(text)) {
    add('glazing', ['glazing']);
  }
  if (/concrete|foundation|slab|rebar|tilt-?up|footing/.test(text)) {
    add('concrete', ['concrete']);
  }
  if (/framing|wood frame|structural steel|mass timber|truss/.test(text)) {
    add('framing', ['framing']);
  }

  return trades;
}

export function generatePermitAiSummary(permitNumber: string, address: string, workClass: string, value: number, description: string, trades: MatchedTrade[]): string {
  const valStr = value ? `$${value.toLocaleString('en-CA')}` : 'undisclosed value';
  const tradeStr = trades.slice(0, 3).map(t => t.name).join(', ');
  if (tradeStr) {
    return `${workClass} permit (${permitNumber}) for ${address} (${valStr}). Scope includes ${description.toLowerCase().slice(0, 80)}. Key subtrade opportunities identified in ${tradeStr}.`;
  }
  return `${workClass} permit (${permitNumber}) for ${address} (${valStr}). Scope includes ${description.toLowerCase().slice(0, 100)}.`;
}
