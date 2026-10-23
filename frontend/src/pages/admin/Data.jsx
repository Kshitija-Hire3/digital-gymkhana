import { useState } from 'react';
import { api, qs } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { Async, Card, PageHeader, Button, DataTable, StatusBadge, SportBadge, SelectField, ErrorState, Loading, EmptyState, StatCard, fmtDateTime } from '../../components/ui.jsx';
import ExcelPreview from '../../components/ExcelPreview.jsx';
import { useToast } from '../../components/Toast.jsx';
import Icon from '../../components/Icon.jsx';

const TABS = [['raw', 'Raw data', 'raw', null], ['clean', 'Cleaned data', 'clean', 'Clean'], ['attention', 'Needs correction', 'clean', 'Needs Attention'], ['dups', 'Duplicates', 'clean', 'Duplicates']];

function SheetPreview({ eventId, kind, sheet, tick }) {
  const s = useAsync(() => api.get(`/excel/${eventId}/preview${qs({ kind, sheet })}`), [eventId, kind, sheet, tick]);
  return <Async state={s}>{(d) => <ExcelPreview data={{ ...d, sheets: undefined }} />}</Async>;
}
function useDownload(toast) {
  return async (eventId, kind) => { try { await api.download(`/excel/${eventId}/download${qs({ kind })}`, `${eventId}_${kind}.xlsx`); } catch (e) { toast(e.message, 'error'); } };
}

export function DataProcessing() {
  const toast = useToast(); const download = useDownload(toast);
  const [sport, setSport] = useState(''); const [eventId, setEventId] = useState(''); const [tab, setTab] = useState('raw'); const [running, setRunning] = useState(false); const [runErr, setRunErr] = useState(''); const [tick, setTick] = useState(0);
  const list = useAsync(() => api.get('/data-processing'), []); const sports = useAsync(() => api.get('/sports'), []);
  const run = async () => {
    setRunning(true); setRunErr('');
    try { await api.post(`/data-processing/${eventId}/run`); toast('Processing finished', 'success'); setTab('clean'); setTick((t) => t + 1); } catch (e) { setRunErr(e.message); }
    finally { setRunning(false); list.reload(); }
  };
  const rows = (list.data || []).filter((r) => !sport || r.sport === sport); const sel = (list.data || []).find((r) => r.eventId === eventId);
  const [, , kind, sheet] = TABS.find((t) => t[0] === tab);
  return (
    <div className="page"><PageHeader title="Data Processing" sub="Validate, clean and standardize registration data stored in Excel."><Button variant="secondary" onClick={list.reload}><Icon name="refresh" size={16} /> Refresh</Button></PageHeader>
      <div className="filters"><select className="input" aria-label="Sport" value={sport} onChange={(e) => { setSport(e.target.value); setEventId(''); }}><option value="">All sports</option>{(sports.data || []).map((s) => <option key={s.id}>{s.name}</option>)}</select></div>
      <Card title="Events" flush><Async state={list} empty={<EmptyState title="No events" />}>{() => (
        <DataTable rows={rows} rowKey={(r) => r.eventId} onRowClick={(r) => { setEventId(r.eventId); setRunErr(''); setTab('raw'); }} empty={<EmptyState title="No events for this sport" />} columns={[
          { label: 'Event', render: (r) => <b style={{ color: r.eventId === eventId ? 'var(--primary)' : undefined }}>{r.eventTitle}</b> }, { label: 'Sport', render: (r) => <SportBadge sport={r.sport} /> }, { label: 'Rows', key: 'rawRows' },
          { label: 'Valid / Fix / Dup', render: (r) => (r.summary ? `${r.summary.valid} / ${r.summary.needsCorrection} / ${r.summary.duplicates}` : '—') }, { label: 'Last run', render: (r) => fmtDateTime(r.lastRunAt) }, { label: 'Status', render: (r) => <StatusBadge status={r.status} /> }]} />)}</Async></Card>
      {sel && (<div className="stack" style={{ marginTop: 16 }}>
        <Card title={sel.eventTitle} action={<StatusBadge status={running ? 'Processing' : sel.status} />}><div className="stack">
          {sel.rawError && <div className="alert error" role="alert">The registration file could not be read: {sel.rawError}</div>}
          {(runErr || (sel.status === 'Failed' && sel.error)) && <div className="alert error" role="alert">{runErr || sel.error}</div>}
          <div className="row"><Button loading={running} disabled={sel.rawRows === 0} onClick={run}><Icon name="refresh" size={16} /> {sel.status === 'Failed' ? 'Retry processing' : sel.status === 'Not Processed' ? 'Run validation & cleaning' : 'Re-run processing'}</Button>
            <Button variant="secondary" disabled={!sel.cleanFile} onClick={() => download(sel.eventId, 'clean')}><Icon name="download" size={16} /> Cleaned Excel</Button><Button variant="secondary" disabled={!sel.rawFile} onClick={() => download(sel.eventId, 'raw')}><Icon name="download" size={16} /> Raw Excel</Button></div>
          {sel.rawRows === 0 && <p className="muted">There are no registrations to process yet.</p>}
          {sel.summary && sel.status !== 'Not Processed' && <div className="grid stats"><StatCard n={sel.summary.processed} label="Processed" sub="rows" /><StatCard n={sel.summary.valid} label="Valid" sub="ready to use" tone="green" /><StatCard n={sel.summary.needsCorrection} label="Needs correction" sub="see issues" tone="amber" /><StatCard n={sel.summary.duplicates} label="Duplicates" sub="excluded from clean sheet" tone="navy" /></div>}
        </div></Card>
        <Card title="Preview" flush><div className="row" style={{ padding: '12px 16px' }}>{TABS.map(([k, l]) => <Button key={k} size="sm" variant={k === tab ? '' : 'secondary'} onClick={() => setTab(k)}>{l}</Button>)}</div>
          <SheetPreview eventId={eventId} kind={kind} sheet={sheet} tick={tick + (sel.lastRunAt || '')} /></Card></div>)}
      {!sel && !list.loading && <p className="muted small" style={{ marginTop: 12 }}>Select an event to inspect and process its data.</p>}
    </div>
  );
}

