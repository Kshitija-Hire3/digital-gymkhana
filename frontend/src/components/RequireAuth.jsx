import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Loading, Button } from './ui.jsx';

export default function RequireAuth({ role, children }) {
  const { user, ready } = useAuth(); const loc = useLocation();
  if (!ready) return <Loading label="Checking your session…" />;
  if (!user) return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} replace state={{ from: loc.pathname }} />;
  const ok = role === 'admin' ? user.role !== 'student' : user.role === 'student';
  if (!ok) return (
    <div className="center" style={{ minHeight: '60vh' }}><h3>You don't have access to this area</h3>
      <p className="muted">This page is for {role === 'admin' ? 'administrators' : 'students'}. Please sign in with the right account.</p>
      <Button to={user.role === 'student' ? '/student/dashboard' : '/admin/dashboard'}>Go to my dashboard</Button></div>);
  return children;
}
