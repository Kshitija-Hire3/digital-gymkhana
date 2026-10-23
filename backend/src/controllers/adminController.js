import * as dash from '../services/dashboardService.js';
import * as users from '../services/adminUserService.js';
import { getSettings, updateSettings } from '../services/settingsService.js';
import { ok, created, wrap } from '../utils/respond.js';
export default {
  studentDashboard: wrap(async (req, res) => ok(res, await dash.student(req.user))),
  dashboard: wrap(async (req, res) => ok(res, await dash.admin())),
  users: wrap((req, res) => ok(res, users.list())),
  createUser: wrap((req, res) => created(res, users.create(req.body))),
  updateUser: wrap((req, res) => ok(res, users.update(req.params.id, req.body || {}, req.user))),
  getSettings: wrap((req, res) => ok(res, getSettings())),
  putSettings: wrap((req, res) => ok(res, updateSettings(req.body || {}))),
};
