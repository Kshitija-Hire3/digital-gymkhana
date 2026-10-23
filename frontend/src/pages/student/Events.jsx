import { useState } from 'react';
import { api, qs } from '../../services/api.js';
import { useAsync, useDebounced } from '../../hooks/useAsync.js';
import { Async, PageHeader, Filters, EmptyState, Pagination, Button } from '../../components/ui.jsx';
import { EventCard } from '../../components/EventCard.jsx';

const PAGE = 9;
export default function Events() {
  const [q, setQ] = useState(''); const [sport, setSport] = useState(''); const [mode, setMode] = useState(''); const [open, setOpen] = useState(''); const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const sports = useAsync(() => api.get('/sports'), []);
  const events = useAsync(() => api.get(`/events${qs({ q: dq, sport, mode })}`), [dq, sport, mode]);
  const reset = () => { setQ(''); setSport(''); setMode(''); setOpen(''); setPage(1); };
  return (
    <div className="page"><PageHeader title="Events" sub="Browse and register for sports events." />
      <Filters>
        <input className="input search" placeholder="Search events…" aria-label="Search events" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input" aria-label="Sport" value={sport} onChange={(e) => { setSport(e.target.value); setPage(1); }}><option value="">All sports</option>{(sports.data || []).map((s) => <option key={s.id}>{s.name}</option>)}</select>
        <select className="input" aria-label="Type" value={mode} onChange={(e) => { setMode(e.target.value); setPage(1); }}><option value="">Individual & team</option><option value="individual">Individual</option><option value="team">Team</option></select>
        <select className="input" aria-label="Availability" value={open} onChange={(e) => { setOpen(e.target.value); setPage(1); }}><option value="">All events</option><option value="open">Open for registration</option></select>
      </Filters>
      <Async state={events} empty={<EmptyState title="No events found" message="Try changing your search or filters." action={<Button variant="secondary" onClick={reset}>Clear filters</Button>} />}>
        {(all) => {
          const list = open ? all.filter((e) => e.acceptingRegistrations) : all;
          if (!list.length) return <EmptyState title="No events found" message="Try changing your search or filters." action={<Button variant="secondary" onClick={reset}>Clear filters</Button>} />;
          const pages = Math.ceil(list.length / PAGE);
          return (<><div className="grid cards">{list.slice((page - 1) * PAGE, page * PAGE).map((e) => <EventCard key={e.id} event={e} to={`/student/events/${e.id}`} />)}</div><Pagination page={page} pages={pages} onPage={setPage} /></>);
        }}
      </Async>
    </div>
  );
}
