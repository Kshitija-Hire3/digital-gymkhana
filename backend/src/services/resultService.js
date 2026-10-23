import { db } from '../store/jsonStore.js';
import { notFound, validation } from '../utils/errors.js';
import { collapse } from '../utils/helpers.js';
import * as regSvc from './registrationService.js';
import { notifyMany } from './notificationService.js';

const label = (r) => (r.mode === 'team' ? r.teamName : r.name);
export async function getForEvent(eventId) {
  const event = db.events.find(eventId); if (!event) throw notFound('Event');
  const regs = (await regSvc.listAll({ eventId })).filter((r) => r.status !== 'Rejected');
  const saved = db.results.get()[eventId] || { published: false, entries: [] };
  const byReg = new Map(saved.entries.map((e) => [e.registrationId, e]));
  return {
    event, published: !!saved.published,
    entries: regs.map((r) => ({ registrationId: r.id, participant: label(r), crn: r.crn, position: '', outcome: '', remarks: '', ...(byReg.get(r.id) || {}) })),
  };
}
export async function save(eventId, body) {
  const event = db.events.find(eventId); if (!event) throw notFound('Event');
  if (!Array.isArray(body?.entries)) throw validation('Entries must be a list.');
  const regs = new Map((await regSvc.listAll({ eventId })).map((r) => [r.id, r]));
  const errors = [];
  const entries = body.entries.map((e, i) => {
    if (!regs.has(e.registrationId)) errors.push({ field: `entries[${i}]`, message: `Unknown registration ${e.registrationId}.` });
    const position = collapse(e.position), outcome = collapse(e.outcome), remarks = collapse(e.remarks);
    if (position.length > 30) errors.push({ field: `entries[${i}].position`, message: 'Position is too long (max 30).' });
    if (outcome.length > 60) errors.push({ field: `entries[${i}].outcome`, message: 'Outcome is too long (max 60).' });
    if (remarks.length > 300) errors.push({ field: `entries[${i}].remarks`, message: 'Remarks are too long (max 300).' });
    return { registrationId: e.registrationId, position, outcome, remarks };
  }).filter((e) => e.position || e.outcome || e.remarks);
  if (errors.length) throw validation('Some result entries are invalid.', errors);
  const all = db.results.get(); const wasPublished = !!all[eventId]?.published; const published = !!body.published;
  db.results.set({ ...all, [eventId]: { published, entries, updatedAt: new Date().toISOString() } });
  if (published && !wasPublished) {
    const crns = [...regs.values()].flatMap((r) => [r.crn, ...r.teamMembers.map((m) => m.crn)]);
    notifyMany(crns, { type: 'result', title: `Results Published — ${event.title}`, message: `Results for ${event.title} are now available.`, link: '/student/results' });
  }
  return getForEvent(eventId);
}
export async function listForStudent(user) {
  const mine = await regSvc.listMine(user); const out = [];
  for (const eventId of new Set(mine.map((r) => r.eventId))) {
    const saved = db.results.get()[eventId]; if (!saved?.published) continue;
    const full = await getForEvent(eventId); const myRegs = new Set(mine.filter((r) => r.eventId === eventId).map((r) => r.id));
    out.push({ event: full.event, entries: full.entries.filter((e) => e.position || e.outcome).map((e) => ({ ...e, mine: myRegs.has(e.registrationId) })) });
  }
  return out;
}
