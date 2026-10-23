import { db } from '../store/jsonStore.js';
import { check } from '../validators/schema.js';
import { EVENT_STATUS, REG_MODES } from '../utils/constants.js';
import { notFound, conflict, validation } from '../utils/errors.js';
import { notify } from './notificationService.js';
import { rawExists } from '../excel/excelService.js';

const shape = {
  title: { type: 'string', required: true, max: 120 }, sport: { type: 'string', required: true, max: 60 },
  description: { type: 'string', max: 2000 }, venue: { type: 'string', max: 120 },
  date: { type: 'date', label: 'Event date' }, registrationDeadline: { type: 'date', label: 'Registration deadline' },
  mode: { type: 'string', required: true, enum: REG_MODES }, teamMin: { type: 'number', min: 1 }, teamMax: { type: 'number', min: 1 },
  formId: { type: 'string' }, rules: { type: 'string', max: 3000 },
};
function validateEvent(v) {
  if (!db.sports.where((s) => s.name === v.sport).length) throw validation('Choose a sport from the list.', [{ field: 'sport', message: 'Unknown sport.' }]);
  if (v.mode === 'team') {
    if (!v.teamMin || !v.teamMax) throw validation('Team events need a minimum and maximum team size.', [{ field: 'teamMin', message: 'Required for team events.' }]);
    if (v.teamMax < v.teamMin) throw validation('Maximum team size cannot be below the minimum.', [{ field: 'teamMax', message: 'Must be ≥ minimum.' }]);
  }
  if (v.formId && !db.forms.find(v.formId)) throw validation('Linked form does not exist.', [{ field: 'formId', message: 'Unknown form.' }]);
  if (v.date && v.registrationDeadline && v.registrationDeadline > v.date) throw validation('Registration deadline must be on or before the event date.', [{ field: 'registrationDeadline', message: 'After event date.' }]);
}
export const isOpenNow = (e) => e.status === 'open' && (!e.registrationDeadline || new Date().toISOString().slice(0, 10) <= e.registrationDeadline);

export function list({ q, sport, status, mode, forStudent } = {}) {
  let items = db.events.all();
  if (forStudent) items = items.filter((e) => e.status !== 'draft');
  if (q) items = items.filter((e) => `${e.title} ${e.sport} ${e.venue || ''}`.toLowerCase().includes(String(q).toLowerCase()));
  if (sport) items = items.filter((e) => e.sport === sport);
  if (status) items = items.filter((e) => e.status === status);
  if (mode) items = items.filter((e) => e.mode === mode);
  return items.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).map((e) => ({ ...e, acceptingRegistrations: isOpenNow(e) }));
}
export function get(id, { forStudent } = {}) {
  const e = db.events.find(id);
  if (!e || (forStudent && e.status === 'draft')) throw notFound('Event');
  return { ...e, acceptingRegistrations: isOpenNow(e) };
}
export function create(body) {
  const v = check(body, shape); validateEvent(v);
  return db.events.insert({ ...v, description: v.description || '', status: 'draft' });
}
export function update(id, body) {
  const cur = db.events.find(id); if (!cur) throw notFound('Event');
  const v = check(body, shape); validateEvent(v);
  if (cur.mode !== v.mode && rawExists(id)) throw conflict('The registration mode cannot change after registrations exist.');
  return db.events.update(id, v);
}
export function setStatus(id, status) {
  const e = db.events.find(id); if (!e) throw notFound('Event');
  if (!EVENT_STATUS.includes(status)) throw validation('Unknown status.');
  if (status === 'open') {
    const f = e.formId && db.forms.find(e.formId);
    if (!f) throw validation('Link a registration form before opening this event.');
    if (f.status !== 'published') throw validation('Publish the linked registration form before opening this event.');
  }
  const u = db.events.update(id, { status });
  if (status === 'open' && e.status === 'draft') notify({ type: 'new_event', title: `${e.title} — Registration Open`, message: `Registrations are now open for ${e.title}.`, link: `/student/events/${id}` });
  return u;
}
export function remove(id) {
  if (!db.events.find(id)) throw notFound('Event');
  if (rawExists(id)) throw conflict('This event has registration data and cannot be deleted. Close it instead.');
  db.schedule.where((s) => s.eventId === id).forEach((s) => db.schedule.remove(s.id));
  db.events.remove(id);
}
