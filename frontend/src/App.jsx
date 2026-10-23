import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth.jsx';
import StudentLayout from './layouts/StudentLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import { EmptyState, Button } from './components/ui.jsx';
import StudentLogin from './pages/student/Login.jsx';
import Dashboard from './pages/student/Dashboard.jsx';
import Events from './pages/student/Events.jsx';
import EventDetail from './pages/student/EventDetail.jsx';
import Register from './pages/student/Register.jsx';
import { Registrations, RegistrationDetail } from './pages/student/Registrations.jsx';
import { History, Results, Certificates } from './pages/student/Records.jsx';
import { Notifications, Profile } from './pages/student/Account.jsx';
import AdminLogin from './pages/admin/Login.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import { AdminEvents, EventForm, AdminEventDetail } from './pages/admin/Events.jsx';
import { Forms, FormBuilder } from './pages/admin/Forms.jsx';
import { AdminRegistrations, AdminRegistrationDetail, Participants, Teams } from './pages/admin/People.jsx';
import { Schedule, AdminResults, Announcements, AdminCertificates } from './pages/admin/Operations.jsx';
import { DataProcessing, ExcelData } from './pages/admin/Data.jsx';
import { Users, Settings } from './pages/admin/System.jsx';

const NotFound = () => <EmptyState title="Page not found" message="That page doesn't exist." action={<Button to="/login">Go to sign in</Button>} />;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<StudentLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/student" element={<RequireAuth role="student"><StudentLayout /></RequireAuth>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="register/:eventId" element={<Register />} />
        <Route path="registrations" element={<Registrations />} />
        <Route path="registrations/:id" element={<RegistrationDetail />} />
        <Route path="history" element={<History />} />
        <Route path="results" element={<Results />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="events/create" element={<EventForm />} />
        <Route path="events/:id" element={<AdminEventDetail />} />
        <Route path="events/:id/edit" element={<EventForm />} />
        <Route path="forms" element={<Forms />} />
        <Route path="forms/create" element={<FormBuilder />} />
        <Route path="forms/:id" element={<FormBuilder />} />
        <Route path="registrations" element={<AdminRegistrations />} />
        <Route path="registrations/:id" element={<AdminRegistrationDetail />} />
        <Route path="participants" element={<Participants />} />
        <Route path="teams" element={<Teams />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="results" element={<AdminResults />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="certificates" element={<AdminCertificates />} />
        <Route path="data-processing" element={<DataProcessing />} />
        <Route path="excel" element={<ExcelData />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
