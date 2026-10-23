import { useState } from 'react';
import { api, qs, fieldErrors } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { Async, Card, PageHeader, Button, DataTable, Dialog, ConfirmDialog, TextField, SelectField, Field, EmptyState, Badge, fmtDate } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';

/** Shared dialog-driven CRUD helper for simple admin lists. */
function useCrud(base, reload, toast) {
  const [errors, setErrors] = useState({}); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const save = async (id, body, done) => {
    setBusy(true); setErr(''); setErrors({});
    try { id ? await api.put(`${base}/${id}`, body) : await api.post(base, body); toast('Saved', 'success'); done(); reload(); }
    catch (e) { setErr(e.message); setErrors(fieldErrors(e)); } finally { setBusy(false); }
  };
  const remove = async (id, done) => { setBusy(true); try { await api.del(`${base}/${id}`); toast('Deleted', 'success'); reload(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); done(); } };
  return { errors, err, busy, save, remove, reset: () => { setErr(''); setErrors({}); } };
}

export function Schedule() {
  const toast = useToast(); const s = useAsync(async () => { const [items, events] = await Promise.all([api.get('/schedule'), api.get('/events')]); return { items, events }; }, []);
  const [edit, setEdit] = useState(null); const [del, setDel] = useState(null); const crud = useCrud('/schedule', s.reload, toast);
  const open = (item) => { crud.reset(); setEdit(item || { eventId: '', title: '', date: '', time: '', venue: '', round: '', notes: '' }); };
  const set = (k) => (e) => setEdit((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div className="page"><PageHeader title="Schedule" sub="Fixtures and timings. Adding an item notifies students."><Button onClick={() => open()} disabled={!s.data?.events.length}>Add item</Button></PageHeader>
      <Card flush><Async state={s} empty={null}>{({ items }) => <DataTable rows={items} empty={<EmptyState title="Nothing scheduled" message="Add fixtures for your events." />} columns={[
        { label: 'Date', render: (x) => fmtDate(x.date) }, { label: 'Time', render: (x) => x.time || '—' }, { label: 'Event', key: 'eventTitle' }, { label: 'Item', render: (x) => <b>{x.title}</b> }, { label: 'Venue', render: (x) => x.venue || '—' },
        { label: '', render: (x) => <div className="row"><Button size="sm" variant="secondary" onClick={() => open(x)}>Edit</Button><Button size="sm" variant="danger" onClick={() => setDel(x)}>Delete</Button></div> }]} />}</Async></Card>
      <Dialog open={!!edit} title={edit?.id ? 'Edit schedule item' : 'Add schedule item'} onClose={() => setEdit(null)} footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button loading={crud.busy} onClick={() => crud.save(edit.id, { eventId: edit.eventId, title: edit.title, date: edit.date, time: edit.time, venue: edit.venue, round: edit.round, notes: edit.notes }, () => setEdit(null))}>Save</Button></>}>
        {edit && <div className="stack">{crud.err && <div className="alert error" role="alert">{crud.err}</div>}
          <SelectField label="Event" required value={edit.eventId} onChange={set('eventId')} placeholder="Select event" error={crud.errors.eventId} options={(s.data?.events || []).map((e) => ({ value: e.id, label: e.title }))} />
          <TextField label="Title" required value={edit.title} onChange={set('title')} error={crud.errors.title} /><div className="grid form2"><TextField label="Date" type="date" required value={edit.date} onChange={set('date')} error={crud.errors.date} /><TextField label="Time (24h)" type="time" value={edit.time} onChange={set('time')} error={crud.errors.time} /></div>
          <TextField label="Venue" value={edit.venue} onChange={set('venue')} /><TextField label="Round" value={edit.round} onChange={set('round')} /></div>}</Dialog>
      <ConfirmDialog open={!!del} danger title="Delete schedule item?" message={`Delete "${del?.title}"?`} confirmLabel="Delete" busy={crud.busy} onConfirm={() => crud.remove(del.id, () => setDel(null))} onClose={() => setDel(null)} /></div>
  );
}

