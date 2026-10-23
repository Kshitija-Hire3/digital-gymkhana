import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { Button, TextField, PasswordField } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';

const SHOW_HINT = import.meta.env.VITE_SHOW_DEMO_HINT !== 'false';
export default function AdminLogin() {
  const { user, login, logout } = useAuth(); const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (user && user.role !== 'student') return <Navigate to="/admin/dashboard" replace />;
  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true);
    try { if (user) await logout(); await login('admin', { email: email.trim(), password }); navigate('/admin/dashboard', { replace: true }); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="admin-auth">
      <div className="logo" style={{ width: 56, height: 56, borderRadius: 14 }}><Icon name="shield" size={28} /></div>
      <h1 style={{ color: '#fff', fontSize: 24, margin: '16px 0 2px' }}>Digital Gymkhana</h1><p style={{ color: '#8fb0d0', marginBottom: 32 }}>Administrator Portal</p>
      <form className="card stack" onSubmit={submit} noValidate>
        <div><h2 style={{ fontSize: 18 }}>Admin Sign In</h2><p className="muted">Restricted to authorized Gymkhana staff only.</p></div>
        {error && <div className="alert error" role="alert">{error}</div>}
        <TextField label="Admin Email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <PasswordField label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <Button variant="navy" block loading={busy} type="submit">Sign In to Admin Portal</Button>
        {SHOW_HINT && <div className="demo" style={{ marginTop: 0 }}><b>Demo credentials</b>Email: <code>admin@college.edu.in</code><br />Password: <code>admin123</code></div>}
        <p className="small muted" style={{ textAlign: 'center' }}><Link to="/login">← Back to Student Portal</Link></p>
      </form>
      <p className="small" style={{ color: '#6f8aa6', marginTop: 24 }}>Digital Gymkhana — Prototype v0.1 · For authorized use only</p>
    </div>
  );
}
