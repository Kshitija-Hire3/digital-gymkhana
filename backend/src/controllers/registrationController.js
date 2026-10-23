import * as reg from '../services/registrationService.js';
import { ok, created, wrap } from '../utils/respond.js';
export default {
  submit: wrap(async (req, res) => created(res, await reg.submit(req.user, req.body))),
  mine: wrap(async (req, res) => ok(res, await reg.listMine(req.user))),
  mineOne: wrap(async (req, res) => ok(res, await reg.getMine(req.user, req.params.id))),
  lookup: wrap((req, res) => { const s = reg.lookupStudent(req.params.crn, req.user.crn); ok(res, s); }),
  list: wrap(async (req, res) => ok(res, await reg.listAll(req.query))),
  get: wrap(async (req, res) => ok(res, await reg.getById(req.params.id))),
  status: wrap(async (req, res) => ok(res, await reg.setStatus(req.params.id, req.body?.status))),
  participants: wrap(async (req, res) => ok(res, await reg.participants())),
  teams: wrap(async (req, res) => ok(res, await reg.teams())),
};