export function ExcelData() {
  const toast = useToast(); const download = useDownload(toast); const s = useAsync(() => api.get('/excel/files'), []); const [view, setView] = useState(null);
  const size = (f) => (f ? `${(f.sizeBytes / 1024).toFixed(1)} KB` : '—');
  return (
    <div className="page"><PageHeader title="Excel Data" sub="Registration workbooks (one per event) and their cleaned output." />
      <Card flush><Async state={s} empty={<EmptyState title="No events" />}>{(rows) => <DataTable rows={rows} rowKey={(r) => r.eventId} columns={[
        { label: 'Event', render: (r) => <b>{r.eventTitle}</b> }, { label: 'Raw file', render: (r) => (r.raw ? `${size(r.raw)} · ${fmtDateTime(r.raw.modifiedAt)}` : 'No registrations yet') }, { label: 'Cleaned file', render: (r) => (r.clean ? `${size(r.clean)} · ${fmtDateTime(r.clean.modifiedAt)}` : 'Not processed') },
        { label: '', render: (r) => <div className="row"><Button size="sm" variant="secondary" disabled={!r.raw} onClick={() => setView({ id: r.eventId, kind: 'raw', title: r.eventTitle })}>View raw</Button><Button size="sm" variant="secondary" disabled={!r.clean} onClick={() => setView({ id: r.eventId, kind: 'clean', title: r.eventTitle })}>View clean</Button>
          <Button size="sm" variant="ghost" disabled={!r.raw} onClick={() => download(r.eventId, 'raw')}><Icon name="download" size={16} /></Button></div> }]} />}</Async></Card>
      {view && <div style={{ marginTop: 16 }}><Card title={`${view.title} — ${view.kind === 'raw' ? 'raw registrations' : 'cleaned data'}`} flush action={<Button size="sm" variant="secondary" onClick={() => setView(null)}>Close</Button>}><SheetPreview eventId={view.id} kind={view.kind} sheet={view.kind === 'clean' ? 'Clean' : undefined} tick={0} /></Card></div>}
    </div>
  );
}
void ErrorState; void Loading;
