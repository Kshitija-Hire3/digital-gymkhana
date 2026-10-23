import { db } from '../store/jsonStore.js';
import { check } from '../validators/schema.js';
import { notFound } from '../utils/errors.js';
import { notify } from './notificationService.js';

const shape = { title: { type: 'string', required: true, max: 140 }, body: { type: 'string', required: true, max: 3000, label: 'Message' } };
export const list = () => db.announcements.all().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export function create(body, admin) {
  const v = check(body, shape); const a = db.announcements.insert({ ...v, author: admin.name });
  notify({ type: 'announcement', title: v.title, message: v.body.slice(0, 160), link: '/student/notifications' }); return a;
}
export function update(id, body) { if (!db.announcements.find(id)) throw notFound('Announcement'); return db.announcements.update(id, check(body, shape)); }
export function remove(id) { if (!db.announcements.remove(id)) throw notFound('Announcement'); }
