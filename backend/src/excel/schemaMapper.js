// The form definition determines the response schema. Column headers are configurable:
//   - meta headers come from settings.excel.metaHeaders
//   - form field headers default to the field label and can be overridden with field.column
import { str } from '../utils/helpers.js';

const META = [
  { key: 'id', type: 'text' }, { key: 'eventId', type: 'text' }, { key: 'sport', type: 'text' }, { key: 'mode', type: 'text' },
  { key: 'crn', type: 'crn', required: true }, { key: 'name', type: 'text', required: true },
  { key: 'phone', type: 'phone' }, { key: 'email', type: 'email' }, { key: 'branch', type: 'text' },
  { key: 'class', type: 'text' }, { key: 'division', type: 'text' }, { key: 'shift', type: 'text' },
  { key: 'status', type: 'text' }, { key: 'submittedAt', type: 'text' },
];
const TEAM = [{ key: 'teamName', type: 'text', required: true }, { key: 'teamSize', type: 'number' }, { key: 'teamMembers', type: 'members' }];

export function buildSchema(event, form, settings) {
  const mh = settings.excel.metaHeaders;
  const columns = [...META, ...(event.mode === 'team' ? TEAM : [])].map((c) => ({ ...c, header: mh[c.key], source: 'meta' }));
  const fields = [...((form && form.fields) || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const f of fields) {
    columns.push({
      key: `f:${f.key}`, header: (f.column || f.label || f.key).trim(), source: 'form', type: f.type,
      required: !!f.required, options: f.options || [], min: f.min, max: f.max, label: f.label,
    });
  }
  return { columns, headers: columns.map((c) => c.header) };
}
/** Add columns for headers present in a file but unknown to the schema so no data is lost. */
export function extendWithFileHeaders(schema, fileHeaders) {
  const known = new Set(schema.headers.map((h) => h.toLowerCase()));
  const extra = fileHeaders.filter((h) => h && !known.has(h.toLowerCase()))
    .map((h) => ({ key: `x:${h}`, header: h, source: 'extra', type: 'text' }));
  const columns = [...schema.columns, ...extra];
  return { columns, headers: columns.map((c) => c.header) };
}
export const rowToValues = (row, schema) =>
  Object.fromEntries(schema.columns.map((c) => [c.key, str(row[c.header])]));
export const valuesToRow = (values, schema) =>
  Object.fromEntries(schema.columns.map((c) => [c.header, str(values[c.key])]));

export const formatMembers = (members) => members.map((m) => `${m.crn}|${m.name}`).join('; ');
export const parseMembers = (s) => str(s).split(';').map((p) => p.trim()).filter(Boolean).map((p) => {
  const [crn, ...rest] = p.split('|'); return { crn: crn.trim(), name: rest.join('|').trim() };
});

/** Canonical registration record -> Excel row values (keys per schema). */
export function recordToValues(rec) {
  const v = {
    id: rec.id, eventId: rec.eventId, sport: rec.sport, mode: rec.mode, crn: rec.crn, name: rec.name, phone: rec.phone, email: rec.email,
    branch: rec.branch, class: rec.class, division: rec.division, shift: rec.shift, status: rec.status, submittedAt: rec.submittedAt,
    teamName: rec.teamName || '', teamSize: rec.teamSize ?? '', teamMembers: formatMembers(rec.teamMembers || []),
  };
  for (const [k, val] of Object.entries(rec.answers || {})) v[`f:${k}`] = Array.isArray(val) ? val.join('; ') : str(val);
  return v;
}
/** Excel row (header-keyed) -> canonical record, using meta headers; unknown columns become `answers`. */
export function rowToRecord(row, settings) {
  const mh = settings.excel.metaHeaders; const metaByHeader = new Map(Object.entries(mh).map(([k, h]) => [h, k]));
  const rec = { answers: {} };
  for (const [h, val] of Object.entries(row)) {
    const k = metaByHeader.get(h);
    if (k) rec[k] = val; else rec.answers[h] = val;
  }
  rec.teamMembers = parseMembers(rec.teamMembers);
  return rec;
}
