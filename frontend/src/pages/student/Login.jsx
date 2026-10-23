import { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { Button, TextField, PasswordField } from '../../components/ui.jsx';

// Marketing copy from the design. Replace with real content when the sports list is final.
const HIGHLIGHTS = ['Cricket Tournament', 'Chess Championship', 'Volleyball League', 'Carrom Doubles'];
const SHOW_HINT = import.meta.env.VITE_SHOW_DEMO_HINT !== 'false';

export default function StudentLogin() {
  const { user, login } = useAuth(); const navigate = useNavigate(); const loc = useLocation();
  const [crn, setCrn] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={user.role === 'student' ? '/student/dashboard' : '/admin/dashboard'} replace />;
  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!crn.trim() || !password) { setError('Enter your CRN and password.'); return; }
    setBusy(true);
    try { await login('student', { crn: crn.trim(), password }); navigate(loc.state?.from?.startsWith('/student') ? loc.state.from : '/student/dashboard', { replace: true }); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="auth-split">
      <div className="auth-brand">
        <div className="row"><div className="logo">DG</div><b style={{ fontSize: 20 }}>Digital Gymkhana</b></div>
        <h1>Your college sports, organised.</h1>
        <p>Register for events, track your participation, view results and access certificates — all in one place.</p>
        <ul>{HIGHLIGHTS.map((h) => <li key={h}>{h}</li>)}</ul>
      </div>
      <div className="auth-form"><div>
        <form className="card auth-card stack" onSubmit={submit} noValidate>
          <div><h2>Student Sign In</h2><p className="muted">Enter your CRN and password to continue.</p></div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <TextField label="College Roll Number (CRN)" required value={crn} onChange={(e) => setCrn(e.target.value)} autoComplete="username" autoCapitalize="characters" />
          <PasswordField label="Password / Date of Birth" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <Button block loading={busy} type="submit">Sign In</Button>
          {SHOW_HINT && <div className="demo"><b>How to sign in</b>Use your CRN and your date of birth written as <code>DDMMYYYY</code> (for example 18032006).</div>}
          <p className="small muted" style={{ textAlign: 'center' }}>Administrator? <Link to="/admin/login">Sign in to admin portal →</Link></p>
        </form>
        <p className="small muted" style={{ textAlign: 'center', marginTop: 20 }}>This is a prototype system. Authentication shown for demonstration only.</p>
      </div></div>
    </div>
  );
}
