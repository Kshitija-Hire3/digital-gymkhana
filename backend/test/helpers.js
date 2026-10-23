import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function tmpDataDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-'));
  process.env.DATA_DIR = d; process.env.SEED_DEMO_DATA = 'true'; process.env.NODE_ENV = 'test';
  return d;
}
/** In-memory stand-in for xlsxAdapter (the real one needs the `xlsx` package). Writes a placeholder so fs.existsSync works. */
export function memoryAdapter() {
  const files = new Map();
  return {
    files,
    async read(file) { if (!files.has(file)) return null; const v = files.get(file); if (v === 'CORRUPT') { const { AppError } = await import('../src/utils/errors.js'); throw new AppError(422, 'EXCEL_CORRUPT', 'corrupt'); } return JSON.parse(JSON.stringify(v)); },
    async write(file, sheets) { files.set(file, JSON.parse(JSON.stringify(sheets))); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, 'placeholder'); },
  };
}
