import * as dp from '../services/dataProcessingService.js';
import * as excel from '../excel/excelService.js';
import { db } from '../store/jsonStore.js';
import { ok, wrap } from '../utils/respond.js';

const limit = (q) => Math.min(Math.max(parseInt(q.limit, 10) || 100, 1), 500);
export const dpC = {
  list: wrap(async (req, res) => ok(res, await dp.listAll())),
  status: wrap(async (req, res) => ok(res, await dp.status(req.params.eventId))),
  run: wrap(async (req, res) => ok(res, await dp.run(req.params.eventId))),
  issues: wrap(async (req, res) => ok(res, await dp.issues(req.params.eventId))),
  preview: wrap(async (req, res) => ok(res, await dp.preview(req.params.eventId, req.query.kind === 'raw' ? 'raw' : 'clean', req.query.sheet, limit(req.query)))),
};
export const excelC = {
  files: wrap(async (req, res) => ok(res, db.events.all().map((e) => ({ eventId: e.id, eventTitle: e.title, sport: e.sport,
    raw: excel.fileInfo(excel.rawPath(e.id)), clean: excel.fileInfo(excel.cleanPath(e.id)) })))),
  preview: dpC.preview,
  download: wrap((req, res, next) => {
    const { file, name } = dp.downloadPath(req.params.eventId, req.query.kind === 'clean' ? 'clean' : 'raw');
    res.download(file, name, (err) => { if (err && !res.headersSent) next(err); });
  }),
};
