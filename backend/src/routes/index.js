import { Router } from 'express';
import { anyUser, studentOnly, adminOnly, superOnly } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import * as auth from '../controllers/authController.js';
import { sport, event, form } from '../controllers/catalogController.js';
import reg from '../controllers/registrationController.js';
import { scheduleC, resultC, annC, notifC, certC } from '../controllers/opsController.js';
import { dpC, excelC } from '../controllers/dataController.js';
import admin from '../controllers/adminController.js';

const r = Router();
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: (req) => `${req.ip}:${String(req.body?.crn || req.body?.email || '').toLowerCase()}` });
const lookupLimit = rateLimit({ windowMs: 60 * 1000, max: 30, key: (req) => req.ip });

r.get('/health', (_q, s) => s.json({ success: true, data: { status: 'ok' } }));
// auth
r.post('/auth/student/login', loginLimit, auth.studentLogin);
r.post('/auth/admin/login', loginLimit, auth.adminLogin);
r.post('/auth/logout', anyUser, auth.logout);
r.get('/auth/me', anyUser, auth.me);
// sports / events / forms
r.get('/sports', anyUser, sport.list);
r.post('/sports', adminOnly, sport.create); r.put('/sports/:id', adminOnly, sport.update); r.delete('/sports/:id', adminOnly, sport.remove);
r.get('/events', anyUser, event.list); r.get('/events/:id', anyUser, event.get);
r.post('/events', adminOnly, event.create); r.put('/events/:id', adminOnly, event.update);
r.patch('/events/:id/status', adminOnly, event.status); r.delete('/events/:id', adminOnly, event.remove);
r.get('/forms', adminOnly, form.list); r.get('/forms/by-event/:eventId', anyUser, form.byEvent); r.get('/forms/:id', anyUser, form.get);
r.post('/forms', adminOnly, form.create); r.put('/forms/:id', adminOnly, form.update);
r.patch('/forms/:id/status', adminOnly, form.status); r.delete('/forms/:id', adminOnly, form.remove);
// registrations
r.post('/registrations', studentOnly, reg.submit);
r.get('/registrations/mine', studentOnly, reg.mine); r.get('/registrations/mine/:id', studentOnly, reg.mineOne);
r.get('/registrations/lookup/:crn', studentOnly, lookupLimit, reg.lookup);
r.get('/registrations', adminOnly, reg.list); r.get('/registrations/:id', adminOnly, reg.get);
r.patch('/registrations/:id/status', adminOnly, reg.status);
r.get('/participants', adminOnly, reg.participants); r.get('/teams', adminOnly, reg.teams);
// schedule / results / announcements / notifications / certificates
r.get('/schedule', anyUser, scheduleC.list);
r.post('/schedule', adminOnly, scheduleC.create); r.put('/schedule/:id', adminOnly, scheduleC.update); r.delete('/schedule/:id', adminOnly, scheduleC.remove);
r.get('/results/mine', studentOnly, resultC.mine);
r.get('/results/event/:eventId', adminOnly, resultC.get); r.put('/results/event/:eventId', adminOnly, resultC.save);
r.get('/announcements', anyUser, annC.list);
r.post('/announcements', adminOnly, annC.create); r.put('/announcements/:id', adminOnly, annC.update); r.delete('/announcements/:id', adminOnly, annC.remove);
r.get('/notifications', studentOnly, notifC.list); r.post('/notifications/read-all', studentOnly, notifC.readAll); r.post('/notifications/:id/read', studentOnly, notifC.read);
r.get('/certificates', anyUser, certC.list); r.post('/certificates', adminOnly, certC.issue);
r.delete('/certificates/:id', adminOnly, certC.remove); r.get('/certificates/:id/download', anyUser, certC.download);
// excel + data processing
r.get('/excel/files', adminOnly, excelC.files);
r.get('/excel/:eventId/preview', adminOnly, excelC.preview); r.get('/excel/:eventId/download', adminOnly, excelC.download);
r.get('/data-processing', adminOnly, dpC.list); r.get('/data-processing/:eventId', adminOnly, dpC.status);
r.post('/data-processing/:eventId/run', adminOnly, dpC.run); r.get('/data-processing/:eventId/issues', adminOnly, dpC.issues);
// dashboards, admin
r.get('/dashboard/student', studentOnly, admin.studentDashboard);
r.get('/admin/dashboard', adminOnly, admin.dashboard);
r.get('/admin/users', superOnly, admin.users); r.post('/admin/users', superOnly, admin.createUser); r.patch('/admin/users/:id', superOnly, admin.updateUser);
r.get('/admin/settings', adminOnly, admin.getSettings); r.put('/admin/settings', superOnly, admin.putSettings);
export default r;
