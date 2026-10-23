import { str } from '../utils/helpers.js';

/** Convert an array-of-arrays sheet into {headers, rows:[{header: value}]}. */
export function aoaToTable(aoa) {
  if (!aoa || !aoa.length) return { headers: [], rows: [] };
  const headers = aoa[0].map((h) => str(h).trim());
  const rows = aoa.slice(1)
    .filter((r) => r.some((c) => str(c).trim() !== ''))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, str(r[i])]).filter(([h]) => h)));
  return { headers: headers.filter(Boolean), rows };
}
export async function readSheet(adapter, file, sheetName) {
  const wb = await adapter.read(file);
  if (!wb) return null;
  const name = sheetName in wb ? sheetName : null;
  if (!name) return { headers: [], rows: [], sheets: Object.keys(wb) };
  return { ...aoaToTable(wb[name]), sheets: Object.keys(wb) };
}
export const readSheetNames = async (adapter, file) => { const wb = await adapter.read(file); return wb ? Object.keys(wb) : null; };
