import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, qs } from '../../services/api.js';
import { useAsync, useDebounced } from '../../hooks/useAsync.js';
import { Async, Card, PageHeader, Button, Filters, DataTable, StatusBadge, SportBadge, EmptyState, Badge, fmtDateTime } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';

const STATUSES = ['Submitted', 'Under Review', 'Approved', 'Rejected'];
export function AdminRegistrations() {
  const navigate = useNavigate(); const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(''); const dq = useDebounced(q); const eventId = sp.get('eventId') || ''; const status = sp.get('status') || '';
  const events = useAsync(() => api.get('/events'), []); const s = useAsync(() => api.get(`/registrations${qs({ q: dq, eventId, status })}`), [dq, eventId, status]);
  const setParam = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  return (
    <div className="page"><PageHeader title="Registrations" sub="Review and manage registrations." />
      <Filters>
        <input className="input search" placeholder="Search by name, CRN, ID or team…" aria-label="Search registrations" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" aria-label="Event" value={eventId} onChange={(e) => setParam('eventId', e.target.value)}><option value="">All events</option>{(events.data || []).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select>
        <select className="input" aria-label="Status" value={status} onChange={(e) => setParam('status', e.target.value)}><option value="">All statuses</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
      </Filters>
      <Card flush><Async state={s} empty={<EmptyState title="No registrations found" message="Nothing matches the current filters, or no one has registered yet." />}>
        {(rows) => <DataTable rows={rows} onRowClick={(r) => navigate(`/admin/registrations/${r.id}`)} columns={[
          { label: 'ID', render: (r) => <span className="mono muted">{r.id}</span> }, { label: 'Student / Team', render: (r) => <div><b>{r.mode === 'team' ? `${r.teamName} — ${r.name} (Captain)` : r.name}</b><div className="muted small">{r.crn}</div></div> },
          { label: 'Event', key: 'eventTitle' }, { label: 'Sport', render: (r) => <SportBadge sport={r.sport} /> }, { label: 'Status', render: (r) => <StatusBadge status={r.status} /> }]} />}</Async></Card></div>
  );
}
export function AdminRegistrationDetail() {
  const { id } = useParams(); const toast = useToast(); const [busy, setBusy] = useState(''); const s = useAsync(() => api.get(`/registrations/${id}`), [id]);
  const setStatus = async (status) => { setBusy(status); try { await api.patch(`/registrations/${id}/status`, { status }); toast(`Marked ${status}`, 'success'); s.reload(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); } };
  return (
    <div className="page"><PageHeader title="Registration" sub={id}><Button variant="secondary" to="/admin/registrations">← Registrations</Button></PageHeader>
      <Async state={s}>{(r) => (<div className="grid two">
        <Card title={r.eventTitle} action={<StatusBadge status={r.status} />}><dl className="kv">
          <dt>Student</dt><dd>{r.name} ({r.crn})</dd><dt>Mobile / Email</dt><dd>{r.phone || '—'} · {r.email || '—'}</dd><dt>Branch / Class</dt><dd>{r.branch} · {r.class} · Div {r.division} · {r.shift}</dd><dt>Submitted</dt><dd>{fmtDateTime(r.submittedAt)}</dd><dt>Mode</dt><dd>{r.mode}</dd>
          {r.mode === 'team' && <><dt>Team</dt><dd>{r.teamName} ({r.teamSize} players)</dd><dt>Members</dt><dd>{r.teamMembers.map((m) => `${m.name} (${m.crn})`).join(', ')}</dd></>}
          {Object.entries(r.answers).map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}</dl></Card>
        <Card title="Review"><div className="stack"><p className="muted">Changing the status updates the Excel record and notifies the student{r.mode === 'team' ? ' and team members' : ''}.</p>
          {STATUSES.filter((x) => x !== r.status).map((x) => <Button key={x} variant={x === 'Rejected' ? 'danger' : x === 'Approved' ? '' : 'secondary'} loading={busy === x} disabled={!!busy} onClick={() => setStatus(x)}>Mark {x}</Button>)}</div></Card></div>)}</Async></div>
  );
}
export function Participants() {
  const [q, setQ] = useState(''); const s = useAsync(() => api.get('/participants'), []);
  return (
    <div className="page"><PageHeader title="Participants" sub="Everyone registered across events, including team members." />
      <div className="filters"><input className="input search" placeholder="Search by name or CRN…" aria-label="Search participants" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Card flush><Async state={s} empty={<EmptyState title="No participants yet" message="Participants appear once students register." />}>
        {(rows) => { const f = rows.filter((p) => `${p.name} ${p.crn}`.toLowerCase().includes(q.toLowerCase())); return <DataTable rows={f} rowKey={(p) => p.crn} empty={<EmptyState title="No matches" />} columns={[
          { label: 'Name', render: (p) => <b>{p.name}</b> }, { label: 'CRN', render: (p) => <span className="mono">{p.crn}</span> }, { label: 'Branch', key: 'branch' }, { label: 'Class', key: 'class' }, { label: 'Division', key: 'division' },
          { label: 'Events', render: (p) => p.events.map((e) => <Badge key={e.registrationId}>{e.eventTitle} · {e.role}</Badge>).reduce((a, b) => [a, ' ', b]) }]} />; }}</Async></Card></div>
  );
}
export function Teams() {
  const navigate = useNavigate(); const s = useAsync(() => api.get('/teams'), []);
  return (
    <div className="page"><PageHeader title="Teams" sub="Team registrations across events." />
      <Card flush><Async state={s} empty={<EmptyState title="No teams yet" message="Team registrations appear once captains submit them." />}>
        {(rows) => <DataTable rows={rows} onRowClick={(t) => navigate(`/admin/registrations/${t.id}`)} columns={[
          { label: 'Team', render: (t) => <b>{t.teamName}</b> }, { label: 'Event', key: 'eventTitle' }, { label: 'Captain', render: (t) => `${t.name} (${t.crn})` }, { label: 'Players', key: 'teamSize' }, { label: 'Status', render: (t) => <StatusBadge status={t.status} /> }]} />}</Async></Card></div>
  );
}
