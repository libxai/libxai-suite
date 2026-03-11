/**
 * Evaluate Excel-like formula inputs for hour fields.
 *
 * Supports:
 *   =8*9       → 72
 *   +18*9      → 162
 *   8*9        → 72  (bare arithmetic)
 *   =2+3*4    → 14  (standard math precedence)
 *   =(2+3)*4  → 20  (parentheses)
 *   =100/8    → 12.5
 *   =8+4      → 12
 *
 * Returns the numeric result (hours), or null if the input is not a formula.
 * Only allows digits, +, -, *, /, (, ), and whitespace — safe against injection.
 */
export function evaluateFormula(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let expr: string;

  if (trimmed.startsWith('=')) {
    expr = trimmed.slice(1).trim();
  } else if (trimmed.startsWith('+') && /[*\/()]/.test(trimmed)) {
    expr = trimmed.slice(1).trim();
  } else if (/^\d[\d\s]*[*\/]/.test(trimmed) || /^\(/.test(trimmed)) {
    expr = trimmed;
  } else {
    return null;
  }

  if (!expr) return null;

  // Security: only allow safe characters
  if (!/^[\d+\-*/().\s]+$/.test(expr)) return null;

  // Reject double operators
  if (/[+\-*/]{2,}/.test(expr.replace(/\s/g, '').replace(/\*-/g, 'X').replace(/\/-/g, 'X'))) return null;

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${expr});`)();
    if (typeof result !== 'number' || !isFinite(result) || result < 0) return null;
    return result;
  } catch {
    return null;
  }
}

/**
 * Pre-process an input string: if it's a formula, evaluate and return as string.
 * Otherwise return the original string unchanged.
 */
export function preprocessFormulaInput(raw: string): string {
  const result = evaluateFormula(raw);
  if (result !== null) return String(result);
  return raw;
}
