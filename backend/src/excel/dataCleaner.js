// RAW -> VALIDATION -> NORMALIZATION -> DUPLICATE DETECTION -> STANDARDIZATION -> ORGANIZATION -> CLEAN OUTPUT
import { collapse, titleCase, cleanPhone, parseDate, str } from '../utils/helpers.js';
import { validateValues } from './dataValidator.js';
import { parseMembers, formatMembers, rowToValues, valuesToRow } from './schemaMapper.js';

export function normalizeValues(values, schema, rules) {
  const out = {};
  for (const c of schema.columns) {
    let v = collapse(values[c.key]);
    const short = c.key.startsWith('f:') ? c.key.slice(2) : c.key;
    if (v) {
      if (rules.titleCaseKeys?.includes(short)) v = titleCase(v);
      if (rules.upperCaseKeys?.includes(short)) v = v.toUpperCase();
      switch (c.type) {
        case 'crn': v = v.toUpperCase(); break;
        case 'email': v = v.toLowerCase(); break;
        case 'phone': v = cleanPhone(v); break;
        case 'number': if (Number.isFinite(Number(v))) v = String(Number(v)); break;
        case 'date': v = parseDate(v, rules.dateOrder) || v; break;
        case 'dropdown': case 'radio': v = (c.options || []).find((o) => o.toLowerCase() === v.toLowerCase()) || v; break;
        case 'checkbox': v = v.split(';').map((s) => s.trim()).filter(Boolean)
          .map((s) => (c.options || []).find((o) => o.toLowerCase() === s.toLowerCase()) || s).join('; '); break;
        case 'members': v = formatMembers(parseMembers(v).map((m) => ({ crn: m.crn.toUpperCase(), name: titleCase(m.name) }))); break;
        default: break;
      }
    }
    out[c.key] = v;
  }
  return out;
}
export function standardizeValues(values, ctx, rules) {
  const out = { ...values };
  if (ctx.sportLabel && 'sport' in out) out.sport = ctx.sportLabel;
  if (out.mode) out.mode = out.mode.toLowerCase();
  const aliases = Object.fromEntries(Object.entries(rules.branchAliases || {}).map(([k, v]) => [collapse(k).toLowerCase(), v]));
  if (out.branch && aliases[out.branch.toLowerCase()]) out.branch = aliases[out.branch.toLowerCase()];
  return out;
}
/** Returns Map<rowIndex, [{code,message,duplicateOf}]> - first occurrence wins, later ones are flagged. */
export function detectDuplicates(rows, schema) {
  const found = new Map(); const add = (i, d) => found.set(i, [...(found.get(i) || []), d]);
  const seenCrn = new Map(); const memberOwner = new Map();
  const isTeam = schema.columns.some((c) => c.key === 'teamMembers');
  rows.forEach((v, i) => {
    const crn = str(v.crn).toUpperCase(); const ref = v.id || `row ${i + 2}`;
    if (crn) {
      if (seenCrn.has(crn)) add(i, { code: 'DUPLICATE_REGISTRATION', message: `CRN ${crn} already registered (${seenCrn.get(crn).ref}).`, duplicateOf: seenCrn.get(crn).ref });
      else seenCrn.set(crn, { ref });
    }
    if (isTeam) {
      const own = new Set(crn ? [crn] : []);
      for (const m of parseMembers(v.teamMembers)) {
        const mc = m.crn.toUpperCase();
        if (own.has(mc)) { add(i, { code: 'DUPLICATE_MEMBER', message: `Member ${mc} appears more than once in this team.`, duplicateOf: ref }); continue; }
        own.add(mc);
        if (memberOwner.has(mc) && memberOwner.get(mc) !== ref) add(i, { code: 'DUPLICATE_MEMBER', message: `Member ${mc} is already in ${memberOwner.get(mc)}.`, duplicateOf: memberOwner.get(mc) });
        else memberOwner.set(mc, ref);
      }
      if (crn && !memberOwner.has(crn)) memberOwner.set(crn, ref);
    }
  });
  return found;
}
/**
 * @param rawRows header-keyed rows from the Raw sheet
 * @returns {{clean, attention, duplicates, summary, cleanHeaders}}
 */
export function runPipeline(rawRows, schema, rules, ctx = {}) {
  // 1 validation (on trimmed raw values)
  const stage = rawRows.map((row, i) => {
    const raw = rowToValues(row, schema);
    return { index: i, raw, rawIssues: validateValues(raw, schema, rules) };
  });
  // 2 normalization
  stage.forEach((s) => { s.values = normalizeValues(s.raw, schema, rules); });
  // 3 duplicate detection (on normalized values)
  const dups = detectDuplicates(stage.map((s) => s.values), schema);
  // 4 standardization
  stage.forEach((s) => { s.values = standardizeValues(s.values, ctx, rules); });
  // re-validate after normalization so format issues that survive cleaning remain reported
  stage.forEach((s) => { s.issues = validateValues(s.values, schema, rules); s.dups = dups.get(s.index) || []; });
  // 5 organization
  const sorted = [...stage].sort((a, b) => str(a.values.submittedAt).localeCompare(str(b.values.submittedAt)) || str(a.values.id).localeCompare(str(b.values.id)));
  const clean = []; const attention = []; const duplicates = []; const byIssue = {};
  const count = (code) => { byIssue[code] = (byIssue[code] || 0) + 1; };
  for (const s of sorted) {
    const row = valuesToRow(s.values, schema);
    if (s.dups.length) { s.dups.forEach((d) => count(d.code)); duplicates.push({ ...row, Issues: s.dups.map((d) => d.message).join(' | '), DuplicateOf: s.dups[0].duplicateOf }); }
    else if (s.issues.length) { s.issues.forEach((d) => count(d.code)); attention.push({ ...row, Issues: s.issues.map((d) => d.message).join(' | ') }); }
    else clean.push(row);
  }
  return {
    clean, attention, duplicates, cleanHeaders: schema.headers,
    summary: { processed: rawRows.length, valid: clean.length, needsCorrection: attention.length, duplicates: duplicates.length, byIssue },
  };
}
