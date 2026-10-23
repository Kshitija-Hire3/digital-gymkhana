// Tiny declarative request validator: { field: { type, required, max, min, enum, items } }
import { validation } from '../utils/errors.js';

export function check(body, shape) {
  const errors = []; const out = {};
  const b = body && typeof body === 'object' ? body : {};
  for (const [k, r] of Object.entries(shape)) {
    let v = b[k];
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '' && r.type !== 'any')) {
      if (r.required) errors.push({ field: k, message: `${r.label || k} is required.` });
      continue;
    }
    if (r.type === 'string') { if (typeof v !== 'string') { errors.push({ field: k, message: `${r.label || k} must be text.` }); continue; } v = v.trim(); if (r.max && v.length > r.max) errors.push({ field: k, message: `${r.label || k} must be at most ${r.max} characters.` }); }
    if (r.type === 'number') { v = Number(v); if (!Number.isFinite(v)) { errors.push({ field: k, message: `${r.label || k} must be a number.` }); continue; } if (r.min !== undefined && v < r.min) errors.push({ field: k, message: `${r.label || k} must be at least ${r.min}.` }); }
    if (r.type === 'boolean') v = v === true || v === 'true';
    if (r.type === 'array' && !Array.isArray(v)) { errors.push({ field: k, message: `${r.label || k} must be a list.` }); continue; }
    if (r.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) { errors.push({ field: k, message: `${r.label || k} must be a date (YYYY-MM-DD).` }); continue; }
    if (r.enum && !r.enum.includes(v)) errors.push({ field: k, message: `${r.label || k} must be one of: ${r.enum.join(', ')}.` });
    out[k] = v;
  }
  if (errors.length) throw validation('Please correct the highlighted fields.', errors);
  return out;
}
export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