export function Announcements() {
  const toast = useToast(); const s = useAsync(() => api.get('/announcements'), []); const [edit, setEdit] = useState(null); const [del, setDel] = useState(null); const crud = useCrud('/announcements', s.reload, toast);
  return (
    <div className="page"><PageHeader title="Announcements" sub="Posting an announcement notifies all students."><Button onClick={() => { crud.reset(); setEdit({ title: '', body: '' }); }}>New Announcement</Button></PageHeader>
      <Card flush><Async state={s} empty={<EmptyState title="No announcements yet" />}>{(rows) => rows.map((a) => (
        <div key={a.id} className="list-row" style={{ alignItems: 'flex-start' }}><div className="main"><div className="title">{a.title}</div><div className="muted" style={{ whiteSpace: 'pre-wrap' }}>{a.body}</div><div className="muted small">{a.author} · {fmtDate(a.createdAt)}</div></div>
          <Button size="sm" variant="secondary" onClick={() => { crud.reset(); setEdit(a); }}>Edit</Button><Button size="sm" variant="danger" onClick={() => setDel(a)}>Delete</Button></div>))}</Async></Card>
      <Dialog open={!!edit} title={edit?.id ? 'Edit announcement' : 'New announcement'} onClose={() => setEdit(null)} footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button loading={crud.busy} onClick={() => crud.save(edit.id, { title: edit.title, body: edit.body }, () => setEdit(null))}>Publish</Button></>}>
        {edit && <div className="stack">{crud.err && <div className="alert error" role="alert">{crud.err}</div>}<TextField label="Title" required value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} error={crud.errors.title} />
          <Field label="Message" required error={crud.errors.body}><textarea className="input" value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field></div>}</Dialog>
      <ConfirmDialog open={!!del} danger title="Delete announcement?" message={`Delete "${del?.title}"?`} confirmLabel="Delete" busy={crud.busy} onConfirm={() => crud.remove(del.id, () => setDel(null))} onClose={() => setDel(null)} /></div>
  );
}

