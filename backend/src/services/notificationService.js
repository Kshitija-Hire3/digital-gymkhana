import { db } from '../store/jsonStore.js';
import { notFound } from '../utils/errors.js';

export function notify({ audience = 'all', type, title, message, link }) {
  return db.notifications.insert({ audience, type, title, message, link: link || null, readBy: [] });
}
export const notifyMany = (crns, payload) => [...new Set(crns)].forEach((crn) => notify({ ...payload, audience: crn }));
const mine = (crn) => db.notifications.where((n) => n.audience === 'all' || n.audience.toUpperCase() === crn.toUpperCase());
export function listFor(crn) {
  return mine(crn).map((n) => ({ ...n, read: n.readBy.includes(crn), readBy: undefined }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export const unreadCount = (crn) => listFor(crn).filter((n) => !n.read).length;
export function markRead(id, crn) {
  const n = mine(crn).find((x) => x.id === id); if (!n) throw notFound('Notification');
  if (!n.readBy.includes(crn)) db.notifications.update(id, { readBy: [...n.readBy, crn] });
}
export function markAllRead(crn) { mine(crn).forEach((n) => markRead(n.id, crn)); }
