import * as schedule from '../services/scheduleService.js';
import * as results from '../services/resultService.js';
import * as ann from '../services/announcementService.js';
import * as notif from '../services/notificationService.js';
import * as certs from '../services/certificateService.js';
import { ok, created, wrap } from '../utils/respond.js';
import { isAdmin } from '../middleware/auth.js';

export const scheduleC = {
  list: wrap((req, res) => ok(res, schedule.list(req.query))),
  create: wrap((req, res) => created(res, schedule.create(req.body))),
  update: wrap((req, res) => ok(res, schedule.update(req.params.id, req.body))),
  remove: wrap((req, res) => { schedule.remove(req.params.id); ok(res, { deleted: true }); }),
};
export const resultC = {
  mine: wrap(async (req, res) => ok(res, await results.listForStudent(req.user))),
  get: wrap(async (req, res) => ok(res, await results.getForEvent(req.params.eventId))),
  save: wrap(async (req, res) => ok(res, await results.save(req.params.eventId, req.body))),
};
export const annC = {
  list: wrap((req, res) => ok(res, ann.list())),
  create: wrap((req, res) => created(res, ann.create(req.body, { name: req.user.name }))),
  update: wrap((req, res) => ok(res, ann.update(req.params.id, req.body))),
  remove: wrap((req, res) => { ann.remove(req.params.id); ok(res, { deleted: true }); }),
};
export const notifC = {
  list: wrap((req, res) => ok(res, notif.listFor(req.user.crn), { unread: notif.unreadCount(req.user.crn) })),
  read: wrap((req, res) => { notif.markRead(req.params.id, req.user.crn); ok(res, { read: true }); }),
  readAll: wrap((req, res) => { notif.markAllRead(req.user.crn); ok(res, { read: true }); }),
};
export const certC = {
  list: wrap((req, res) => ok(res, isAdmin(req.user) ? certs.listAll() : certs.listForStudent(req.user.crn), { generatorConfigured: certs.generator.configured })),
  issue: wrap(async (req, res) => created(res, await certs.issueRecord(req.body || {}))),
  remove: wrap((req, res) => { certs.removeRecord(req.params.id); ok(res, { deleted: true }); }),
  download: wrap(async (req, res) => { await certs.download(req.params.id, req.user); ok(res, {}); }),
};
