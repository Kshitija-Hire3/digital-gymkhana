import * as auth from '../services/authService.js';
import { ok, wrap } from '../utils/respond.js';
export const studentLogin = wrap(async (req, res) => ok(res, await auth.studentLogin(req.body)));
export const adminLogin = wrap(async (req, res) => ok(res, await auth.adminLogin(req.body)));
export const logout = wrap(async (req, res) => { auth.logout(req.token); ok(res, { loggedOut: true }); });
export const me = wrap(async (req, res) => ok(res, auth.me(req.user)));
