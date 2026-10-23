// Single entry point for all Excel persistence. Controllers/services never touch files directly.
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';
import { xlsxAdapter } from './xlsxAdapter.js';
import { readSheet } from './excelReader.js';
import { writeTables } from './excelWriter.js';
import { rowToRecord, recordToValues, valuesToRow } from './schemaMapper.js';
import { AppError, notFound } from '../utils/errors.js';

let adapter = xlsxAdapter;
export const setAdapter = (a) => { adapter = a || xlsxAdapter; };

export const RAW_SHEET = 'Registrations';
const safeId = (id) => { if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new AppError(400, 'BAD_REQUEST', 'Invalid event id.'); return id; };
export const rawPath = (eventId) => path.join(config.dataDir, 'excel', 'raw', `${safeId(eventId)}.xlsx`);
export const cleanPath = (eventId) => path.join(config.dataDir, 'excel', 'clean', `${safeId(eventId)}_clean.xlsx`);

// Serialise writes per file so concurrent submissions cannot overwrite each other.
const locks = new Map();
function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  const run = prev.then(fn);
  const tail = run.then(() => {}, () => {});       // never rejects, so the chain cannot raise unhandled rejections
  locks.set(key, tail);
  tail.then(() => { if (locks.get(key) === tail) locks.delete(key); });
  return run;
}

export async function readRaw(eventId) {
  const t = await readSheet(adapter, rawPath(eventId), RAW_SHEET);
  return t || { headers: [], rows: [], sheets: [] };
}
export const rawExists = (eventId) => fs.existsSync(rawPath(eventId));

/** Append one registration. Existing columns are preserved; new schema columns are added (union of headers). */
export function appendRegistration(eventId, schema, record) {
  return withLock(rawPath(eventId), async () => {
    const { headers: existing, rows } = await readRaw(eventId);
    const headers = [...existing]; const have = new Set(existing.map((h) => h.toLowerCase()));
    for (const h of schema.headers) if (!have.has(h.toLowerCase())) headers.push(h);
    rows.push(valuesToRow(recordToValues(record), schema));
    await writeTables(adapter, rawPath(eventId), { [RAW_SHEET]: { headers, rows } });
    return record;
  });
}
export async function listRegistrations(eventId, settings) {
  const { rows } = await readRaw(eventId);
  return rows.map((r) => ({ ...rowToRecord(r, settings), eventId }));
}
export function updateRegistration(eventId, regId, patch, schema, settings) {
  return withLock(rawPath(eventId), async () => {
    const { headers, rows } = await readRaw(eventId);
    const idH = settings.excel.metaHeaders.id;
    const i = rows.findIndex((r) => r[idH] === regId);
    if (i < 0) throw notFound('Registration');
    const values = recordToValues({ ...rowToRecord(rows[i], settings), eventId, ...patch });
    // only touch columns that the patch concerns (status) to avoid clobbering unknown columns
    for (const c of schema.columns) if (c.source === 'meta' && c.key in patch) rows[i][c.header] = String(values[c.key] ?? '');
    await writeTables(adapter, rawPath(eventId), { [RAW_SHEET]: { headers, rows } });
    return rowToRecord(rows[i], settings);
  });
}
export function writeClean(eventId, tables) {
  return withLock(cleanPath(eventId), () => writeTables(adapter, cleanPath(eventId), tables));
}
export async function readCleanSheet(eventId, sheet) {
  const t = await readSheet(adapter, cleanPath(eventId), sheet);
  if (!t) throw new AppError(404, 'NOT_FOUND', 'No cleaned output exists yet. Run data processing first.');
  return t;
}
export const fileInfo = (file) => {
  if (!fs.existsSync(file)) return null;
  const s = fs.statSync(file); return { sizeBytes: s.size, modifiedAt: s.mtime.toISOString() };
};
export async function previewRaw(eventId, limit = 50) {
  if (!rawExists(eventId)) return { headers: [], rows: [], total: 0 };
  const t = await readRaw(eventId);
  return { headers: t.headers, rows: t.rows.slice(0, limit), total: t.rows.length };
}
