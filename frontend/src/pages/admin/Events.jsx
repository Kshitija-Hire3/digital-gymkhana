import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, qs, fieldErrors } from '../../services/api.js';
import { useAsync, useDebounced } from '../../hooks/useAsync.js';
import { Async, Card, PageHeader, Button, Filters, DataTable, SportBadge, StatusBadge, TextField, SelectField, Field, EmptyState, ConfirmDialog, eventStatus, fmtDate } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';

export function AdminEvents() {
  const [q, setQ] = useState(''); const [sport, setSport] = useState(''); const [status, setStatus] = useState(''); const dq = useDebounced(q); const navigate = useNavigate();
  const sports = useAsync(() => api.get('/sports'), []); const s = useAsync(() => api.get(`/events${qs({ q: dq, sport, status })}`), [dq, sport, status]);
  return (
    <div className="page"><PageHeader title="Events" sub="Create and manage sports events."><Button to="/admin/events/create">New Event</Button></PageHeader>
      <Filters>
        <input className="input search" placeholder="Search events…" aria-label="Search events" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" aria-label="Sport" value={sport} onChange={(e) => setSport(e.target.value)}><option value="">All sports</option>{(sports.data || []).map((x) => <option key={x.id}>{x.name}</option>)}</select>
        <select className="input" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{['draft', 'open', 'closed', 'completed'].map((x) => <option key={x}>{x}</option>)}</select>
      </Filters>
      <Card flush><Async state={s} empty={<EmptyState title="No events found" message="Create your first event to get started." action={<Button to="/admin/events/create">Create event</Button>} />}>
        {(rows) => <DataTable rows={rows} onRowClick={(e) => navigate(`/admin/events/${e.id}`)} columns={[
          { label: 'Event', render: (e) => <b>{e.title}</b> }, { label: 'Sport', render: (e) => <SportBadge sport={e.sport} /> }, { label: 'Date', render: (e) => fmtDate(e.date) },
          { label: 'Type', render: (e) => (e.mode === 'team' ? `Team (${e.teamMin}–${e.teamMax})` : 'Individual') }, { label: 'Status', render: (e) => <StatusBadge status={eventStatus(e)} /> }]} />}</Async></Card></div>
  );
}

const EMPTY = { title: '', sport: '', description: '', venue: '', date: '', registrationDeadline: '', mode: 'individual', teamMin: '', teamMax: '', formId: '', rules: '' };
export function EventForm() {
  const { id } = useParams(); const navigate = useNavigate(); const toast = useToast();
  const load = useAsync(async () => {
    const [sports, forms, ev] = await Promise.all([api.get('/sports'), api.get('/forms'), id ? api.get(`/events/${id}`) : null]);
    return { sports, forms, ev };
  }, [id]);
  return <div className="page"><PageHeader title={id ? 'Edit event' : 'Create event'}><Button variant="secondary" to={id ? `/admin/events/${id}` : '/admin/events'}>Cancel</Button></PageHeader>
    <Async state={load}>{({ sports, forms, ev }) => <EventFields key={ev?.id || 'new'} sports={sports} forms={forms} initial={ev ? { ...EMPTY, ...ev, teamMin: ev.teamMin ?? '', teamMax: ev.teamMax ?? '' } : EMPTY} id={id} navigate={navigate} toast={toast} />}</Async></div>;
}
function EventFields({ sports, forms, initial, id, navigate, toast }) {
  const [v, setV] = useState(initial); const [errors, setErrors] = useState({}); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    setBusy(true); setErr(''); setErrors({});
    const body = { ...v }; ['teamMin', 'teamMax'].forEach((k) => { if (body.mode !== 'team' || body[k] === '') delete body[k]; }); Object.keys(body).forEach((k) => { if (body[k] === '') delete body[k]; });
    try { const r = id ? await api.put(`/events/${id}`, body) : await api.post('/events', body); toast('Event saved', 'success'); navigate(`/admin/events/${r.id}`); }
    catch (e) { setErr(e.message); setErrors(fieldErrors(e)); } finally { setBusy(false); }
  };
  return (
    <Card><div className="stack">
      {err && <div className="alert error" role="alert">{err}</div>}
      <div className="grid form2">
        <TextField label="Event title" required value={v.title} onChange={set('title')} error={errors.title} />
        <SelectField label="Sport" required value={v.sport} onChange={set('sport')} error={errors.sport} placeholder="Select sport" options={sports.map((s) => s.name)} />
        <TextField label="Event date" type="date" value={v.date} onChange={set('date')} error={errors.date} />
        <TextField label="Registration deadline" type="date" value={v.registrationDeadline} onChange={set('registrationDeadline')} error={errors.registrationDeadline} />
        <TextField label="Venue" value={v.venue} onChange={set('venue')} />
        <SelectField label="Registration type" required value={v.mode} onChange={set('mode')} options={[{ value: 'individual', label: 'Individual' }, { value: 'team', label: 'Team (captain registers)' }]} />
        {v.mode === 'team' && <><TextField label="Minimum team size (incl. captain)" type="number" min="1" value={v.teamMin} onChange={set('teamMin')} error={errors.teamMin} /><TextField label="Maximum team size (incl. captain)" type="number" min="1" value={v.teamMax} onChange={set('teamMax')} error={errors.teamMax} /></>}
        <SelectField label="Registration form" value={v.formId} onChange={set('formId')} placeholder="None yet" options={forms.map((f) => ({ value: f.id, label: `${f.title} (${f.status})` }))} />
        <div className="field" style={{ justifyContent: 'end' }}><Link to="/admin/forms/create">+ Create a new form</Link></div>
      </div>
      <Field label="Description"><textarea className="input" value={v.description} onChange={set('description')} /></Field>
      <Field label="Rules"><textarea className="input" value={v.rules} onChange={set('rules')} /></Field>
      <div className="bottom-actions"><Button loading={busy} onClick={save}>Save event</Button></div>
    </div></Card>
  );
}

