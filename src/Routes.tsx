import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Jobs from './pages/Jobs';
import Invoices from './pages/Invoices';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import CalendarTest from './pages/CalendarTest';
import ScrollToTop from './components/ScrollToTop';
import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import GoogleAuthCallback from './pages/GoogleAuthCallback';

const Routes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <React.Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="settings" element={<Settings />} />
            <Route path="calendar-test" element={<CalendarTest />} />
            <Route path="admin" element={<ProtectedRoute adminOnly={true}><Admin /></ProtectedRoute>} />
          </Route>

          {/* Auth Related Routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/google-callback" element={<GoogleAuthCallback />} />

          {/* Catch-all route for handling unknown paths */}
          <Route path="*" element={<div>Page not found</div>} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
};

export default Routes;
