// Thin wrapper around the `xlsx` package so the rest of the Excel layer is testable without it.
import fs from 'node:fs';
import path from 'node:path';
import { AppError } from '../utils/errors.js';

let XLSX;
async function lib() {
  if (!XLSX) { const m = await import('xlsx'); XLSX = m.default || m; }
  return XLSX;
}
export const xlsxAdapter = {
  /** @returns {Promise<Record<string, string[][]>|null>} sheets as arrays of rows; null when file is missing */
  async read(file) {
    if (!fs.existsSync(file)) return null;
    const X = await lib();
    try {
      const wb = X.readFile(file, { cellDates: false });
      const out = {};
      for (const n of wb.SheetNames) out[n] = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false, blankrows: false });
      return out;
    } catch (e) {
      throw new AppError(422, 'EXCEL_CORRUPT', 'The Excel file could not be read. It may be corrupted.', e.message);
    }
  },
  async write(file, sheets) {
    const X = await lib();
    const wb = X.utils.book_new();
    for (const [name, aoa] of Object.entries(sheets)) X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), name.slice(0, 31));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    X.writeFile(wb, tmp, { bookType: 'xlsx' });
    fs.renameSync(tmp, file);
  },
};
