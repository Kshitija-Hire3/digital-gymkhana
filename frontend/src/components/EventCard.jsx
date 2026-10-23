import { Link } from 'react-router-dom';
import { SportBadge, StatusBadge, eventStatus, fmtDate } from './ui.jsx';
import Icon from './Icon.jsx';

export function EventCard({ event, to, registered }) {
  return (
    <Link to={to} className="card" style={{ padding: 16, color: 'inherit', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><SportBadge sport={event.sport} /><StatusBadge status={eventStatus(event)} /></div>
      <div style={{ fontWeight: 600, fontSize: 16 }}>{event.title}</div>
      <div className="muted small row" style={{ gap: 6 }}><Icon name="calendar" size={14} /> {fmtDate(event.date)} · {event.mode === 'team' ? `Team (${event.teamMin}–${event.teamMax})` : 'Individual'}</div>
      <div className="muted small">Registration closes {fmtDate(event.registrationDeadline)}{registered ? ' · ' : ''}{registered && <b style={{ color: 'var(--green)' }}>Registered</b>}</div>
    </Link>
  );
}
export function RegistrationCard({ reg, to }) {
  return (
    <Link to={to} className="list-row" style={{ color: 'inherit', textDecoration: 'none' }}>
      <div className="main"><div className="title">{reg.eventTitle}</div><div className="row small" style={{ gap: 8 }}><SportBadge sport={reg.sport} /><span className="mono muted">{reg.id}</span>{reg.role && reg.role !== 'Participant' && <span className="muted">{reg.role}</span>}</div></div>
      <StatusBadge status={reg.status} />
    </Link>
  );
}
