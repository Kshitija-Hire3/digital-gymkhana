import { Field } from './ui.jsx';

/** Renders ONE field from its configuration. No per-sport components exist anywhere. */
export function DynamicField({ field, value, onChange, error, disabled }) {
  const id = `fld-${field.key}`; const common = { id, disabled, 'aria-invalid': !!error, className: `input ${error ? 'err' : ''}` };
  const set = (v) => onChange(field.key, v);
  let control;
  switch (field.type) {
    case 'textarea': control = <textarea {...common} value={value ?? ''} placeholder={field.placeholder} onChange={(e) => set(e.target.value)} />; break;
    case 'dropdown': control = <select {...common} value={value ?? ''} onChange={(e) => set(e.target.value)}><option value="">Select…</option>{field.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>; break;
    case 'radio': control = <div className="choices" role="radiogroup">{field.options.map((o) => <label key={o}><input type="radio" name={id} disabled={disabled} checked={value === o} onChange={() => set(o)} /> {o}</label>)}</div>; break;
    case 'checkbox': {
      const cur = Array.isArray(value) ? value : [];
      control = <div className="choices">{field.options.map((o) => <label key={o}><input type="checkbox" disabled={disabled} checked={cur.includes(o)} onChange={(e) => set(e.target.checked ? [...cur, o] : cur.filter((x) => x !== o))} /> {o}</label>)}</div>; break;
    }
    default: {
      const type = { number: 'number', email: 'email', phone: 'tel', date: 'date' }[field.type] || 'text';
      control = <input {...common} type={type} inputMode={field.type === 'phone' ? 'tel' : undefined} min={field.min} max={field.max} value={value ?? ''} placeholder={field.placeholder} onChange={(e) => set(e.target.value)} />;
    }
  }
  return <Field label={field.label} required={field.required} error={error} help={field.helpText} htmlFor={id}>{control}</Field>;
}
export function DynamicForm({ fields, values, onChange, errors = {}, disabled }) {
  return (
    <div className="grid form2">
      {[...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((f) => (
        <div key={f.key} style={['textarea', 'checkbox', 'radio'].includes(f.type) ? { gridColumn: '1 / -1' } : undefined}>
          <DynamicField field={f} value={values[f.key]} onChange={onChange} error={errors[f.key]} disabled={disabled} />
        </div>))}
    </div>
  );
}
/** Client-side pre-check so students get instant feedback; the server remains the authority. */
export function clientValidate(fields, values) {
  const errs = {};
  for (const f of fields) {
    const v = values[f.key]; const empty = Array.isArray(v) ? !v.length : v === undefined || String(v).trim() === '';
    if (empty) { if (f.required) errs[f.key] = `${f.label} is required.`; continue; }
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errs[f.key] = 'Enter a valid email address.';
    if (f.type === 'number' && !Number.isFinite(Number(v))) errs[f.key] = 'Enter a number.';
  }
  return errs;
}