export function AdminEventDetail() {
  const { id } = useParams(); const navigate = useNavigate(); const toast = useToast();
  const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false);
  const s = useAsync(async () => { const [event, forms, regs] = await Promise.all([api.get(`/events/${id}`), api.get('/forms'), api.get(`/registrations${qs({ eventId: id })}`)]); return { event, form: forms.find((f) => f.id === event.formId), regs }; }, [id]);
  const setStatus = async (status) => { try { await api.patch(`/events/${id}/status`, { status }); toast(`Event is now ${status}`, 'success'); s.reload(); } catch (e) { toast(e.message, 'error'); } };
  const remove = async () => { setBusy(true); try { await api.del(`/events/${id}`); toast('Event deleted', 'success'); navigate('/admin/events'); } catch (e) { toast(e.message, 'error'); setConfirm(false); } finally { setBusy(false); } };
  return (
    <div className="page"><Async state={s}>{({ event: e, form, regs }) => (<>
      <PageHeader title={e.title} sub={`${e.sport} · ${fmtDate(e.date)}`}><Button variant="secondary" to="/admin/events">← Events</Button><Button variant="secondary" to={`/admin/events/${id}/edit`}>Edit</Button></PageHeader>
      <div className="grid two">
        <Card title="Details" action={<StatusBadge status={eventStatus(e)} />}>
          <dl className="kv"><dt>Venue</dt><dd>{e.venue || '—'}</dd><dt>Registration closes</dt><dd>{fmtDate(e.registrationDeadline)}</dd><dt>Type</dt><dd>{e.mode === 'team' ? `Team (${e.teamMin}–${e.teamMax} players)` : 'Individual'}</dd>
            <dt>Registration form</dt><dd>{form ? <Link to={`/admin/forms/${form.id}`}>{form.title}</Link> : 'None linked'} {form && <StatusBadge status={form.status} />}</dd><dt>Registrations</dt><dd><Link to={`/admin/registrations?eventId=${id}`}>{regs.length}</Link></dd>
            <dt>Description</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{e.description || '—'}</dd></dl>
        </Card>
        <Card title="Actions"><div className="stack">
          {e.status === 'draft' && <Button onClick={() => setStatus('open')}>Publish (open registrations)</Button>}
          {e.status === 'open' && <Button variant="secondary" onClick={() => setStatus('closed')}>Close registrations</Button>}
          {e.status === 'closed' && <Button onClick={() => setStatus('open')}>Reopen registrations</Button>}
          {(e.status === 'open' || e.status === 'closed') && <Button variant="secondary" onClick={() => setStatus('completed')}>Mark completed</Button>}
          {e.status === 'open' && <Button variant="secondary" onClick={() => setStatus('draft')}>Unpublish (back to draft)</Button>}
          <Button variant="danger" onClick={() => setConfirm(true)}>Delete event</Button></div></Card>
      </div>
      <ConfirmDialog open={confirm} danger title="Delete this event?" message="This removes the event and its schedule. Events with registration data cannot be deleted." confirmLabel="Delete" busy={busy} onConfirm={remove} onClose={() => setConfirm(false)} /></>)}</Async></div>
  );
}
