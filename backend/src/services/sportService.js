import { db } from '../store/jsonStore.js';
import { check } from '../validators/schema.js';
import { notFound, conflict } from '../utils/errors.js';

const shape = { name: { type: 'string', required: true, max: 60, label: 'Sport name' }, description: { type: 'string', max: 300 } };
export const list = () => db.sports.all().sort((a, b) => a.name.localeCompare(b.name));
export function create(body) {
  const v = check(body, shape);
  if (db.sports.where((s) => s.name.toLowerCase() === v.name.toLowerCase()).length) throw conflict('That sport already exists.');
  return db.sports.insert(v);
}
export function update(id, body) {
  const v = check(body, shape); const s = db.sports.find(id); if (!s) throw notFound('Sport');
  if (db.sports.where((x) => x.id !== id && x.name.toLowerCase() === v.name.toLowerCase()).length) throw conflict('That sport already exists.');
  // keep events consistent when a sport is renamed
  if (s.name !== v.name) db.events.where((e) => e.sport === s.name).forEach((e) => db.events.update(e.id, { sport: v.name }));
  return db.sports.update(id, v);
}
export function remove(id) {
  const s = db.sports.find(id); if (!s) throw notFound('Sport');
  if (db.events.where((e) => e.sport === s.name).length) throw conflict('This sport is used by existing events and cannot be deleted.');
  db.sports.remove(id);
}
