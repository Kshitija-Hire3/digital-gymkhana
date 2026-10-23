import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export function Button({ variant = '', size = '', block, loading, children, to, className = '', ...rest }) {
  const cls = `btn ${variant} ${size} ${block ? 'block' : ''} ${className}`;
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
  return <button type="button" className={cls} disabled={loading || rest.disabled} {...rest}>{loading ? 'Please wait…' : children}</button>;
}
const STATUS = { Approved: 'green', Open: 'green', open: 'green', published: 'green', Processed: 'green', available: 'green', Submitted: 'blue', 'Under Review': 'amber', Processing: 'amber',
  'Needs Attention': 'amber', Rejected: 'red', Failed: 'red', closed: 'grey', Closed: 'grey', draft: 'grey', completed: 'grey', 'Not Processed': 'grey', Pending: 'grey' };
export const Badge = ({ tone, children }) => <span className={`badge ${tone || ''}`}>{children}</span>;
export const StatusBadge = ({ status }) => <Badge tone={STATUS[status]}>{status === 'open' ? 'Open' : String(status).replace(/^./, (c) => c.toUpperCase())}</Badge>;
export const SportBadge = ({ sport }) => <Badge tone={{ Cricket: 'green', Volleyball: 'orange', Chess: '' }[sport] ?? 'blue'}>{sport}</Badge>;
export const eventStatus = (e) => (e.acceptingRegistrations ? 'Open' : e.status === 'open' ? 'Closed' : e.status);

export const Card = ({ title, action, children, flush, className = '' }) => (
  <section className={`card ${className}`}>
    {(title || action) && <div className="card-head"><h2>{title}</h2>{action}</div>}
    {flush ? children : <div className="card-body">{children}</div>}
  </section>
);
export const StatCard = ({ n, label, sub, tone = '' }) => <div className={`card stat ${tone}`}><div className="n">{n}</div><div className="l">{label}</div><div className="s">{sub}</div></div>;
export const PageHeader = ({ title, sub, children }) => <div className="page-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="row">{children}</div></div>;

export const Loading = ({ label = 'Loading…' }) => <div className="center" role="status"><div className="spinner" /><span className="muted">{label}</span></div>;
export const EmptyState = ({ title = 'Nothing here yet', message, action }) => <div className="center"><h3>{title}</h3>{message && <p className="muted">{message}</p>}{action}</div>;
export const ErrorState = ({ error, onRetry }) => (
  <div className="center" role="alert"><h3>{error?.status === 403 ? 'Not allowed' : 'Could not load this'}</h3><p className="muted">{error?.message || 'Something went wrong.'}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}</div>
);
/** Renders loading / error / empty / content for a useAsync result. */
export function Async({ state, empty, children }) {
  if (state.loading && !state.data) return <Loading />;
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  const d = state.data;
  if (empty && (Array.isArray(d) ? d.length === 0 : !d)) return empty;
  return children(d);
}

export function Field({ label, required, error, help, children, htmlFor }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}{required && <span className="req">*</span>}</label>}
      {children}
      {help && !error && <span className="help">{help}</span>}
      {error && <span className="error-text" role="alert">{error}</span>}
    </div>
  );
}
export function TextField({ label, required, error, help, ...rest }) {
  const id = useId();
  return <Field label={label} required={required} error={error} help={help} htmlFor={id}><input id={id} className={`input ${error ? 'err' : ''}`} aria-invalid={!!error} {...rest} /></Field>;
}
export function SelectField({ label, required, error, options, placeholder, ...rest }) {
  const id = useId();
  return (
    <Field label={label} required={required} error={error} htmlFor={id}>
      <select id={id} className={`input ${error ? 'err' : ''}`} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => { const v = typeof o === 'string' ? o : o.value; const l = typeof o === 'string' ? o : o.label; return <option key={v} value={v}>{l}</option>; })}
      </select>
    </Field>
  );
}
export function PasswordField({ label, required, ...rest }) {
  const [show, setShow] = useState(false); const id = useId();
  return (
    <Field label={label} required={required} htmlFor={id}>
      <div className="pw"><input id={id} className="input" type={show ? 'text' : 'password'} {...rest} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}><Icon name={show ? 'eyeoff' : 'eye'} /></button></div>
    </Field>
  );
}

export function Dialog({ title, open, onClose, children, footer }) {
  useEffect(() => { if (!open) return undefined; const h = (e) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}><div className="dialog-head">{title}</div><div className="dialog-body">{children}</div>{footer && <div className="dialog-foot">{footer}</div>}</div>
    </div>
  );
}
export function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Confirm', danger, onConfirm, onClose, busy }) {
  return (
    <Dialog open={open} title={title} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : ''} loading={busy} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <p>{message}</p>
    </Dialog>
  );
}
export function Filters({ children }) {
  const [open, setOpen] = useState(false);
  return (<>
    <Button variant="secondary" className="filter-toggle mobile-block" onClick={() => setOpen((o) => !o)} aria-expanded={open}><Icon name="filter" /> Filters</Button>
    <div className={`filters ${open ? '' : 'collapsed'}`} style={{ marginTop: 0 }}>{children}</div>
  </>);
}
export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="pager"><span className="muted small">Page {page} of {pages}</span>
      <div className="row"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button></div></div>
  );
}
/** Responsive table: stacked cards on phones (td[data-label]), paginated client-side. */
export function DataTable({ columns, rows, rowKey = (r) => r.id, onRowClick, pageSize = 10, empty }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  if (!rows.length) return empty || <EmptyState title="No records" />;
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);
  return (<>
    <div className="table-wrap"><table className="table stack-m"><thead><tr>{columns.map((c) => <th key={c.key || c.label}>{c.label}</th>)}</tr></thead>
      <tbody>{slice.map((r) => (
        <tr key={rowKey(r)} className={onRowClick ? 'click' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
          {columns.map((c) => <td key={c.key || c.label} data-label={c.label}>{c.render ? c.render(r) : r[c.key]}</td>)}
        </tr>))}</tbody></table></div>
    <Pagination page={page} pages={pages} onPage={setPage} />
  </>);
}
export const fmtDate = (d) => (d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
