import { useParams } from 'react-router-dom';
import { api, qs } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { Async, Card, PageHeader, Button, SportBadge, StatusBadge, eventStatus, fmtDate, EmptyState } from '../../components/ui.jsx';

export default function EventDetail() {
  const { id } = useParams();
  const s = useAsync(async () => {
    const [event, mine, schedule] = await Promise.all([api.get(`/events/${id}`), api.get('/registrations/mine'), api.get(`/schedule${qs({ eventId: id })}`)]);
    return { event, schedule, registration: mine.find((r) => r.eventId === id) };
  }, [id]);
  return (
    <div className="page"><Async state={s}>{({ event: e, schedule, registration }) => (<>
      <PageHeader title={e.title} sub={e.venue}><Button variant="secondary" to="/student/events">← All events</Button></PageHeader>
      <div className="grid two">
        <Card title="About this event">
          <div className="row" style={{ marginBottom: 12 }}><SportBadge sport={e.sport} /><StatusBadge status={eventStatus(e)} /></div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{e.description || 'No description provided.'}</p>
          {e.rules && <><h3 style={{ margin: '16px 0 4px' }}>Rules</h3><p style={{ whiteSpace: 'pre-wrap' }}>{e.rules}</p></>}
          <dl className="kv" style={{ marginTop: 16 }}>
            <dt>Date</dt><dd>{fmtDate(e.date)}</dd><dt>Venue</dt><dd>{e.venue || '—'}</dd><dt>Registration closes</dt><dd>{fmtDate(e.registrationDeadline)}</dd>
            <dt>Type</dt><dd>{e.mode === 'team' ? `Team — ${e.teamMin} to ${e.teamMax} players including captain` : 'Individual'}</dd>
          </dl>
        </Card>
        <div className="stack">
          <Card title="Registration">
            {registration ? (<div className="stack"><div className="alert ok">You're registered ({registration.id}).</div><StatusBadge status={registration.status} /><Button to={`/student/registrations/${registration.id}`}>View registration</Button></div>)
              : e.acceptingRegistrations ? <div className="stack"><p className="muted">{e.mode === 'team' ? 'The team captain registers the whole team.' : 'Register yourself for this event.'}</p><Button to={`/student/register/${e.id}`} block>{e.mode === 'team' ? 'Register as captain' : 'Register now'}</Button></div>
              : <div className="alert warn">Registrations are closed for this event.</div>}
          </Card>
          <Card title="Schedule" flush>{schedule.length === 0 ? <EmptyState title="Not scheduled yet" /> : schedule.map((x) => (
            <div key={x.id} className="list-row"><div className="main"><div className="title">{x.title}</div><div className="muted small">{fmtDate(x.date)} {x.time} {x.venue && `· ${x.venue}`}</div></div></div>))}</Card>
        </div>
      </div></>)}</Async></div>
  );
}
