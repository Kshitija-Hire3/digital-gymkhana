import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { Async, Card, StatCard, Button, SportBadge, StatusBadge, EmptyState, fmtDate } from '../../components/ui.jsx';
import { RegistrationCard } from '../../components/EventCard.jsx';
import Icon from '../../components/Icon.jsx';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
export default function Dashboard() {
  const s = useAsync(() => api.get('/dashboard/student'), []);
  return (
    <div className="page"><Async state={s}>{(d) => (<>
      <div className="page-head"><div><h1>{greeting()}, {d.profile.name.split(' ')[0]}</h1><p>{d.profile.crn} · {d.profile.branch} · {d.profile.class} · Div {d.profile.division} · {d.profile.shift}</p></div></div>
      <div className="grid stats" style={{ marginBottom: 16 }}>
        <StatCard n={d.stats.openRegistrations} label="Open Registrations" sub="Events accepting entries" />
        <StatCard n={d.stats.myRegistrations} label="My Registrations" sub="Events registered for" tone="navy" />
        <StatCard n={d.stats.upcomingEvents} label="Upcoming Events" sub="Yet to be played" tone="green" />
        <StatCard n={d.stats.certificates} label="Certificates" sub="Records available" tone="amber" />
      </div>
      <div className="grid two">
        <div className="stack">
          <Card title="Open Registrations" flush action={<Link to="/student/events">View all →</Link>}>
            {d.openEvents.length === 0 ? <EmptyState title="No events are open right now" message="Check back soon for new events." /> : d.openEvents.map((e) => (
              <Link key={e.id} to={`/student/events/${e.id}`} className="list-row">
                <div className="icon-box"><Icon name="calendar" /></div>
                <div className="main"><div className="title">{e.title}</div><div className="row small" style={{ gap: 8 }}><SportBadge sport={e.sport} /><span className="muted">Closes {fmtDate(e.registrationDeadline)}</span></div></div>
                {e.registered ? <StatusBadge status="Submitted" /> : <StatusBadge status="Open" />}
              </Link>))}
            <div style={{ padding: 16 }}><Button to="/student/events">Browse All Events</Button></div>
          </Card>
          <Card title="My Registrations" flush action={<Link to="/student/registrations">View all →</Link>}>
            {d.registrations.length === 0 ? <EmptyState title="No registrations yet" message="Register for an event to see it here." /> : d.registrations.map((r) => <RegistrationCard key={r.id} reg={r} to={`/student/registrations/${r.id}`} />)}
          </Card>
        </div>
        <div className="stack">
          <Card title="Quick Actions"><div className="grid form2">
            {[['Browse Events', '/student/events', 'calendar'], ['Registrations', '/student/registrations', 'clipboard'], ['Certificates', '/student/certificates', 'award'], ['History', '/student/history', 'clock']].map(([l, to, i]) => (
              <Link key={l} to={to} className="card" style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', textDecoration: 'none' }}><div style={{ color: 'var(--primary)' }}><Icon name={i} size={22} /></div><div className="small" style={{ marginTop: 6 }}>{l}</div></Link>))}
          </div></Card>
          <Card title={`Notifications${d.unreadNotifications ? ` (${d.unreadNotifications})` : ''}`} flush action={<Link to="/student/notifications">All →</Link>}>
            {d.notifications.length === 0 ? <EmptyState title="You're all caught up" /> : d.notifications.map((n) => (
              <Link key={n.id} to="/student/notifications" className="list-row" style={{ alignItems: 'flex-start' }}>
                {!n.read ? <span className="dot" style={{ marginTop: 6 }} /> : <span style={{ width: 7 }} />}<div className="main"><div className="title" style={{ fontSize: 13 }}>{n.title}</div><div className="muted small">{n.message}</div></div></Link>))}
          </Card>
        </div>
      </div></>)}</Async></div>
  );
}
