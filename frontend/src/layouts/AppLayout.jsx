import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export default function AppLayout({ nav, portal, bellTo, fetchBadges }) {
  const { user, logout } = useAuth(); const loc = useLocation(); const navigate = useNavigate();
  const [open, setOpen] = useState(false); const [badges, setBadges] = useState({}); const last = useRef(0);
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    if (!fetchBadges || Date.now() - last.current < 20000) return;
    last.current = Date.now(); fetchBadges().then(setBadges).catch(() => {});
  }, [loc.pathname, fetchBadges]);
  const flat = nav.filter((n) => n.to);
  const current = [...flat].sort((a, b) => b.to.length - a.to.length).find((n) => loc.pathname.startsWith(n.to));
  const initials = (user?.name || '?').split(' ').filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const out = async () => { await logout(); navigate(portal === 'admin' ? '/admin/login' : '/login'); };
  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <div className="brand"><div className="logo">DG</div><div><b>Digital Gymkhana</b><span>{portal === 'admin' ? 'Administrator Portal' : 'Student Portal'}</span></div></div>
        <nav className="nav">
          {nav.map((n) => n.group ? <div key={n.group} className="nav-group">{n.group}</div> : (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={n.icon} /> {n.label}{badges[n.badge] > 0 && <span className="count">{badges[n.badge]}</span>}
            </NavLink>))}
        </nav>
        <div className="userbox"><div className="who"><div className="avatar">{initials}</div><div><div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{user?.name}</div><div className="small" style={{ color: '#9db6cf' }}>{user?.crn || (user?.role === 'super_admin' ? 'Super Admin' : 'Organizer')}</div></div></div>
          <button className="signout" onClick={out}><Icon name="logout" size={16} /> Sign Out</button></div>
      </aside>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <b>{current?.label || 'Digital Gymkhana'}</b><span className="spacer" />
          {bellTo && <button className="bell" aria-label="Notifications" onClick={() => navigate(bellTo)}><Icon name="bell" />{badges.unread > 0 && <i />}</button>}
        </header>
        <Outlet />
      </div>
    </div>
  );
}
