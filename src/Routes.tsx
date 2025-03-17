
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

const Routes = () => {
  return (
    <ReactRoutes>
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/client/new" element={<ProtectedRoute><ClientNew /></ProtectedRoute>} />
      <Route path="/client/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
      <Route path="/client/:id/edit" element={<ProtectedRoute><ClientEdit /></ProtectedRoute>} />
      <Route path="/client/:clientId/invoice/new" element={<ProtectedRoute><InvoiceCreate /></ProtectedRoute>} />
      <Route path="/client/:clientId/invoice/:invoiceId/edit" element={<ProtectedRoute><InvoiceCreate /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
      <Route path="/job/new" element={<ProtectedRoute><JobCreate /></ProtectedRoute>} />
      <Route path="/job/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
      <Route path="/job/:id/edit" element={<ProtectedRoute><JobEdit /></ProtectedRoute>} />
      <Route path="/job/:jobId/invoice/new" element={<ProtectedRoute><InvoiceCreate /></ProtectedRoute>} />
      <Route path="/job/:jobId/invoice/:invoiceId/edit" element={<ProtectedRoute><InvoiceCreate /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/invoice/:viewLink" element={<InvoiceView />} />
      {/* Add a new route for viewing an invoice by ID */}
      <Route path="/invoice/:id" element={<ProtectedRoute><InvoiceView /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </ReactRoutes>
  );
};

export default Routes;
