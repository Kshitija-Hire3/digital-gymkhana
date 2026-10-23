import { str } from '../utils/helpers.js';

export const tableToAoa = ({ headers, rows }) => [headers, ...rows.map((r) => headers.map((h) => str(r[h])))];
/** Write named tables ({name: {headers, rows}}) to a workbook. */
export async function writeTables(adapter, file, tables) {
  const sheets = {};
  for (const [name, t] of Object.entries(tables)) sheets[name] = tableToAoa(t);
  await adapter.write(file, sheets);
}
