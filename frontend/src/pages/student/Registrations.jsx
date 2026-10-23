import { useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { Async, Card, PageHeader, Button, StatusBadge, SportBadge, EmptyState, fmtDate, fmtDateTime } from '../../components/ui.jsx';
import { RegistrationCard } from '../../components/EventCard.jsx';

export function Registrations() {
  const s = useAsync(() => api.get('/registrations/mine'), []);
  return (
    <div className="page"><PageHeader title="My Registrations" sub="Every event you've registered for, as captain, member or participant." />
      <Card flush><Async state={s} empty={<EmptyState title="No registrations yet" message="Find an event and register to see it here." action={<Button to="/student/events">Browse events</Button>} />}>
        {(rows) => rows.map((r) => <RegistrationCard key={r.id} reg={r} to={`/student/registrations/${r.id}`} />)}</Async></Card></div>
  );
}
export function RegistrationDetail() {
  const { id } = useParams(); const s = useAsync(() => api.get(`/registrations/mine/${id}`), [id]);
  return (
    <div className="page"><PageHeader title="Registration" sub={id}><Button variant="secondary" to="/student/registrations">← All registrations</Button></PageHeader>
      <Async state={s}>{(r) => (
        <Card title={r.eventTitle} action={<StatusBadge status={r.status} />}>
          <dl className="kv">
            <dt>Sport</dt><dd><SportBadge sport={r.sport} /></dd><dt>Your role</dt><dd>{r.role}</dd><dt>Event date</dt><dd>{fmtDate(r.eventDate)}</dd><dt>Submitted</dt><dd>{fmtDateTime(r.submittedAt)}</dd>
            <dt>Captain / participant</dt><dd>{r.name} ({r.crn})</dd>
            {r.mode === 'team' && <><dt>Team</dt><dd>{r.teamName}</dd><dt>Members</dt><dd>{r.teamMembers.map((m) => `${m.name} (${m.crn})`).join(', ') || '—'}</dd></>}
            {Object.entries(r.answers || {}).map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}
          </dl>
        </Card>)}</Async></div>
  );
}
