import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpDataDir } from './helpers.js';
tmpDataDir();
const { buildSchema, rowToValues } = await import('../src/excel/schemaMapper.js');
const { validateValues } = await import('../src/excel/dataValidator.js');
const { runPipeline, normalizeValues } = await import('../src/excel/dataCleaner.js');
const { DEFAULT_SETTINGS } = await import('../src/services/settingsService.js');
const { parseDate, titleCase } = await import('../src/utils/helpers.js');

const settings = DEFAULT_SETTINGS;
const rules = { ...settings.normalization, branchAliases: { 'info tech': 'Information Technology' } };
const event = { id: 'e1', mode: 'individual', sport: 'Chess' };
const form = { fields: [
  { key: 'contact', label: 'Contact', type: 'phone', required: true, order: 0 },
  { key: 'category', label: 'Category', type: 'dropdown', required: true, options: ['Beginner', 'Advanced'], order: 1 },
  { key: 'rating', label: 'Rating', type: 'number', required: false, min: 0, max: 3500, order: 2 }] };
const schema = buildSchema(event, form, settings);
const H = settings.excel.metaHeaders;
const row = (o) => ({ [H.id]: 'REG-1', [H.eventId]: 'e1', [H.sport]: 'chess', [H.mode]: 'Individual', [H.crn]: '9900000001', [H.name]: '  aryan   MEHTA ',
  [H.phone]: '98765 43210', [H.email]: 'ARYAN@Example.com', [H.branch]: 'info tech', [H.class]: 'TY', [H.division]: 'H', [H.shift]: 'Regular',
  [H.status]: 'Submitted', [H.submittedAt]: '2026-01-01T00:00:00Z', Contact: '98765 43210', Category: 'advanced', Rating: '1450', ...o });

test('schema is driven by the form definition and includes student detail columns', () => {
  assert.deepEqual(schema.headers.slice(-3), ['Contact', 'Category', 'Rating']);
  for (const k of ['phone', 'email', 'branch', 'class', 'division', 'shift']) assert.ok(schema.headers.includes(H[k]), k);
  assert.ok(buildSchema({ mode: 'team' }, null, settings).headers.includes(H.teamName));
});
test('default CRN format is 10 digits', () => {
  const crn = schema.columns.find((c) => c.key === 'crn');
  const bad = (v) => validateValues({ crn: v, name: 'x', 'f:contact': '9876543210', 'f:category': 'Advanced' }, { columns: [crn] }, settings.normalization).length;
  assert.equal(bad('3724081008'), 0); assert.equal(bad('372408100'), 1); assert.equal(bad('21IT0042'), 1);
});
test('date parsing', () => {
  assert.equal(parseDate('05/02/2026', 'DMY'), '2026-02-05'); assert.equal(parseDate('05/02/2026', 'MDY'), '2026-05-02');
  assert.equal(parseDate('2026-02-30'), null); assert.equal(titleCase('  aRYAN  mehta'), 'Aryan Mehta');
});
test('validator flags missing, bad phone, bad option, bad CRN, bad email', () => {
  const v = rowToValues(row({ Contact: '123', Category: 'Expert', [H.crn]: 'XX', [H.name]: '', [H.email]: 'nope' }), schema);
  const codes = validateValues(v, schema, settings.normalization).map((i) => i.code).sort();
  assert.deepEqual(codes, ['INVALID_CRN', 'INVALID_EMAIL', 'INVALID_OPTION', 'INVALID_PHONE', 'MISSING_FIELD']);
});
test('normalization is applied', () => {
  const n = normalizeValues(rowToValues(row({}), schema), schema, rules);
  assert.equal(n.name, 'Aryan Mehta'); assert.equal(n['f:contact'], '9876543210'); assert.equal(n['f:category'], 'Advanced');
  assert.equal(n.email, 'aryan@example.com'); assert.equal(n.phone, '9876543210');
});
test('pipeline summary is computed from real rows', () => {
  const rows = [
    row({}),
    row({ [H.id]: 'REG-2', [H.submittedAt]: '2026-01-02T00:00:00Z' }),                                 // duplicate CRN
    row({ [H.id]: 'REG-3', [H.crn]: '9900000002', Contact: 'abc' }),                                   // needs correction
    row({ [H.id]: 'REG-4', [H.crn]: '9900000003' }),
  ];
  const r = runPipeline(rows, schema, rules, { sportLabel: 'Chess' });
  assert.deepEqual({ ...r.summary, byIssue: undefined }, { processed: 4, valid: 2, needsCorrection: 1, duplicates: 1, byIssue: undefined });
  assert.equal(r.clean[0][H.sport], 'Chess'); assert.equal(r.clean[0][H.branch], 'Information Technology');
  assert.equal(r.duplicates[0].DuplicateOf, 'REG-1');
  assert.match(r.attention[0].Issues, /Contact/);
});
test('team duplicate member detection', () => {
  const ts = buildSchema({ mode: 'team' }, null, settings);
  const mk = (id, crn, members) => ({ [H.id]: id, [H.crn]: crn, [H.name]: 'A', [H.teamName]: id, [H.teamMembers]: members, [H.submittedAt]: id });
  const r = runPipeline([mk('T1', '9900000011', '9900000012|B'), mk('T2', '9900000013', '9900000012|B')], ts, settings.normalization);
  assert.equal(r.summary.duplicates, 1); assert.equal(r.duplicates[0].DuplicateOf, 'T1');
});
test('empty input', () => { const r = runPipeline([], schema, rules); assert.equal(r.summary.processed, 0); });
