import { doc } from '../store/jsonStore.js';
import { config } from '../config/index.js';
import { validation } from '../utils/errors.js';
import { safeRegex } from '../utils/helpers.js';

export const DEFAULT_SETTINGS = {
  normalization: {
    titleCaseKeys: ['name'],                 // column keys forced to Title Case
    upperCaseKeys: ['crn'],
    branchAliases: {},                       // { "info tech": "Information Technology" } - supply the college's real list
    dateOrder: 'DMY',                        // how dd/mm/yyyy vs mm/dd/yyyy is read
    phonePattern: '^\\+?\\d{10,13}$',       // validated after removing spaces/dashes
    crnPattern: config.crnPattern,
  },
  excel: {
    metaHeaders: {
      id: 'RegistrationID', eventId: 'EventID', sport: 'Sport', mode: 'Mode', crn: 'CRN', name: 'Name',
      phone: 'Phone', email: 'Email', branch: 'Branch', class: 'Class', division: 'Division', shift: 'Shift',
      status: 'Status', submittedAt: 'SubmittedAt',
      teamName: 'TeamName', teamSize: 'TeamSize', teamMembers: 'TeamMembers',
    },
  },
};
const store = doc('settings', {});
export function getSettings() {
  const s = store.get();
  return {
    normalization: { ...DEFAULT_SETTINGS.normalization, ...(s.normalization || {}) },
    excel: { metaHeaders: { ...DEFAULT_SETTINGS.excel.metaHeaders, ...((s.excel || {}).metaHeaders || {}) } },
  };
}
export function updateSettings(body) {
  const cur = getSettings();
  const n = { ...cur.normalization, ...(body.normalization || {}) };
  const errs = [];
  if (!safeRegex(n.crnPattern)) errs.push('crnPattern is not a valid regular expression');
  if (!safeRegex(n.phonePattern)) errs.push('phonePattern is not a valid regular expression');
  if (!['DMY', 'MDY'].includes(n.dateOrder)) errs.push('dateOrder must be DMY or MDY');
  if (typeof n.branchAliases !== 'object' || Array.isArray(n.branchAliases)) errs.push('branchAliases must be an object');
  if (errs.length) throw validation('Invalid settings.', errs);
  const meta = { ...cur.excel.metaHeaders, ...((body.excel || {}).metaHeaders || {}) };
  const vals = Object.values(meta).map((v) => String(v).trim());
  if (vals.some((v) => !v) || new Set(vals.map((v) => v.toLowerCase())).size !== vals.length)
    throw validation('Excel meta headers must be non-empty and unique.');
  const next = { normalization: n, excel: { metaHeaders: meta } };
  store.set(next); return getSettings();
}
