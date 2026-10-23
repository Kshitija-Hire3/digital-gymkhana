import { db } from '../store/jsonStore.js';
import { check } from '../validators/schema.js';
import { notFound, validation } from '../utils/errors.js';
import { notify } from './notificationService.js';

const shape = { eventId: { type: 'string', required: true }, title: { type: 'string', required: true, max: 120 }, date: { type: 'date', required: true },
  time: { type: 'string', max: 20 }, venue: { type: 'string', max: 120 }, round: { type: 'string', max: 60 }, notes: { type: 'string', max: 300 } };
const build = (body) => { const v = check(body, shape); if (!db.events.find(v.eventId)) throw validation('Unknown event.', [{ field: 'eventId', message: 'Unknown event.' }]);
  if (v.time && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(v.time)) throw validation('Time must be HH:MM (24-hour).', [{ field: 'time', message: 'Use HH:MM.' }]); return v; };
export const list = ({ eventId } = {}) => db.schedule.all().filter((s) => !eventId || s.eventId === eventId)
  .map((s) => ({ ...s, eventTitle: db.events.find(s.eventId)?.title || '—' })).sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));
export function create(body) { const v = build(body); const s = db.schedule.insert(v);
  notify({ type: 'schedule', title: `Schedule Update — ${db.events.find(v.eventId).title}`, message: `${v.title} on ${v.date}${v.time ? ' at ' + v.time : ''}.`, link: '/student/events/' + v.eventId }); return s; }
export function update(id, body) { if (!db.schedule.find(id)) throw notFound('Schedule item'); return db.schedule.update(id, build(body)); }
export function remove(id) { if (!db.schedule.remove(id)) throw notFound('Schedule item'); }
