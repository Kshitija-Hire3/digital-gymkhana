import { str, collapse, isEmail, cleanPhone, parseDate, safeRegex } from '../utils/helpers.js';
import { parseMembers } from './schemaMapper.js';

const issue = (column, code, message) => ({ column: column.header, key: column.key, code, message });

/** Validate one row of values (keyed by schema column key). Returns [] when valid. Never mutates input. */
export function validateValues(values, schema, rules) {
  const issues = [];
  const crnRe = safeRegex(rules.crnPattern); const phoneRe = safeRegex(rules.phonePattern);
  for (const c of schema.columns) {
    const v = collapse(values[c.key]);
    if (!v) { if (c.required) issues.push(issue(c, 'MISSING_FIELD', `${c.header} is required.`)); continue; }
    switch (c.type) {
      case 'crn': if (crnRe && !crnRe.test(v)) issues.push(issue(c, 'INVALID_CRN', `${c.header} "${v}" is not in a valid format.`)); break;
      case 'email': if (!isEmail(v)) issues.push(issue(c, 'INVALID_EMAIL', `${c.header} is not a valid email address.`)); break;
      case 'phone': if (phoneRe && !phoneRe.test(cleanPhone(v))) issues.push(issue(c, 'INVALID_PHONE', `${c.header} is not a valid contact number.`)); break;
      case 'number': {
        const n = Number(v);
        if (!Number.isFinite(n)) issues.push(issue(c, 'INVALID_NUMBER', `${c.header} must be a number.`));
        else if (c.min !== undefined && c.min !== '' && n < Number(c.min)) issues.push(issue(c, 'OUT_OF_RANGE', `${c.header} must be at least ${c.min}.`));
        else if (c.max !== undefined && c.max !== '' && n > Number(c.max)) issues.push(issue(c, 'OUT_OF_RANGE', `${c.header} must be at most ${c.max}.`));
        break;
      }
      case 'date': if (!parseDate(v, rules.dateOrder)) issues.push(issue(c, 'INVALID_DATE', `${c.header} is not a valid date.`)); break;
      case 'dropdown': case 'radio': {
        if (c.options?.length && !c.options.some((o) => o.toLowerCase() === v.toLowerCase())) issues.push(issue(c, 'INVALID_OPTION', `${c.header} must be one of: ${c.options.join(', ')}.`));
        break;
      }
      case 'checkbox': {
        const bad = v.split(';').map((s) => s.trim()).filter(Boolean).filter((s) => c.options?.length && !c.options.some((o) => o.toLowerCase() === s.toLowerCase()));
        if (bad.length) issues.push(issue(c, 'INVALID_OPTION', `${c.header} has unknown choice(s): ${bad.join(', ')}.`));
        break;
      }
      case 'members': {
        const bad = parseMembers(v).filter((m) => crnRe && !crnRe.test(m.crn));
        if (bad.length) issues.push(issue(c, 'INVALID_CRN', `Team member CRN(s) invalid: ${bad.map((m) => m.crn).join(', ')}.`));
        break;
      }
      default: break;
    }
  }
  return issues;
}
export const hasValue = (v) => str(v).trim() !== '';
