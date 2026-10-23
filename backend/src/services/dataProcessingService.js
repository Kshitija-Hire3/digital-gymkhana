import { db } from '../store/jsonStore.js';
import { PROC_STATUS } from '../utils/constants.js';
import { AppError, notFound } from '../utils/errors.js';
import { getSettings } from './settingsService.js';
import * as formSvc from './formService.js';
import * as excel from '../excel/excelService.js';
import { buildSchema, extendWithFileHeaders } from '../excel/schemaMapper.js';
import { runPipeline } from '../excel/dataCleaner.js';

export const SHEETS = ['Clean', 'Needs Attention', 'Duplicates', 'Summary'];
const setState = (eventId, patch) => { const all = db.processing.get(); db.processing.set({ ...all, [eventId]: { ...(all[eventId] || { status: PROC_STATUS.NOT }), ...patch } }); };
const event = (id) => db.events.find(id) || (() => { throw notFound('Event'); })();

export function resetInterrupted() {
  const all = db.processing.get();
  for (const [id, s] of Object.entries(all)) if (s.status === PROC_STATUS.RUNNING) setState(id, { status: PROC_STATUS.FAILED, error: 'Processing was interrupted by a server restart. Please retry.' });
}
export async function status(eventId) {
  const e = event(eventId); const s = db.processing.get()[eventId] || { status: PROC_STATUS.NOT };
  let rows = 0, rawError = null;
  try { rows = (await excel.previewRaw(eventId, 0)).total; } catch (err) { rawError = err.message; }
  return { eventId, eventTitle: e.title, sport: e.sport, rawRows: rows, rawError, ...s, cleanFile: excel.fileInfo(excel.cleanPath(eventId)), rawFile: excel.fileInfo(excel.rawPath(eventId)) };
}
export const listAll = () => Promise.all(db.events.all().map((e) => status(e.id)));

export async function run(eventId) {
  const e = event(eventId);
  if (db.processing.get()[eventId]?.status === PROC_STATUS.RUNNING) throw new AppError(409, 'CONFLICT', 'Processing is already running for this event.');
  setState(eventId, { status: PROC_STATUS.RUNNING, error: null });
  try {
    const settings = getSettings();
    const raw = await excel.readRaw(eventId);
    if (!raw.rows.length) throw new AppError(422, 'NO_DATA', 'There are no registrations to process for this event.');
    const schema = extendWithFileHeaders(buildSchema(e, formSvc.forEvent(e), settings), raw.headers);
    const sport = db.sports.where((s) => s.name.toLowerCase() === e.sport.toLowerCase())[0];
    const r = runPipeline(raw.rows, schema, settings.normalization, { sportLabel: sport?.name || e.sport });
    const withIssues = [...schema.headers, 'Issues'];
    await excel.writeClean(eventId, {
      Clean: { headers: r.cleanHeaders, rows: r.clean },
      'Needs Attention': { headers: withIssues, rows: r.attention },
      Duplicates: { headers: [...withIssues, 'DuplicateOf'], rows: r.duplicates },
      Summary: { headers: ['Metric', 'Value'], rows: [
        { Metric: 'Event', Value: e.title }, { Metric: 'Processed rows', Value: r.summary.processed }, { Metric: 'Valid', Value: r.summary.valid },
        { Metric: 'Needs correction', Value: r.summary.needsCorrection }, { Metric: 'Duplicates', Value: r.summary.duplicates },
        { Metric: 'Processed at', Value: new Date().toISOString() },
        ...Object.entries(r.summary.byIssue).map(([k, v]) => ({ Metric: `Issue: ${k}`, Value: v }))] },
    });
    const attention = r.summary.needsCorrection + r.summary.duplicates > 0;
    setState(eventId, { status: attention ? PROC_STATUS.ATTENTION : PROC_STATUS.DONE, summary: r.summary, lastRunAt: new Date().toISOString(), error: null });
  } catch (err) {
    setState(eventId, { status: PROC_STATUS.FAILED, error: err.message });
    throw err;
  }
  return status(eventId);
}
export async function issues(eventId) {
  event(eventId);
  const [a, d] = await Promise.all([excel.readCleanSheet(eventId, 'Needs Attention'), excel.readCleanSheet(eventId, 'Duplicates')]);
  return { needsCorrection: a.rows, duplicates: d.rows };
}
export async function preview(eventId, kind, sheet, limit = 100) {
  event(eventId);
  if (kind === 'raw') { const p = await excel.previewRaw(eventId, limit); return { sheet: excel.RAW_SHEET, sheets: [excel.RAW_SHEET], ...p }; }
  const name = SHEETS.includes(sheet) ? sheet : 'Clean';
  const t = await excel.readCleanSheet(eventId, name);
  return { sheet: name, sheets: SHEETS, headers: t.headers, rows: t.rows.slice(0, limit), total: t.rows.length };
}
export function downloadPath(eventId, kind) {
  event(eventId); const file = kind === 'clean' ? excel.cleanPath(eventId) : excel.rawPath(eventId);
  if (!excel.fileInfo(file)) throw notFound(kind === 'clean' ? 'Cleaned Excel output' : 'Registration file');
  return { file, name: `${eventId}_${kind === 'clean' ? 'clean' : 'raw'}.xlsx` };
}
