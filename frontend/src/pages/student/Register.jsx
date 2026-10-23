import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, fieldErrors } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { Async, Card, PageHeader, Button, TextField, Field, ErrorState, fmtDate } from '../../components/ui.jsx';
import { DynamicForm, clientValidate } from '../../components/DynamicForm.jsx';
import ScanButton, { extractCrn } from '../../components/ScanButton.jsx';
import StudentDetails from '../../components/StudentDetails.jsx';
import { useToast } from '../../components/Toast.jsx';
import Icon from '../../components/Icon.jsx';

export default function Register() {
  const { eventId } = useParams();
  const s = useAsync(async () => {
    const [event, form, me] = await Promise.all([api.get(`/events/${eventId}`), api.get(`/forms/by-event/${eventId}`), api.get('/auth/me')]);
    return { event, form, me };
  }, [eventId]);
  return <div className="page"><Async state={s}>{({ event, form, me }) => <Wizard event={event} form={form} me={me} />}</Async></div>;
}

function Wizard({ event, form, me }) {
  const navigate = useNavigate(); const toast = useToast();
  const isTeam = event.mode === 'team';
  const steps = isTeam ? ['Details', 'Team', 'Review'] : ['Details', 'Review'];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); const [errors, setErrors] = useState({});
  const [teamName, setTeamName] = useState(''); const [members, setMembers] = useState([]);
  const [crn, setCrn] = useState(''); const [lookupErr, setLookupErr] = useState(''); const [looking, setLooking] = useState(false);
  const [pending, setPending] = useState(null); const [idCheck, setIdCheck] = useState(null);
  const [busy, setBusy] = useState(false); const [formError, setFormError] = useState(''); const [done, setDone] = useState(null);
  const label = steps[step];

  if (!event.acceptingRegistrations) return <ErrorState error={{ message: 'Registrations are closed for this event.' }} />;
  if (done) return (
    <div className="card center" style={{ maxWidth: 560, margin: '40px auto' }}>
      <div style={{ color: 'var(--green)' }}><Icon name="check" size={40} /></div>
      <h2>Registration submitted</h2><p className="muted">Your registration for <b>{event.title}</b> was received.</p>
      <p>Reference: <span className="mono">{done.id}</span></p>
      <div className="row"><Button to={`/student/registrations/${done.id}`}>View registration</Button><Button variant="secondary" to="/student/events">Browse events</Button></div>
    </div>);

  const setAnswer = (k, v) => { setAnswers((a) => ({ ...a, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const maxMembers = (event.teamMax || 1) - 1; const minMembers = (event.teamMin || 1) - 1;
  // Enter/scan a CRN -> look the student up -> show their prefilled details -> captain confirms to add.
  const findMember = async (raw) => {
    const c = extractCrn(raw ?? crn); setCrn(c); setLookupErr(''); setPending(null);
    if (!c) return;
    if (c === me.crn) { setLookupErr('You are the captain and are already included in the team.'); return; }
    if (members.some((m) => m.crn === c)) { setLookupErr('That CRN is already in the team.'); return; }
    if (members.length >= maxMembers) { setLookupErr(`This event allows at most ${event.teamMax} players including the captain.`); return; }
    setLooking(true);
    try {
      const st = await api.get(`/registrations/lookup/${encodeURIComponent(c)}`);
      if (!st) setLookupErr(`No student found with CRN ${c}.`); else setPending(st);
    } catch (e) { setLookupErr(e.message); } finally { setLooking(false); }
  };
  const confirmMember = () => { setMembers((m) => [...m, pending]); setPending(null); setCrn(''); };
  const verifyOwnCard = (raw) => setIdCheck(extractCrn(raw) === me.crn ? 'ok' : 'bad');

  const next = () => {
    if (label === 'Details') { const e = clientValidate(form.fields, answers); setErrors(e); if (Object.keys(e).length) return; }
    if (label === 'Team') {
      if (!teamName.trim()) { setErrors({ teamName: 'Team name is required.' }); return; }
      if (members.length < minMembers || members.length > maxMembers) { setErrors({ members: `Add ${minMembers === maxMembers ? minMembers : `${minMembers}–${maxMembers}`} team member(s) besides yourself.` }); return; }
      setErrors({});
    }
    setStep((x) => x + 1);
  };
  const submit = async () => {
    setBusy(true); setFormError('');
    try {
      const r = await api.post('/registrations', { eventId: event.id, answers, ...(isTeam ? { team: { name: teamName, members: members.map((m) => m.crn) } } : {}) });
      setDone(r); toast('Registration submitted', 'success');
    } catch (err) {
      setFormError(err.message); const fe = fieldErrors(err); setErrors(fe);
      if (form.fields.some((f) => fe[f.key])) setStep(0); else if (isTeam && (fe.teamName || fe.members)) setStep(1);
    } finally { setBusy(false); }
  };

  return (<>
    <PageHeader title={`Register — ${event.title}`} sub={`${fmtDate(event.date)} · ${isTeam ? `Team of ${event.teamMin}–${event.teamMax}` : 'Individual'}`}><Button variant="secondary" to={`/student/events/${event.id}`}>Cancel</Button></PageHeader>
    <div className="steps">{steps.map((n, i) => <span key={n} className={`step ${i === step ? 'on' : i < step ? 'done' : ''}`}>{i + 1}. {n}</span>)}</div>
    {formError && <div className="alert error" role="alert" style={{ marginBottom: 12 }}>{formError}</div>}
    <Card title={label === 'Details' ? form.title : label === 'Team' ? 'Team members' : 'Review and submit'}>
      {label === 'Details' && <div className="stack">
        <StudentDetails student={me} title={isTeam ? 'Captain details' : 'Your details'} note="These details come from college records and are saved with your registration."
          action={<ScanButton label="Verify with ID card" onScan={verifyOwnCard} />} />
        {idCheck === 'ok' && <div className="alert ok">ID card matches your CRN.</div>}
        {idCheck === 'bad' && <div className="alert error" role="alert">That ID card belongs to a different CRN. Scan your own card, or continue without verifying.</div>}
        {form.description && <p className="muted">{form.description}</p>}
        {form.fields.length ? <DynamicForm fields={form.fields} values={answers} onChange={setAnswer} errors={errors} /> : <p className="muted">No extra details are needed for this event.</p>}</div>}
      {label === 'Team' && (
        <div className="stack">
          <TextField label="Team name" required value={teamName} maxLength={60} onChange={(e) => setTeamName(e.target.value)} error={errors.teamName} />
          <Field label="Add team members by CRN" error={errors.members || lookupErr} help={`You are the captain and already included. Add ${minMembers === maxMembers ? minMembers : `${minMembers}–${maxMembers}`} more player(s).`}>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <input className="input" style={{ flex: 1, minWidth: 160 }} aria-label="Member CRN" inputMode="numeric" value={crn} onChange={(e) => setCrn(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), findMember())} placeholder="Type or scan CRN" autoCapitalize="characters" />
              <Button variant="secondary" loading={looking} onClick={() => findMember()}>Find</Button>
              <ScanButton onScan={(raw) => findMember(raw)} />
            </div>
          </Field>
          {pending && (
            <StudentDetails student={pending} title="Confirm team member" note={pending.masked ? 'Phone and email are partly hidden for privacy.' : undefined}
              action={<div className="row"><Button size="sm" onClick={confirmMember}>Add to team</Button><Button size="sm" variant="secondary" onClick={() => setPending(null)}>Cancel</Button></div>} />)}
          <div className="members">{members.map((m) => (
            <div key={m.crn} className="chip-row"><div className="main" style={{ flex: 1 }}><b>{m.name}</b> <span className="muted small">{m.crn} · {m.branch} {m.class} {m.division}</span></div>
              <Button size="sm" variant="ghost" aria-label={`Remove ${m.name}`} onClick={() => setMembers((l) => l.filter((x) => x.crn !== m.crn))}><Icon name="x" size={16} /></Button></div>))}
            <div className="muted small">{members.length + 1} of {event.teamMax} players (including you)</div></div>
        </div>)}
      {label === 'Review' && (
        <dl className="kv">
          <dt>Event</dt><dd>{event.title}</dd>
          {isTeam && <><dt>Team name</dt><dd>{teamName}</dd><dt>Players</dt><dd>You (captain){members.map((m) => `, ${m.name} (${m.crn})`)}</dd></>}
          {form.fields.map((f) => <div key={f.key} style={{ display: 'contents' }}><dt>{f.label}</dt><dd>{Array.isArray(answers[f.key]) ? answers[f.key].join(', ') || '—' : answers[f.key] || '—'}</dd></div>)}
        </dl>)}
    </Card>
    <div className="bottom-actions" style={{ marginTop: 16 }}>
      {step > 0 && <Button variant="secondary" onClick={() => setStep((x) => x - 1)}>Back</Button>}
      {label !== 'Review' ? <Button onClick={next}>Continue</Button> : <Button loading={busy} onClick={submit}>Submit registration</Button>}
    </div>
  </>);
}
