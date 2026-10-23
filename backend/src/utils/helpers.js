import crypto from 'node:crypto';

export const nowIso = () => new Date().toISOString();
export const newId = (prefix) => `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
export const str = (v) => (v === undefined || v === null ? '' : String(v));
export const collapse = (v) => str(v).replace(/\s+/g, ' ').trim();
export const titleCase = (v) =>
  collapse(v).toLowerCase().replace(/(^|[\s\-'.])([a-z\u00c0-\u024f])/g, (_, a, b) => a + b.toUpperCase());
export const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

/** Parse a date string. ISO always accepted; d/m/y or m/d/y per `order` ('DMY'|'MDY'). Returns 'YYYY-MM-DD' or null. */
export function parseDate(input, order = 'DMY') {
  const s = collapse(input);
  let y, m, d, mm;
  if ((mm = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s))) { [y, m, d] = [+mm[1], +mm[2], +mm[3]]; }
  else if ((mm = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s))) {
    y = +mm[3]; if (order === 'MDY') { m = +mm[1]; d = +mm[2]; } else { d = +mm[1]; m = +mm[2]; }
  } else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(v).trim());
export const cleanPhone = (v) => str(v).replace(/[\s\-().]/g, '');
export const safeRegex = (pattern, flags = '') => { try { return new RegExp(pattern, flags); } catch { return null; } };
