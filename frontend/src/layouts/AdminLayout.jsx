import AppLayout from './AppLayout.jsx';
import { api, qs } from '../services/api.js';

const nav = [
  { group: 'OVERVIEW' }, { to: '/admin/dashboard', label: 'Dashboard', icon: 'home' }, { to: '/admin/events', label: 'Events', icon: 'calendar' },
  { group: 'EVENTS & PEOPLE' }, { to: '/admin/forms', label: 'Reg. Forms', icon: 'file' }, { to: '/admin/registrations', label: 'Registrations', icon: 'clipboard', badge: 'pending' },
  { to: '/admin/participants', label: 'Participants', icon: 'user' }, { to: '/admin/teams', label: 'Teams', icon: 'users' }, { to: '/admin/schedule', label: 'Schedule', icon: 'clock' },
  { group: 'OPERATIONS' }, { to: '/admin/results', label: 'Results', icon: 'chart' }, { to: '/admin/announcements', label: 'Announcements', icon: 'megaphone' }, { to: '/admin/certificates', label: 'Certificates', icon: 'award' },
  { group: 'DATA' }, { to: '/admin/data-processing', label: 'Data Processing', icon: 'database' }, { to: '/admin/excel', label: 'Excel Data', icon: 'table' },
  { group: 'SYSTEM' }, { to: '/admin/users', label: 'Admin Users', icon: 'shield' }, { to: '/admin/settings', label: 'Settings', icon: 'settings' },
];
const fetchBadges = () => api.get(`/registrations${qs({ status: 'Submitted' })}`).then((r) => ({ pending: r.length }));
export default function AdminLayout() { return <AppLayout nav={nav} portal="admin" fetchBadges={fetchBadges} />; }
