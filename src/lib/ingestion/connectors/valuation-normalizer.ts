/**
 * Valuation Normalization Engine.
 *
 * IMPORTANT (audit fix, 2026-10-02): this function previously replaced any value it judged
 * "implausible" for its detected permit category with a deterministic pseudo-random number
 * derived from the row index (e.g. `val = 6000 + ((i * 3800) % 36000)`). That fabricated
 * fictional valuations on top of real municipal records whenever the genuine parsed value
 * was zero, missing, or simply fell outside an arbitrary band -- which is exactly the kind of
 * data fabrication this audit was asked to eliminate. It has been rewritten to ONLY do honest,
 * reversible unit normalization:
 *   1. Parse the raw value with parseFloat (never truncate/round to a different magnitude).
 *   2. Correct the one genuine, well-known encoding bug where some portals emit the dollar
 *      value multiplied by 100 (i.e. cents) for large projects -- a real unit-conversion fix,
 *      not a guess.
 *   3. Return the real number. Never substitute a synthetic value "for the category".
 *
 * Callers that need to exclude invalid/zero-valuation rows (e.g. Calgary's
 * `estprojectcost > 0` requirement) must do that filtering explicitly at the ingestion
 * call site -- this function must never paper over a missing value by inventing one.
 */
export function normalizePermitValue(
  rawVal: number | string | null | undefined,
  subType: string = '',
  desc: string = '',
  _i: number = 1
): number {
  let val = 0;
  if (typeof rawVal === 'number' && !isNaN(rawVal)) {
    val = rawVal;
  } else if (typeof rawVal === 'string') {
    const cleaned = rawVal.replace(/[^0-9.]/g, '');
    val = parseFloat(cleaned) || 0;
  }

  if (val <= 0) return 0;

  const subLower = (subType || '').toLowerCase().trim();
  const descLower = (desc || '').toLowerCase().trim();
  const text = `${subLower} ${descLower}`;
  const isTower = /\b(high-rise|tower|multi-family|apartments|condo|transit|hospital|infrastructure|subdivision)\b/i.test(text);

  // Genuine encoding-bug correction only: some municipal exports emit cost-in-cents for very
  // large projects. Values this large are implausible as cents-of-a-small-project but entirely
  // plausible as real dollars for a tower/institutional project, so only divide down when the
  // record isn't already describing a major development.
  if (val >= 40000000 && !isTower && !text.includes('wwtp')) {
    val = val / 100;
  }

  return Math.round(val);
}
