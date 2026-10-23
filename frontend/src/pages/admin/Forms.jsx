import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, fieldErrors } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { Async, Card, PageHeader, Button, DataTable, StatusBadge, TextField, Field, SelectField, EmptyState, ConfirmDialog } from '../../components/ui.jsx';
import { DynamicForm } from '../../components/DynamicForm.jsx';
import { useToast } from '../../components/Toast.jsx';
import Icon from '../../components/Icon.jsx';

const TYPES = ['text', 'number', 'email', 'phone', 'date', 'dropdown', 'radio', 'checkbox', 'textarea'];
const HAS_OPTIONS = ['dropdown', 'radio', 'checkbox'];

export function Forms() {
  const navigate = useNavigate(); const toast = useToast(); const [del, setDel] = useState(null);
  const s = useAsync(async () => { const [forms, events] = await Promise.all([api.get('/forms'), api.get('/events')]); return forms.map((f) => ({ ...f, events: events.filter((e) => e.formId === f.id).map((e) => e.title) })); }, []);
  const remove = async () => { try { await api.del(`/forms/${del.id}`); toast('Form deleted', 'success'); s.reload(); } catch (e) { toast(e.message, 'error'); } setDel(null); };
  return (
    <div className="page"><PageHeader title="Registration Forms" sub="Sport-specific forms are configured here, not hard-coded."><Button to="/admin/forms/create">New Form</Button></PageHeader>
      <Card flush><Async state={s} empty={<EmptyState title="No forms yet" message="Create a form, then link it to an event." action={<Button to="/admin/forms/create">Create form</Button>} />}>
        {(rows) => <DataTable rows={rows} onRowClick={(f) => navigate(`/admin/forms/${f.id}`)} columns={[
          { label: 'Form', render: (f) => <b>{f.title}</b> }, { label: 'Fields', render: (f) => f.fields.length }, { label: 'Used by', render: (f) => f.events.join(', ') || '—' }, { label: 'Status', render: (f) => <StatusBadge status={f.status} /> },
          { label: '', render: (f) => <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDel(f); }}>Delete</Button> }]} />}</Async></Card>
      <ConfirmDialog open={!!del} danger title="Delete form?" message={`Delete "${del?.title}"? This cannot be undone.`} confirmLabel="Delete" onConfirm={remove} onClose={() => setDel(null)} /></div>
  );
}

