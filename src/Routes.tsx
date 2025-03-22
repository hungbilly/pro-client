
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

const Routes = () => {
  return (
    <ReactRoutes>
      {/* Auth routes outside of the layout */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Public invoice view wrapped in AppLayout to show menu bar */}
      <Route element={<AppLayout />}>
        <Route path="/invoice/:viewLink" element={<InvoiceView />} />
      </Route>
      
      {/* Protected routes with layout */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
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
        <Route path="/client/:clientId/invoice/new" element={<InvoiceCreate />} />
        <Route path="/client/:clientId/invoice/create" element={<InvoiceCreate />} />
        <Route path="/client/:clientId/invoice/:invoiceId/edit" element={<InvoiceCreate />} />
        
        {/* Job-related invoice routes */}
        <Route path="/job/:jobId/invoice/new" element={<InvoiceCreate />} />
        <Route path="/job/:jobId/invoice/create" element={<InvoiceCreate />} />
        <Route path="/job/:jobId/invoice/:invoiceId/edit" element={<InvoiceCreate />} />
        <Route path="/invoice/:id" element={<InvoiceView />} />
        
        {/* Account routes */}
        <Route path="/account" element={<Accounts />} />
        
        <Route path="/settings" element={<Settings />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </ReactRoutes>
  );
};

export default Routes;
