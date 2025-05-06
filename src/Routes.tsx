
import React from 'react';
import {
  Routes as ReactRoutes,
  Route,
  useNavigate,
  Outlet
} from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';

import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import AuthCallback from '@/pages/AuthCallback';
import Subscription from '@/pages/Subscription';
import SubscriptionSuccess from '@/pages/SubscriptionSuccess';
import SubscriptionCancel from '@/pages/SubscriptionCancel';
import Clients from '@/pages/Clients';
import ClientDetail from '@/pages/ClientDetail';
import ClientEdit from '@/pages/ClientEdit';
import ClientNew from '@/pages/ClientNew';
import Invoices from '@/pages/Invoices';
import InvoiceView from '@/pages/InvoiceView';
import Jobs from '@/pages/Jobs';
import NotFound from '@/pages/NotFound';
import AppLayout from '@/components/AppLayout';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import InvoicePdfView from '@/pages/InvoicePdfView';
import ProtectedRoute from '@/components/ProtectedRoute';
import SubscriptionGuard from '@/components/SubscriptionGuard';
import Settings from '@/pages/Settings';
import Payments from '@/pages/Payments';
import EmailVerification from '@/pages/EmailVerification';
import JobCreate from '@/pages/JobCreate';
import JobDetail from '@/pages/JobDetail';
import JobEdit from '@/pages/JobEdit';
import Admin from '@/pages/Admin';
import Debug from '@/pages/Debug';
import AdminLayout from '@/components/AdminLayout';
import CalendarTest from '@/pages/CalendarTest';

const AppRoutes = () => {
  const { user } = useAuth();
  const { subscription } = useSubscription();

  return (
    <ReactRoutes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/verify-email" element={<EmailVerification />} />
      
      {/* Static pages */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      
      <Route path="/subscription" element={
        <ProtectedRoute>
          <Subscription />
        </ProtectedRoute>
      } />
      <Route path="/subscription/success" element={
        <ProtectedRoute>
          <SubscriptionSuccess />
        </ProtectedRoute>
      } />
      <Route path="/subscription/cancel" element={
        <ProtectedRoute>
          <SubscriptionCancel />
        </ProtectedRoute>
      } />
      
      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly={true}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Admin />} />
        <Route path="/admin/debug" element={<Debug />} />
        <Route path="/admin/calendar-test" element={<CalendarTest />} />
      </Route>
      
      {/* All authenticated app pages with AppLayout */}
      <Route path="/" element={
        <ProtectedRoute>
          <SubscriptionGuard>
            <AppLayout />
          </SubscriptionGuard>
        </ProtectedRoute>
      }>
        <Route index element={<Index />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/client/new" element={<ClientNew />} />
        <Route path="/client/:id" element={<ClientDetail />} />
        <Route path="/client/:id/edit" element={<ClientEdit />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/account" element={<Payments />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* Job routes */}
        <Route path="/job/:jobId" element={<JobDetail />} />
        <Route path="/job/:jobId/edit" element={<JobEdit />} />
        <Route path="/client/:clientId/job/create" element={<JobCreate />} />
      </Route>
      
      {/* Public invoice view */}
      <Route path="/invoice/:idOrViewLink" element={<InvoiceView />} />
      <Route path="/invoice-pdf/:viewLink" element={<InvoicePdfView />} />
      
      <Route path="*" element={<NotFound />} />
    </ReactRoutes>
  );
};

export default AppRoutes;