const blank = () => ({ _id: Math.random().toString(36).slice(2), label: '', type: 'text', required: false, options: [], optionsText: '', column: '', placeholder: '', helpText: '' });
export function FormBuilder() {
  const { id } = useParams(); const s = useAsync(() => (id ? api.get(`/forms/${id}`) : Promise.resolve(null)), [id]);
  return <div className="page"><Async state={s.loading ? s : { ...s, data: s.data || { new: true } }}>{(f) => <Builder key={f.id || 'new'} initial={f.new ? null : f} />}</Async></div>;
}
function Builder({ initial }) {
  const navigate = useNavigate(); const toast = useToast();
  const [form, setForm] = useState(initial); const [title, setTitle] = useState(initial?.title || ''); const [description, setDescription] = useState(initial?.description || '');
  const [fields, setFields] = useState((initial?.fields || []).map((f) => ({ ...f, _id: f.key, optionsText: (f.options || []).join('\n') })));
  const [errors, setErrors] = useState({}); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [preview, setPreview] = useState({});
  const upd = (i, patch) => setFields((l) => l.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i, d) => setFields((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const body = () => ({ title, description, fields: fields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: f.required, column: f.column, placeholder: f.placeholder, helpText: f.helpText, min: f.min, max: f.max,
    options: HAS_OPTIONS.includes(f.type) ? f.optionsText.split('\n').map((x) => x.trim()).filter(Boolean) : [] })) });
  const save = async () => {
    setBusy(true); setErr(''); setErrors({});
    try {
      const r = form ? await api.put(`/forms/${form.id}`, body()) : await api.post('/forms', body());
      toast('Form saved', 'success'); setForm(r); setFields(r.fields.map((f) => ({ ...f, _id: f.key, optionsText: (f.options || []).join('\n') })));
      if (!form) navigate(`/admin/forms/${r.id}`, { replace: true });
    } catch (e) { setErr(e.message); setErrors(fieldErrors(e)); } finally { setBusy(false); }
  };
  const setStatus = async (status) => { try { const r = await api.patch(`/forms/${form.id}/status`, { status }); setForm(r); toast(status === 'published' ? 'Form published' : 'Form unpublished', 'success'); } catch (e) { toast(e.message, 'error'); } };
  const previewFields = fields.map((f, i) => ({ ...f, key: f.key || `f${i}`, label: f.label || `Field ${i + 1}`, order: i, options: HAS_OPTIONS.includes(f.type) ? f.optionsText.split('\n').map((x) => x.trim()).filter(Boolean) : [] }));
  return (<>
    <PageHeader title={form ? 'Edit form' : 'Create form'} sub={form && <StatusBadge status={form.status} />}>
      <Button variant="secondary" to="/admin/forms">← Forms</Button>{form && (form.status === 'published' ? <Button variant="secondary" onClick={() => setStatus('draft')}>Unpublish</Button> : <Button variant="secondary" onClick={() => setStatus('published')}>Publish</Button>)}<Button loading={busy} onClick={save}>Save</Button></PageHeader>
    {err && <div className="alert error" role="alert" style={{ marginBottom: 12 }}>{err}</div>}
    {form?.status === 'published' && <div className="alert warn" style={{ marginBottom: 12 }}>This form is published. Changes apply to new registrations; existing Excel data keeps its old columns and new columns are added.</div>}
    <div className="grid two"><div className="stack">
      <Card><div className="stack"><TextField label="Form title" required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} /><Field label="Description"><textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></Field></div></Card>
      {fields.length === 0 && <Card><EmptyState title="No fields yet" message="Add the questions students should answer. Name, CRN, branch and year are captured automatically." /></Card>}
      {fields.map((f, i) => (
        <div key={f._id} className="fb-field stack" style={{ gap: 12 }}>
          <div className="row"><b>Field {i + 1}</b><span className="spacer" /><Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" size={16} /></Button>
            <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === fields.length - 1} onClick={() => move(i, 1)}><Icon name="down" size={16} /></Button><Button size="sm" variant="danger" aria-label="Remove field" onClick={() => setFields((l) => l.filter((_, j) => j !== i))}><Icon name="trash" size={16} /></Button></div>
          <div className="grid form2"><TextField label="Label" required value={f.label} onChange={(e) => upd(i, { label: e.target.value })} error={errors[`fields[${i}].label`]} />
            <SelectField label="Type" value={f.type} onChange={(e) => upd(i, { type: e.target.value })} options={TYPES} /></div>
          {HAS_OPTIONS.includes(f.type) && <Field label="Options (one per line)" error={errors[`fields[${i}].options`]}><textarea className="input" value={f.optionsText} onChange={(e) => upd(i, { optionsText: e.target.value })} /></Field>}
          {f.type === 'number' && <div className="grid form2"><TextField label="Minimum" type="number" value={f.min ?? ''} onChange={(e) => upd(i, { min: e.target.value })} /><TextField label="Maximum" type="number" value={f.max ?? ''} onChange={(e) => upd(i, { max: e.target.value })} /></div>}
          <div className="grid form2"><TextField label="Placeholder" value={f.placeholder || ''} onChange={(e) => upd(i, { placeholder: e.target.value })} /><TextField label="Excel column header" help="Optional. Defaults to the label." value={f.column || ''} onChange={(e) => upd(i, { column: e.target.value })} /></div>
          <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={f.required} onChange={(e) => upd(i, { required: e.target.checked })} /> Required</label>
          {errors[`fields[${i}].key`] && <span className="error-text">{errors[`fields[${i}].key`]}</span>}
        </div>))}
      <div><Button variant="secondary" onClick={() => setFields((l) => [...l, blank()])}><Icon name="plus" size={16} /> Add field</Button></div>
    </div>
    <Card title="Preview"><p className="muted small" style={{ marginBottom: 12 }}>How students will see this form.</p>
      {previewFields.length ? <DynamicForm fields={previewFields} values={preview} onChange={(k, v) => setPreview((p) => ({ ...p, [k]: v }))} /> : <EmptyState title="Nothing to preview" />}</Card></div></>);
}
