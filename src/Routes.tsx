
import React from 'react';
import { Route, Routes as ReactRoutes } from 'react-router-dom';
import Index from './pages/Index';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import ClientNew from './pages/ClientNew';
import ClientEdit from './pages/ClientEdit';
import InvoiceView from './pages/InvoiceView';
import InvoiceCreate from './pages/InvoiceCreate';
import ProtectedRoute from './components/ProtectedRoute';
import Settings from './pages/Settings';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import JobCreate from './pages/JobCreate';
import JobEdit from './pages/JobEdit';
import AppLayout from './components/AppLayout';
import Accounts from './pages/Accounts';
import AuthCallback from './pages/AuthCallback';
import Invoices from './pages/Invoices';
import InvoicePdfView from './pages/InvoicePdfView';
import Subscription from './pages/Subscription';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SubscriptionCancel from './pages/SubscriptionCancel';
import SubscriptionGuard from './components/SubscriptionGuard';
import Admin from './pages/Admin';
import AdminLayout from './components/AdminLayout';
import Debug from './pages/Debug';
import CalendarTest from './pages/CalendarTest';
import GoogleOAuthDiagnostic from './pages/GoogleOAuthDiagnostic';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

const Routes = () => {
  return (
    <ReactRoutes>
      {/* Auth routes outside of the layout */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Legal pages - publicly accessible without layout */}
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      
      {/* Admin routes with admin layout */}
      <Route element={<ProtectedRoute adminOnly={true}><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<Admin />} />
        <Route path="/debug" element={<Debug />} />
        <Route path="/admin/google-oauth-diagnostic" element={<GoogleOAuthDiagnostic />} />
      </Route>
      
      {/* Subscription routes */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/subscription/success" element={<SubscriptionSuccess />} />
        <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
      </Route>
      
      {/* Calendar test route (protected but with regular AppLayout) */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/calendar-test" element={<CalendarTest />} />
      </Route>
      
      {/* Public invoice views without AppLayout for client view */}
      <Route path="/invoice/:idOrViewLink" element={<InvoiceView />} />
      <Route path="/invoice/pdf/:viewLink" element={<InvoicePdfView />} />
      
      {/* Protected routes with layout that require subscription */}
      <Route element={<ProtectedRoute><SubscriptionGuard><AppLayout /></SubscriptionGuard></ProtectedRoute>}>
        <Route path="/" element={<Index />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/client/new" element={<ClientNew />} />
        <Route path="/client/:id" element={<ClientDetail />} />
        <Route path="/client/:id/edit" element={<ClientEdit />} />
        
        {/* Job routes */}
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/job/new" element={<JobCreate />} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/job/:id/edit" element={<JobEdit />} />
        
        {/* Client-specific job routes */}
        <Route path="/client/:clientId/job/new" element={<JobCreate />} />
        <Route path="/client/:clientId/job/create" element={<JobCreate />} />
        
        {/* Invoice routes */}
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoice/:id/edit" element={<InvoiceCreate />} />
        <Route path="/client/:clientId/invoice/new" element={<InvoiceCreate />} />
        <Route path="/client/:clientId/invoice/create" element={<InvoiceCreate />} />
        <Route path="/client/:clientId/invoice/:invoiceId/edit" element={<InvoiceCreate />} />
        
        {/* Job-related invoice routes */}
        <Route path="/job/:jobId/invoice/new" element={<InvoiceCreate />} />
        <Route path="/job/:jobId/invoice/create" element={<InvoiceCreate />} />
        <Route path="/job/:jobId/invoice/:invoiceId/edit" element={<InvoiceCreate />} />
        
        {/* Admin invoice view (wrapped in AppLayout) */}
        <Route path="/invoice/:id/admin" element={<InvoiceView />} />
        
        {/* Account routes */}
        <Route path="/account" element={<Accounts />} />
        
        <Route path="/settings" element={<Settings />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </ReactRoutes>
  );
};

export default Routes;
