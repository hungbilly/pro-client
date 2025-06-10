
import React, { Suspense } from 'react';
import { Routes as ReactRoutes, Route } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import Dashboard from '@/pages/Index';
import ClientForm from '@/pages/ClientNew';
import ClientView from '@/pages/ClientDetail';
import JobForm from '@/pages/JobCreate';
import JobView from '@/pages/JobDetail';
import InvoiceForm from '@/pages/InvoiceCreate';
import InvoiceView from '@/pages/InvoiceView';
import Settings from '@/pages/Settings';
import Admin from '@/pages/Admin';
import Login from '@/pages/Auth';
import ForgotPassword from '@/pages/Auth';
import ResetPassword from '@/pages/Auth';
import SignUp from '@/pages/Auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import InvoicePublicView from '@/pages/InvoicePdfView';
import Debug from '@/pages/Debug';
import VersionControl from '@/pages/VersionControl';

const Routes = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AppLayout>
        <ReactRoutes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/client/create" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
          <Route path="/client/:id" element={<ProtectedRoute><ClientView /></ProtectedRoute>} />
          <Route path="/client/:id/edit" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
          <Route path="/job/create" element={<ProtectedRoute><JobForm /></ProtectedRoute>} />
          <Route path="/job/:id" element={<ProtectedRoute><JobView /></ProtectedRoute>} />
          <Route path="/job/:id/edit" element={<ProtectedRoute><JobForm /></ProtectedRoute>} />
          <Route path="/invoice/create" element={<ProtectedRoute><InvoiceForm /></ProtectedRoute>} />
          <Route path="/invoice/:id" element={<ProtectedRoute><InvoiceView /></ProtectedRoute>} />
          <Route path="/invoice/:id/edit" element={<ProtectedRoute><InvoiceForm /></ProtectedRoute>} />
          <Route path="/invoice/:idOrViewLink/view" element={<InvoicePublicView />} />
          <Route path="/invoice/:idOrViewLink" element={<InvoiceView />} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="/debug" element={<Debug />} />
          <Route path="/version-control" element={<VersionControl />} />
        </ReactRoutes>
      </AppLayout>
    </Suspense>
  );
};

export default Routes;
