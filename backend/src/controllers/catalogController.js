import * as sports from '../services/sportService.js';
import * as events from '../services/eventService.js';
import * as forms from '../services/formService.js';
import { ok, created, wrap } from '../utils/respond.js';
import { isAdmin } from '../middleware/auth.js';
import { notFound, forbidden } from '../utils/errors.js';
import { ROLES } from '../utils/constants.js';

export const sport = {
  list: wrap((req, res) => ok(res, sports.list())),
  create: wrap((req, res) => created(res, sports.create(req.body))),
  update: wrap((req, res) => ok(res, sports.update(req.params.id, req.body))),
  remove: wrap((req, res) => { sports.remove(req.params.id); ok(res, { deleted: true }); }),
};
export const event = {
  list: wrap((req, res) => ok(res, events.list({ ...req.query, forStudent: !isAdmin(req.user) }))),
  get: wrap((req, res) => ok(res, events.get(req.params.id, { forStudent: !isAdmin(req.user) }))),
  create: wrap((req, res) => created(res, events.create(req.body))),
  update: wrap((req, res) => ok(res, events.update(req.params.id, req.body))),
  status: wrap((req, res) => ok(res, events.setStatus(req.params.id, req.body?.status))),
  remove: wrap((req, res) => { events.remove(req.params.id); ok(res, { deleted: true }); }),
};
export const form = {
  list: wrap((req, res) => ok(res, forms.list())),
  get: wrap((req, res) => {
    const f = forms.get(req.params.id);
    if (req.user.role === ROLES.STUDENT && f.status !== 'published') throw notFound('Form');
    ok(res, f);
  }),
  byEvent: wrap((req, res) => {
    const e = events.get(req.params.eventId, { forStudent: !isAdmin(req.user) });
    const f = forms.forEvent(e); if (!f || (!isAdmin(req.user) && f.status !== 'published')) throw notFound('Form');
    ok(res, f);
  }),
  create: wrap((req, res) => created(res, forms.create(req.body))),
  update: wrap((req, res) => ok(res, forms.update(req.params.id, req.body))),
  status: wrap((req, res) => ok(res, forms.setStatus(req.params.id, req.body?.status))),
  remove: wrap((req, res) => { forms.remove(req.params.id); ok(res, { deleted: true }); }),
};
void forbidden;
