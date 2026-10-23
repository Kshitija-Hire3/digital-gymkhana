import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { Async, PageHeader, Button, EmptyState, Card, fmtDateTime } from '../../components/ui.jsx';
import StudentDetails from '../../components/StudentDetails.jsx';
import { useToast } from '../../components/Toast.jsx';

export function Notifications() {
  const navigate = useNavigate(); const toast = useToast(); const [busy, setBusy] = useState(false);
  const s = useAsync(() => api.get('/notifications'), []);
  const open = async (n) => { try { if (!n.read) await api.post(`/notifications/${n.id}/read`); } catch { /* non-critical */ } if (n.link) navigate(n.link); else s.reload(); };
  const readAll = async () => { setBusy(true); try { await api.post('/notifications/read-all'); s.reload(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); } };
  return (
    <div className="page"><PageHeader title="Notifications" sub="Updates about events, registrations, schedules and results."><Button variant="secondary" loading={busy} onClick={readAll}>Mark all as read</Button></PageHeader>
      <Card flush><Async state={s} empty={<EmptyState title="No notifications" message="You're all caught up." />}>
        {(list) => list.map((n) => (
          <button key={n.id} className="list-row" onClick={() => open(n)} style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', cursor: 'pointer', alignItems: 'flex-start' }}>
            {!n.read ? <span className="dot" style={{ marginTop: 6 }} aria-label="Unread" /> : <span style={{ width: 7 }} />}
            <div className="main"><div className="title">{n.title}</div><div className="muted">{n.message}</div><div className="muted small">{fmtDateTime(n.createdAt)}</div></div></button>))}</Async></Card></div>
  );
}
export function Profile() {
  const s = useAsync(() => api.get('/auth/me'), []);
  return (
    <div className="page"><PageHeader title="Profile" sub="Your details come from college records." />
      <Async state={s}>{(u) => <StudentDetails student={u} title={u.name} note="To correct any of these details, contact the Gymkhana office." />}</Async></div>
  );
}
