import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { Async, Card, StatCard, PageHeader, Button, SportBadge, StatusBadge, EmptyState, DataTable, eventStatus, fmtDate } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';

export default function AdminDashboard() {
  const s = useAsync(() => api.get('/admin/dashboard'), []); const navigate = useNavigate();
  return (
    <div className="page"><PageHeader title="Admin Dashboard" sub="Overview"><Button to="/admin/events/create"><Icon name="plus" size={16} /> New Event</Button></PageHeader>
      <Async state={s}>{(d) => (<>
        <div className="grid stats" style={{ marginBottom: 16 }}>
          <StatCard n={d.stats.activeEvents} label="Active Events" sub="Currently accepting registrations" /><StatCard n={d.stats.upcomingEvents} label="Upcoming Events" sub="Scheduled events" tone="navy" />
          <StatCard n={d.stats.pendingReview} label="Pending Review" sub="Registrations to review" tone="amber" /><StatCard n={d.stats.totalRegistrations} label="Total Registrations" sub="All events combined" tone="green" />
        </div>
        <div className="grid two">
          <div className="stack">
            <Card title="Recent Registrations" flush action={<Link to="/admin/registrations">View all →</Link>}>
              <DataTable rows={d.recentRegistrations} pageSize={5} onRowClick={(r) => navigate(`/admin/registrations/${r.id}`)}
                empty={<EmptyState title="No registrations yet" message="They will appear here as students register." />}
                columns={[{ label: 'ID', render: (r) => <span className="mono muted">{r.id}</span> }, { label: 'Student / Team', render: (r) => <div><b>{r.mode === 'team' ? `${r.name} (Captain)` : r.name}</b><div className="muted small">{r.crn}</div></div> },
                  { label: 'Sport', render: (r) => <SportBadge sport={r.sport} /> }, { label: 'Status', render: (r) => <StatusBadge status={r.status} /> }]} /></Card>
            <Card title="Events" flush action={<Link to="/admin/events">Manage →</Link>}>
              {d.events.length === 0 ? <EmptyState title="No events yet" action={<Button to="/admin/events/create">Create event</Button>} /> : d.events.map((e) => (
                <Link key={e.id} to={`/admin/events/${e.id}`} className="list-row"><div className="main"><div className="title">{e.title}</div><div className="row small" style={{ gap: 8 }}><SportBadge sport={e.sport} /><span className="muted">{fmtDate(e.date)}</span></div></div><StatusBadge status={eventStatus(e)} /></Link>))}</Card>
          </div>
          <div className="stack">
            <Card title="Data Processing" flush action={<Link to="/admin/data-processing">View →</Link>}>
              {d.processing.length === 0 ? <EmptyState title="No events" /> : d.processing.map((p) => (
                <Link key={p.eventId} to="/admin/data-processing" className="list-row"><div className="main"><div className="title">{p.sport}</div><div className="muted small">{p.rawRows} rows</div></div><StatusBadge status={p.status} /></Link>))}</Card>
            <Card title="Announcements" flush action={<Link to="/admin/announcements">Manage →</Link>}>
              {d.announcements.length === 0 ? <EmptyState title="No announcements" /> : d.announcements.map((a) => <div key={a.id} className="list-row"><div className="main"><div className="title" style={{ fontSize: 13 }}>{a.title}</div><div className="muted small">{a.author} · {fmtDate(a.createdAt)}</div></div></div>)}
              <div style={{ padding: 16 }}><Button variant="secondary" to="/admin/announcements">New Announcement</Button></div></Card>
          </div>
        </div></>)}</Async></div>
  );
}
