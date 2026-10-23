import { db } from '../store/jsonStore.js';
import * as regSvc from './registrationService.js';
import * as eventSvc from './eventService.js';
import * as certSvc from './certificateService.js';
import * as notifSvc from './notificationService.js';
import * as dp from './dataProcessingService.js';

const today = () => new Date().toISOString().slice(0, 10);
export async function student(user) {
  const mine = await regSvc.listMine(user);
  const open = eventSvc.list({ forStudent: true }).filter((e) => e.acceptingRegistrations);
  const registered = new Set(mine.map((r) => r.eventId));
  const certs = certSvc.listForStudent(user.crn);
  const profile = db.students.where((s) => s.crn === user.crn)[0];
  return {
    profile: { name: profile.name, crn: profile.crn, branch: profile.branch, class: profile.class, division: profile.division, shift: profile.shift },
    stats: { openRegistrations: open.length, myRegistrations: mine.length,
      upcomingEvents: mine.filter((r) => r.eventDate && r.eventDate >= today()).length, certificates: certs.length },
    openEvents: open.slice(0, 5).map((e) => ({ ...e, registered: registered.has(e.id) })),
    registrations: mine.slice(0, 5),
    notifications: notifSvc.listFor(user.crn).slice(0, 4), unreadNotifications: notifSvc.unreadCount(user.crn),
  };
}
export async function admin() {
  const events = eventSvc.list(); const regs = await regSvc.listAll();
  return {
    stats: { activeEvents: events.filter((e) => e.acceptingRegistrations).length,
      upcomingEvents: events.filter((e) => e.status !== 'draft' && e.status !== 'completed' && e.date && e.date >= today()).length,
      pendingReview: regs.filter((r) => r.status === 'Submitted' || r.status === 'Under Review').length, totalRegistrations: regs.length },
    recentRegistrations: regs.slice(0, 5), events: events.slice(0, 5),
    processing: (await dp.listAll()).map(({ eventId, eventTitle, sport, rawRows, status }) => ({ eventId, eventTitle, sport, rawRows, status })),
    announcements: db.announcements.all().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3),
    pendingBadge: regs.filter((r) => r.status === 'Submitted').length,
  };
}