export function AdminResults() {
  const toast = useToast(); const events = useAsync(() => api.get('/events'), []); const [eventId, setEventId] = useState('');
  const res = useAsync(() => (eventId ? api.get(`/results/event/${eventId}`) : Promise.resolve(null)), [eventId]);
  return (
    <div className="page"><PageHeader title="Results" sub="Enter results and choose when students can see them." />
      <div className="filters"><select className="input" aria-label="Event" value={eventId} onChange={(e) => setEventId(e.target.value)}><option value="">Select an event…</option>{(events.data || []).map((e) => <option key={e.id} value={e.id}>{e.title} ({e.sport})</option>)}</select></div>
      {!eventId ? <Card><EmptyState title="Choose an event" message="Pick an event to enter results for its registrations." /></Card>
        : <Async state={res}>{(d) => <ResultsEditor key={eventId + (d.published ? 'p' : 'u')} data={d} eventId={eventId} toast={toast} onSaved={res.reload} />}</Async>}</div>
  );
}
function ResultsEditor({ data, eventId, toast, onSaved }) {
  const [rows, setRows] = useState(data.entries); const [published, setPublished] = useState(data.published); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (i, k, v) => setRows((l) => l.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const save = async () => { setBusy(true); setErr(''); try { await api.put(`/results/event/${eventId}`, { published, entries: rows }); toast('Results saved', 'success'); onSaved(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  if (!rows.length) return <Card><EmptyState title="No registrations for this event" message="Results can be entered once there are registrations." /></Card>;
  return (
    <Card title={data.event.title} action={<Badge tone={published ? 'green' : ''}>{published ? 'Published' : 'Not published'}</Badge>}><div className="stack">
      {err && <div className="alert error" role="alert">{err}</div>}
      {rows.map((r, i) => (<div key={r.registrationId} className="fb-field"><div className="row" style={{ marginBottom: 8 }}><b>{r.participant}</b><span className="mono muted">{r.registrationId}</span></div>
        <div className="grid form2"><TextField label="Position" value={r.position} onChange={(e) => set(i, 'position', e.target.value)} maxLength={30} /><TextField label="Outcome / status" value={r.outcome} onChange={(e) => set(i, 'outcome', e.target.value)} maxLength={60} /></div>
        <div style={{ marginTop: 8 }}><TextField label="Remarks" value={r.remarks} onChange={(e) => set(i, 'remarks', e.target.value)} maxLength={300} /></div></div>))}
      <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Publish results to students (sends a notification the first time)</label>
      <div className="bottom-actions"><Button loading={busy} onClick={save}>Save results</Button></div></div></Card>
  );
}

export function AdminCertificates() {
  const toast = useToast(); const s = useAsync(async () => { const [certs, regs] = await Promise.all([api.getFull('/certificates'), api.get(`/registrations${qs({ status: 'Approved' })}`)]); return { certs: certs.data, meta: certs.meta, regs }; }, []);
  const [open, setOpen] = useState(false); const [regId, setRegId] = useState(''); const [type, setType] = useState('participation'); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [del, setDel] = useState(null);
  const issue = async () => { setBusy(true); setErr(''); try { await api.post('/certificates', { registrationId: regId, type }); toast('Certificate records created', 'success'); setOpen(false); s.reload(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  const remove = async () => { try { await api.del(`/certificates/${del.id}`); toast('Record removed', 'success'); s.reload(); } catch (e) { toast(e.message, 'error'); } setDel(null); };
  return (
    <div className="page"><PageHeader title="Certificates" sub="Certificate records for approved registrations."><Button onClick={() => { setErr(''); setRegId(''); setOpen(true); }}>Issue records</Button></PageHeader>
      <div className="alert warn" style={{ marginBottom: 12 }}>Certificate file generation is not implemented yet (workflow to be decided). Records are stored and shown to students; downloads stay disabled until a generator is plugged into the certificate service.</div>
      <Card flush><Async state={s} empty={null}>{({ certs }) => <DataTable rows={certs} empty={<EmptyState title="No certificate records" message="Issue records for approved registrations." />} columns={[
        { label: 'Student', render: (c) => <div><b>{c.name}</b><div className="muted small">{c.crn}</div></div> }, { label: 'Event', key: 'eventTitle' }, { label: 'Type', render: (c) => <Badge tone="amber">{c.type}</Badge> }, { label: 'Issued', render: (c) => fmtDate(c.issuedAt) },
        { label: '', render: (c) => <Button size="sm" variant="danger" onClick={() => setDel(c)}>Remove</Button> }]} />}</Async></Card>
      <Dialog open={open} title="Issue certificate records" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={busy} disabled={!regId} onClick={issue}>Issue</Button></>}>
        <div className="stack">{err && <div className="alert error" role="alert">{err}</div>}
          <SelectField label="Approved registration" value={regId} onChange={(e) => setRegId(e.target.value)} placeholder="Select…" options={(s.data?.regs || []).map((r) => ({ value: r.id, label: `${r.id} — ${r.mode === 'team' ? r.teamName : r.name} (${r.eventTitle})` }))} />
          <SelectField label="Type" value={type} onChange={(e) => setType(e.target.value)} options={['participation', 'achievement', 'winner', 'runner-up']} />
          <p className="muted small">For team registrations, a record is created for every team member.</p></div></Dialog>
      <ConfirmDialog open={!!del} danger title="Remove record?" message={`Remove the ${del?.type} record for ${del?.name}?`} confirmLabel="Remove" onConfirm={remove} onClose={() => setDel(null)} /></div>
  );
}
