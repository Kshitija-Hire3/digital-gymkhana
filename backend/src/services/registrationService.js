import { db, nextCounter } from '../store/jsonStore.js';
import { REG_STATUS } from '../utils/constants.js';
import { AppError, notFound, conflict, validation, forbidden } from '../utils/errors.js';
import { collapse, nowIso, safeRegex, titleCase } from '../utils/helpers.js';
import { getSettings } from './settingsService.js';
import * as formSvc from './formService.js';
import * as eventSvc from './eventService.js';
import { notify, notifyMany } from './notificationService.js';
import * as excel from '../excel/excelService.js';
import { buildSchema } from '../excel/schemaMapper.js';
import { validateValues } from '../excel/dataValidator.js';

const eventLocks = new Map();
function withEventLock(eventId, fn) {           // prevents duplicate-check / append races within one event
  const prev = eventLocks.get(eventId) || Promise.resolve();
  const run = prev.then(fn);
  const tail = run.then(() => {}, () => {});       // never rejects, so the chain cannot raise unhandled rejections
  eventLocks.set(eventId, tail);
  tail.then(() => { if (eventLocks.get(eventId) === tail) eventLocks.delete(eventId); });
  return run;
}
const studentByCrn = (crn) => db.students.where((s) => s.crn.toUpperCase() === String(crn).trim().toUpperCase())[0] || null;
const decorate = (rec, event) => ({ ...rec, eventTitle: event?.title || rec.sport, eventDate: event?.date || null });
const involves = (rec, crn) => rec.crn?.toUpperCase() === crn.toUpperCase() || rec.teamMembers?.some((m) => m.crn.toUpperCase() === crn.toUpperCase());

export const studentProfile = (s) => ({ crn: s.crn, name: s.name, phone: s.phone || '', email: s.email || '', branch: s.branch || '', class: s.class || '', division: s.division || '', shift: s.shift || '' });
const fullProfile = (crn) => { const s = studentByCrn(crn); return s ? studentProfile(s) : null; };
const maskPhone = (p) => (p ? `${'•'.repeat(Math.max(p.length - 4, 0))}${p.slice(-4)}` : '');
const maskEmail = (e) => { const [u, d] = String(e || '').split('@'); return d ? `${u[0] || ''}${'•'.repeat(Math.max(u.length - 1, 1))}@${d}` : ''; };
/** Details shown after a CRN is entered/scanned. Your own record is shown in full; other students' phone/email are masked. */
export function lookupStudent(crn, requesterCrn) {
  const s = studentByCrn(crn); if (!s || s.active === false) return null;
  const p = studentProfile(s);
  if (requesterCrn && requesterCrn.toUpperCase() === s.crn.toUpperCase()) return p;
  return { ...p, phone: maskPhone(p.phone), email: maskEmail(p.email), masked: true };
}

export async function submit(user, body) {
  const event = db.events.find(body?.eventId);
  if (!event) throw notFound('Event');
  return withEventLock(event.id, async () => {
    if (!eventSvc.isOpenNow(event)) throw new AppError(409, 'REGISTRATION_CLOSED', 'Registrations are closed for this event.');
    const student = studentByCrn(user.crn); if (!student) throw forbidden('Student record not found.');
    const settings = getSettings(); const form = formSvc.forEvent(event);
    const schema = buildSchema(event, form, settings);
    const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};

    // 1. validate sport-specific answers using the form definition
    const values = {}; const formCols = schema.columns.filter((c) => c.source === 'form');
    for (const c of formCols) { const a = answers[c.key.slice(2)]; values[c.key] = Array.isArray(a) ? a.join('; ') : collapse(a); }
    const fieldIssues = validateValues(values, { columns: formCols }, settings.normalization);
    if (fieldIssues.length) throw validation('Please correct the highlighted fields.', fieldIssues.map((i) => ({ field: i.key.slice(2), message: i.message })));

    // 2. team rules
    let teamMembers = []; let teamName = '';
    if (event.mode === 'team') {
      teamName = collapse(body.team?.name);
      if (!teamName) throw validation('Enter a team name.', [{ field: 'teamName', message: 'Team name is required.' }]);
      const crns = (body.team?.members || []).map((m) => collapse(typeof m === 'string' ? m : m?.crn).toUpperCase()).filter(Boolean);
      const size = crns.length + 1;
      if (size < event.teamMin || size > event.teamMax) throw validation(`Team size must be between ${event.teamMin} and ${event.teamMax} players including the captain (you have ${size}).`, [{ field: 'members', message: 'Invalid team size.' }]);
      if (new Set(crns).size !== crns.length) throw validation('The same CRN is listed more than once.', [{ field: 'members', message: 'Duplicate CRN in team.' }]);
      if (crns.includes(student.crn.toUpperCase())) throw validation('You are the captain and are already included. Remove your own CRN from the member list.', [{ field: 'members', message: 'Captain listed as member.' }]);
      const crnRe = safeRegex(settings.normalization.crnPattern);
      for (const c of crns) {
        if (crnRe && !crnRe.test(c)) throw validation(`"${c}" is not a valid CRN.`, [{ field: 'members', message: `Invalid CRN ${c}.` }]);
        const s = studentByCrn(c); if (!s) throw validation(`No student found with CRN ${c}.`, [{ field: 'members', message: `Unknown CRN ${c}.` }]);
        teamMembers.push({ crn: s.crn, name: s.name });
      }
    }

    // 3. duplicate registration (captain/individual or member of another team)
    const existing = await excel.listRegistrations(event.id, settings);
    const clash = existing.find((r) => involves(r, student.crn));
    if (clash) throw conflict(`You are already registered for this event (${clash.id}).`);
    for (const m of teamMembers) {
      const c = existing.find((r) => involves(r, m.crn));
      if (c) throw conflict(`${m.name} (${m.crn}) is already registered for this event.`);
    }

    // 4. build canonical record and append to Excel
    const year = new Date().getFullYear();
    const id = `REG-${year}-${String(nextCounter(`reg-${year}`)).padStart(4, '0')}`;
    const record = {
      id, eventId: event.id, sport: event.sport, mode: event.mode, crn: student.crn, name: student.name,
      phone: student.phone || '', email: student.email || '', branch: student.branch || '', class: student.class || '',
      division: student.division || '', shift: student.shift || '', status: 'Submitted', submittedAt: nowIso(), teamName, teamSize: event.mode === 'team' ? teamMembers.length + 1 : '',
      teamMembers, answers: Object.fromEntries(formCols.map((c) => [c.key.slice(2), values[c.key]])),
    };
    await excel.appendRegistration(event.id, schema, record);
    db.regIndex.insert({ id, eventId: event.id });
    notifyMany([student.crn, ...teamMembers.map((m) => m.crn)], { type: 'registration', title: `Registration Submitted — ${event.title}`, message: `Registration ${id} for ${event.title} has been submitted.`, link: `/student/registrations/${id}` });
    return decorate(record, event);
  });
}

