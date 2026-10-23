import { Button, EmptyState } from './ui.jsx';

export default function ExcelPreview({ data, sheet, onSheet }) {
  if (!data) return null;
  return (
    <div>
      {data.sheets?.length > 1 && <div className="row" style={{ padding: '12px 16px' }}>{data.sheets.map((s) => <Button key={s} size="sm" variant={s === (sheet || data.sheet) ? '' : 'secondary'} onClick={() => onSheet(s)}>{s}</Button>)}</div>}
      {!data.rows.length ? <EmptyState title="This sheet is empty" /> : (
        <div className="table-wrap" style={{ maxHeight: 420, overflow: 'auto' }}>
          <table className="table"><thead><tr>{data.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{data.rows.map((r, i) => <tr key={i}>{data.headers.map((h) => <td key={h} style={{ whiteSpace: 'nowrap' }}>{r[h]}</td>)}</tr>)}</tbody></table>
        </div>)}
      <p className="muted small" style={{ padding: '8px 16px' }}>Showing {data.rows.length} of {data.total} rows.</p>
    </div>
  );
}
