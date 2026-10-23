import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { Async, Card, PageHeader, EmptyState, StatusBadge, SportBadge, Badge, Button, DataTable, fmtDate } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';

export function History() {
  const s = useAsync(async () => {
    const [regs, results] = await Promise.all([api.get('/registrations/mine'), api.get('/results/mine')]);
    const today = new Date().toISOString().slice(0, 10);
    return regs.filter((r) => r.eventDate && r.eventDate < today).map((r) => ({ ...r, outcome: results.find((x) => x.event.id === r.eventId)?.entries.find((e) => e.mine)?.outcome || '' }));
  }, []);
  return (
    <div className="page"><PageHeader title="Participation History" sub="Events you have taken part in." />
      <Card flush><Async state={s} empty={<EmptyState title="No past participation yet" message="Events you register for appear here once they have been played." />}>
        {(rows) => <DataTable rows={rows} columns={[
          { label: 'Event', render: (r) => <b>{r.eventTitle}</b> }, { label: 'Sport', render: (r) => <SportBadge sport={r.sport} /> },
          { label: 'Date', render: (r) => fmtDate(r.eventDate) }, { label: 'Role', key: 'role' }, { label: 'Status', render: (r) => <StatusBadge status={r.status} /> }, { label: 'Outcome', render: (r) => r.outcome || '—' }]} />}</Async></Card></div>
  );
}
export function Results() {
  const s = useAsync(() => api.get('/results/mine'), []);
  return (
    <div className="page"><PageHeader title="Results" sub="Published results for events you took part in." />
      <Async state={s} empty={<Card><EmptyState title="No results published yet" message="Results appear here once the organizers publish them." /></Card>}>
        {(list) => <div className="stack">{list.map(({ event, entries }) => (
          <Card key={event.id} title={event.title} flush><DataTable pageSize={20} rows={entries} rowKey={(e) => e.registrationId} columns={[
            { label: 'Position', key: 'position' }, { label: 'Participant / Team', render: (e) => <span>{e.participant}{e.mine && <> <Badge tone="blue">You</Badge></>}</span> }, { label: 'Outcome', key: 'outcome' }, { label: 'Remarks', key: 'remarks' }]} /></Card>))}</div>}
      </Async></div>
  );
}
export function Certificates() {
  const toast = useToast(); const s = useAsync(() => api.getFull('/certificates'), []);
  const download = async (c) => { try { await api.get(`/certificates/${c.id}/download`); } catch (e) { toast(e.message, 'error'); } };
  return (
    <div className="page"><PageHeader title="Certificates" sub="Your certificate records." />
      <Async state={{ ...s, data: s.data && s.data.data }} empty={<Card><EmptyState title="No certificate records yet" message="Records appear here after events are completed." /></Card>}>
        {(list) => (<>
          {!s.data.meta?.generatorConfigured && <div className="alert warn" style={{ marginBottom: 12 }}>Certificate file downloads are not available yet. Your records are listed below and will be downloadable once certificate generation is enabled.</div>}
          <div className="grid cards">{list.map((c) => (
            <Card key={c.id}><div className="stack"><div><b>{c.eventTitle}</b><div className="muted small">{c.name}</div></div>
              <div className="row"><Badge tone="amber">{c.type}</Badge><span className="muted small">Issued {fmtDate(c.issuedAt)}</span></div>
              <Button variant="secondary" disabled={!c.downloadable} onClick={() => download(c)}>{c.downloadable ? 'Download' : 'Download unavailable'}</Button></div></Card>))}</div></>)}
      </Async></div>
  );
}
