import { useState } from 'react';
import { api, fieldErrors } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { Async, Card, PageHeader, Button, DataTable, Dialog, TextField, SelectField, Badge, EmptyState } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';

const ROLE = { super_admin: 'Super Admin', organizer: 'Organizer' };
export function Users() {
  const toast = useToast(); const { user } = useAuth(); const s = useAsync(() => api.get('/admin/users'), []);
  const [open, setOpen] = useState(false); const [v, setV] = useState({ name: '', email: '', password: '', role: 'organizer' }); const [errors, setErrors] = useState({}); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const create = async () => { setBusy(true); setErr(''); setErrors({}); try { await api.post('/admin/users', v); toast('Administrator added', 'success'); setOpen(false); s.reload(); } catch (e) { setErr(e.message); setErrors(fieldErrors(e)); } finally { setBusy(false); } };
  const toggle = async (a) => { try { await api.patch(`/admin/users/${a.id}`, { active: !a.active }); s.reload(); } catch (e) { toast(e.message, 'error'); } };
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div className="page"><PageHeader title="Admin Users" sub="Super admins manage staff access."><Button onClick={() => { setV({ name: '', email: '', password: '', role: 'organizer' }); setErr(''); setErrors({}); setOpen(true); }}>Add administrator</Button></PageHeader>
      <Card flush><Async state={s} empty={<EmptyState title="No administrators" />}>{(rows) => <DataTable rows={rows} columns={[
        { label: 'Name', render: (a) => <b>{a.name}</b> }, { label: 'Email', key: 'email' }, { label: 'Role', render: (a) => ROLE[a.role] }, { label: 'Status', render: (a) => <Badge tone={a.active !== false ? 'green' : ''}>{a.active !== false ? 'Active' : 'Inactive'}</Badge> },
        { label: '', render: (a) => (a.id === user.id ? <span className="muted small">You</span> : <Button size="sm" variant="secondary" onClick={() => toggle(a)}>{a.active !== false ? 'Deactivate' : 'Activate'}</Button>) }]} />}</Async></Card>
      <Dialog open={open} title="Add administrator" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={busy} onClick={create}>Add</Button></>}>
        <div className="stack">{err && <div className="alert error" role="alert">{err}</div>}<TextField label="Name" required value={v.name} onChange={set('name')} error={errors.name} /><TextField label="Email" type="email" required value={v.email} onChange={set('email')} error={errors.email} />
          <TextField label="Temporary password" type="password" required value={v.password} onChange={set('password')} error={errors.password} help="At least 8 characters." autoComplete="new-password" /><SelectField label="Role" value={v.role} onChange={set('role')} options={[{ value: 'organizer', label: 'Organizer' }, { value: 'super_admin', label: 'Super Admin' }]} /></div></Dialog></div>
  );
}

export function Settings() {
  const s = useAsync(() => api.get('/admin/settings'), []);
  return <div className="page"><PageHeader title="Settings" sub="Data-cleaning rules and Excel column headers. Nothing here is hard-coded to a college." />
    <Async state={s}>{(d) => <SettingsForm key={JSON.stringify(d)} initial={d} onSaved={s.reload} />}</Async></div>;
}
function SettingsForm({ initial, onSaved }) {
  const toast = useToast(); const n0 = initial.normalization;
  const [n, setN] = useState({ ...n0, titleCaseKeys: n0.titleCaseKeys.join(', '), upperCaseKeys: n0.upperCaseKeys.join(', ') });
  const [aliases, setAliases] = useState(Object.entries(n0.branchAliases).map(([from, to]) => ({ from, to }))); const [meta, setMeta] = useState(initial.excel.metaHeaders);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const list = (t) => t.split(',').map((x) => x.trim()).filter(Boolean);
  const save = async () => {
    setBusy(true); setErr('');
    try {
      await api.put('/admin/settings', { normalization: { crnPattern: n.crnPattern, phonePattern: n.phonePattern, dateOrder: n.dateOrder, titleCaseKeys: list(n.titleCaseKeys), upperCaseKeys: list(n.upperCaseKeys),
        branchAliases: Object.fromEntries(aliases.filter((a) => a.from.trim() && a.to.trim()).map((a) => [a.from.trim(), a.to.trim()])) }, excel: { metaHeaders: meta } });
      toast('Settings saved', 'success'); onSaved();
    } catch (e) { setErr(e.message + (e.details?.length ? ` ${e.details.map((d) => d.message || d).join(' ')}` : '')); } finally { setBusy(false); }
  };
  return (
    <div className="stack">{err && <div className="alert error" role="alert">{err}</div>}
      <Card title="Validation & normalization"><div className="grid form2">
        <TextField label="CRN format (regex)" value={n.crnPattern} onChange={(e) => setN({ ...n, crnPattern: e.target.value })} help="Replace with the college's real CRN format." />
        <TextField label="Phone format (regex)" value={n.phonePattern} onChange={(e) => setN({ ...n, phonePattern: e.target.value })} help="Tested after spaces and dashes are removed." />
        <SelectField label="Date order for dd/mm/yyyy input" value={n.dateOrder} onChange={(e) => setN({ ...n, dateOrder: e.target.value })} options={[{ value: 'DMY', label: 'Day / Month / Year' }, { value: 'MDY', label: 'Month / Day / Year' }]} />
        <TextField label="Title-case columns (keys)" value={n.titleCaseKeys} onChange={(e) => setN({ ...n, titleCaseKeys: e.target.value })} help="Comma-separated, e.g. name" />
        <TextField label="Upper-case columns (keys)" value={n.upperCaseKeys} onChange={(e) => setN({ ...n, upperCaseKeys: e.target.value })} help="Comma-separated, e.g. crn" /></div></Card>
      <Card title="Branch / program name standardization"><div className="stack">
        <p className="muted small">Map variants to the official name. Leave empty until the college supplies its list.</p>
        {aliases.map((a, i) => <div key={i} className="grid form2"><TextField aria-label="Variant" placeholder="Variant (e.g. info tech)" value={a.from} onChange={(e) => setAliases((l) => l.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} />
          <div className="row" style={{ flexWrap: 'nowrap' }}><input className="input" aria-label="Standard name" placeholder="Standard name" value={a.to} onChange={(e) => setAliases((l) => l.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} /><Button variant="danger" size="sm" onClick={() => setAliases((l) => l.filter((_, j) => j !== i))}>Remove</Button></div></div>)}
        <div><Button variant="secondary" onClick={() => setAliases((l) => [...l, { from: '', to: '' }])}>Add mapping</Button></div></div></Card>
      <Card title="Excel column headers"><div className="grid form2">{Object.entries(meta).map(([k, h]) => <TextField key={k} label={k} value={h} onChange={(e) => setMeta({ ...meta, [k]: e.target.value })} />)}</div>
        <p className="muted small" style={{ marginTop: 8 }}>Changing headers affects new files. Set the final Sports Department format before real registrations start.</p></Card>
      <div className="bottom-actions"><Button loading={busy} onClick={save}>Save settings</Button></div></div>
  );
}
