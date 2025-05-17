
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
import InvoiceCreate from '@/pages/InvoiceCreate';
import InvoicePdfView from '@/pages/InvoicePdfView';
import Jobs from '@/pages/Jobs';
import NotFound from '@/pages/NotFound';
import AppLayout from '@/components/AppLayout';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import ProtectedRoute from '@/components/ProtectedRoute';
import SubscriptionGuard from '@/components/SubscriptionGuard';
import Settings from '@/pages/Settings';
import Payments from '@/pages/Payments';
import Accounts from '@/pages/Accounts';
import EmailVerification from '@/pages/EmailVerification';
import JobCreate from '@/pages/JobCreate';
import JobDetail from '@/pages/JobDetail';
import JobEdit from '@/pages/JobEdit';
import Admin from '@/pages/Admin';
import Debug from '@/pages/Debug';
import AdminLayout from '@/components/AdminLayout';
import CalendarTest from '@/pages/CalendarTest';
import EmailTemplates from '@/pages/EmailTemplates';
import EmailHistory from '@/pages/EmailHistory';
import SendEmail from '@/pages/SendEmail';
import SubscriptionEnded from '@/pages/SubscriptionEnded';
import Tutorial from '@/pages/Tutorial';

const AppRoutes = () => {
  const { user } = useAuth();
  const { subscription } = useSubscription();

  return (
    <ReactRoutes>
      {/* Authentication routes - public */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/verify-email" element={<EmailVerification />} />
      
      {/* Static pages - public */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      
      {/* Tutorial page - public */}
      <Route path="/tutorial" element={<Tutorial />} />
      
      {/* Public invoice view routes */}
      <Route path="/invoice/:idOrViewLink" element={<InvoiceView />} />
      <Route path="/invoice-pdf/:viewLink" element={<InvoicePdfView />} />
      
      {/* Subscription routes - protected but not subscription-guarded */}
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        {/* Dashboard accessible to all authenticated users */}
        <Route index element={<Index />} />
        
        {/* Subscription management routes */}
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/subscription/success" element={<SubscriptionSuccess />} />
        <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
        <Route path="/subscription/ended" element={<SubscriptionEnded />} />
      </Route>
      
      {/* Premium features - protected AND subscription-guarded */}
      <Route path="/" element={
        <ProtectedRoute>
          <SubscriptionGuard>
            <AppLayout />
          </SubscriptionGuard>
        </ProtectedRoute>
      }>
        {/* Client management */}
        <Route path="/clients" element={<Clients />} />
        <Route path="/client/new" element={<ClientNew />} />
        <Route path="/client/:id" element={<ClientDetail />} />
        <Route path="/client/:id/edit" element={<ClientEdit />} />
        
        {/* Invoice management */}
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/job/:jobId/invoice/create" element={<InvoiceCreate />} />
        <Route path="/job/:jobId/invoice/new" element={<InvoiceCreate />} />
        <Route path="/invoice/:invoiceId/edit" element={<InvoiceCreate />} />
        
        {/* Job management */}
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/job/:id/edit" element={<JobEdit />} />
        <Route path="/client/:clientId/job/create" element={<JobCreate />} />
        
        {/* Financial management */}
        <Route path="/expenses" element={<Accounts />} />
        <Route path="/payments" element={<Payments />} />
        
        {/* Settings */}
        <Route path="/settings" element={<Settings />} />
      </Route>
      
      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly={true}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Admin />} />
        <Route path="debug" element={<Debug />} />
        <Route path="calendar-test" element={<CalendarTest />} />
        <Route path="email-templates/*" element={<EmailTemplates />} />
        <Route path="email-history" element={<EmailHistory />} />
        <Route path="send-email" element={<SendEmail />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </ReactRoutes>
  );
};

export default AppRoutes;
