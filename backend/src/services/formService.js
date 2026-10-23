import { db } from '../store/jsonStore.js';
import { check } from '../validators/schema.js';
import { FIELD_TYPES } from '../utils/constants.js';
import { notFound, conflict, validation } from '../utils/errors.js';

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'f_$1').slice(0, 40) || 'field';
const needsOptions = (t) => ['dropdown', 'radio', 'checkbox'].includes(t);

export function normalizeFields(fields) {
  if (!Array.isArray(fields)) throw validation('Fields must be a list.');
  const errs = []; const seen = new Set();
  const out = fields.map((f, i) => {
    const label = String(f.label || '').trim();
    const key = (f.key && /^[a-z][a-z0-9_]*$/.test(f.key)) ? f.key : slug(label);
    const type = f.type;
    if (!label) errs.push({ field: `fields[${i}].label`, message: `Field ${i + 1}: label is required.` });
    if (!FIELD_TYPES.includes(type)) errs.push({ field: `fields[${i}].type`, message: `Field ${i + 1}: unsupported type.` });
    if (seen.has(key)) errs.push({ field: `fields[${i}].key`, message: `Field ${i + 1}: duplicate field name "${key}".` }); seen.add(key);
    const options = needsOptions(type) ? (f.options || []).map((o) => String(o).trim()).filter(Boolean) : [];
    if (needsOptions(type) && !options.length) errs.push({ field: `fields[${i}].options`, message: `Field ${i + 1} (${label || key}): add at least one option.` });
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) errs.push({ field: `fields[${i}].options`, message: `Field ${i + 1}: options must be unique.` });
    const fld = { key, label, type, required: !!f.required, order: i, options, placeholder: String(f.placeholder || '').slice(0, 120), helpText: String(f.helpText || '').slice(0, 200) };
    if (f.column && String(f.column).trim()) fld.column = String(f.column).trim().slice(0, 60);
    if (type === 'number') { if (f.min !== undefined && f.min !== '') fld.min = Number(f.min); if (f.max !== undefined && f.max !== '') fld.max = Number(f.max); }
    return fld;
  });
  if (errs.length) throw validation('The form has problems.', errs);
  return out;
}
const shape = { title: { type: 'string', required: true, max: 120 }, description: { type: 'string', max: 500 }, fields: { type: 'array' } };
export const list = () => db.forms.all();
export const get = (id) => db.forms.find(id) || (() => { throw notFound('Form'); })();
export function create(body) {
  const v = check(body, shape);
  return db.forms.insert({ title: v.title, description: v.description || '', fields: normalizeFields(v.fields || []), status: 'draft' });
}
export function update(id, body) {
  get(id); const v = check(body, shape);
  return db.forms.update(id, { title: v.title, description: v.description || '', fields: normalizeFields(v.fields || []) });
}
export function setStatus(id, status) {
  get(id);
  if (!['draft', 'published'].includes(status)) throw validation('Unknown form status.');
  return db.forms.update(id, { status });
}
export function remove(id) {
  get(id);
  if (db.events.where((e) => e.formId === id).length) throw conflict('This form is linked to an event. Unlink it first.');
  db.forms.remove(id);
}
export const forEvent = (event) => (event.formId ? db.forms.find(event.formId) : null);
