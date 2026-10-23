import AppLayout from './AppLayout.jsx';
import { api } from '../services/api.js';

const nav = [
  { to: '/student/dashboard', label: 'Dashboard', icon: 'home' }, { to: '/student/events', label: 'Events', icon: 'calendar' },
  { to: '/student/registrations', label: 'My Registrations', icon: 'clipboard' }, { to: '/student/history', label: 'Participation History', icon: 'clock' },
  { to: '/student/results', label: 'Results', icon: 'chart' }, { to: '/student/certificates', label: 'Certificates', icon: 'award' },
  { to: '/student/notifications', label: 'Notifications', icon: 'bell', badge: 'unread' }, { to: '/student/profile', label: 'Profile', icon: 'user' },
];
const fetchBadges = () => api.getFull('/notifications').then((r) => ({ unread: r.meta?.unread || 0 }));
export default function StudentLayout() { return <AppLayout nav={nav} portal="student" bellTo="/student/notifications" fetchBadges={fetchBadges} />; }