// One unreadable workbook must not break listings for every other event; the problem is surfaced via data processing status.
async function safeList(e, settings) {
  if (!excel.rawExists(e.id)) return [];
  try { return await excel.listRegistrations(e.id, settings); }
  catch (err) { if (err.code === 'EXCEL_CORRUPT') { console.error(`[excel] skipping unreadable workbook for ${e.id}`); return []; } throw err; }
}
async function all(settings = getSettings()) {
  const out = [];
  for (const e of db.events.all()) for (const r of await safeList(e, settings)) out.push(decorate(r, e));
  return out;
}
export async function listMine(user) {
  const crn = user.crn; const settings = getSettings(); const out = [];
  for (const e of db.events.all()) for (const r of await safeList(e, settings)) if (involves(r, crn)) out.push({ ...decorate(r, e), role: r.crn.toUpperCase() === crn.toUpperCase() ? (r.mode === 'team' ? 'Captain' : 'Participant') : 'Team member' });
  return out.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
export async function getMine(user, id) {
  const r = (await listMine(user)).find((x) => x.id === id); if (!r) throw notFound('Registration'); return r;
}
export async function listAll({ eventId, status, q } = {}) {
  let items = await all();
  if (eventId) items = items.filter((r) => r.eventId === eventId);
  if (status) items = items.filter((r) => r.status === status);
  if (q) { const s = q.toLowerCase(); items = items.filter((r) => `${r.id} ${r.name} ${r.crn} ${r.teamName || ''}`.toLowerCase().includes(s)); }
  return items.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
export async function getById(id) {
  const idx = db.regIndex.where((x) => x.id === id)[0]; if (!idx) throw notFound('Registration');
  const settings = getSettings(); const event = db.events.find(idx.eventId);
  const r = (await excel.listRegistrations(idx.eventId, settings)).find((x) => x.id === id); if (!r) throw notFound('Registration');
  return decorate(r, event);
}
export async function setStatus(id, status) {
  if (!REG_STATUS.includes(status)) throw validation(`Status must be one of: ${REG_STATUS.join(', ')}.`);
  const idx = db.regIndex.where((x) => x.id === id)[0]; if (!idx) throw notFound('Registration');
  const event = db.events.find(idx.eventId); const settings = getSettings();
  const schema = buildSchema(event, formSvc.forEvent(event), settings);
  const rec = await excel.updateRegistration(idx.eventId, id, { status }, schema, settings);
  const crns = [rec.crn, ...rec.teamMembers.map((m) => m.crn)];
  notifyMany(crns, { type: 'registration', title: `Registration ${status} — ${event.title}`, message: `Your registration ${id} for ${event.title} is now "${status}".`, link: `/student/registrations/${id}` });
  return decorate(rec, event);
}
export async function participants() {
  const map = new Map();
  for (const r of await all()) {
    const people = [{ crn: r.crn, name: r.name, branch: r.branch, class: r.class, division: r.division, role: r.mode === 'team' ? 'Captain' : 'Participant' },
      ...r.teamMembers.map((m) => ({ ...m, ...(fullProfile(m.crn) || {}), role: 'Team member' }))];
    for (const p of people) {
      const cur = map.get(p.crn.toUpperCase()) || { crn: p.crn, name: p.name, branch: p.branch || '', class: p.class || '', division: p.division || '', events: [] };
      cur.events.push({ eventId: r.eventId, eventTitle: r.eventTitle, registrationId: r.id, role: p.role, status: r.status });
      map.set(p.crn.toUpperCase(), cur);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
export async function teams() { return (await all()).filter((r) => r.mode === 'team'); }
export { titleCase };
