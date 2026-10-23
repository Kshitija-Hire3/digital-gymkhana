// Small file-backed store for NON-registration metadata (events, forms, users, announcements ...).
// Registration responses are NOT stored here - they live in Excel (see ../excel).
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';
import { newId, nowIso } from '../utils/helpers.js';

const cache = new Map();
const fileOf = (name) => path.join(config.dataDir, 'store', `${name}.json`);

function load(name, fallback) {
  if (cache.has(name)) return cache.get(name);
  let data = fallback;
  try { data = JSON.parse(fs.readFileSync(fileOf(name), 'utf8')); } catch (e) {
    if (e.code !== 'ENOENT') console.error(`[store] could not read ${name}.json, using defaults:`, e.message);
  }
  cache.set(name, data);
  return data;
}
function save(name, data) {
  fs.mkdirSync(path.dirname(fileOf(name)), { recursive: true });
  const tmp = `${fileOf(name)}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, fileOf(name));
  cache.set(name, data);
}
export const resetCache = () => cache.clear();

export function collection(name, idPrefix = name.slice(0, 3)) {
  const items = () => load(name, []);
  return {
    all: () => items().slice(),
    find: (id) => items().find((x) => x.id === id) || null,
    where: (fn) => items().filter(fn),
    insert(obj) {
      const rec = { id: obj.id || newId(idPrefix), ...obj, createdAt: nowIso(), updatedAt: nowIso() };
      save(name, [...items(), rec]); return rec;
    },
    update(id, patch) {
      const list = items(); const i = list.findIndex((x) => x.id === id);
      if (i < 0) return null;
      const rec = { ...list[i], ...patch, id, updatedAt: nowIso() };
      const next = list.slice(); next[i] = rec; save(name, next); return rec;
    },
    remove(id) {
      const list = items(); const next = list.filter((x) => x.id !== id);
      if (next.length === list.length) return false;
      save(name, next); return true;
    },
    replaceAll: (list) => save(name, list),
    count: () => items().length,
  };
}
export function doc(name, defaults = {}) {
  return { get: () => load(name, defaults), set: (v) => save(name, v) };
}

export const db = {
  sports: collection('sports', 'spt'), events: collection('events', 'evt'), forms: collection('forms', 'frm'),
  students: collection('students', 'stu'), admins: collection('admins', 'adm'),
  announcements: collection('announcements', 'ann'), notifications: collection('notifications', 'ntf'),
  schedule: collection('schedule', 'sch'), certificates: collection('certificates', 'crt'),
  regIndex: collection('regIndex', 'idx'),          // registrationId -> eventId lookup only (data itself is in Excel)
  results: doc('results', {}),                      // { [eventId]: { published, entries:[...] } }
  processing: doc('processing', {}),                // { [eventId]: { status, summary, lastRunAt, error } }
  counters: doc('counters', {}),
};
export function nextCounter(key) {
  const c = { ...db.counters.get() }; c[key] = (c[key] || 0) + 1; db.counters.set(c); return c[key];
}
