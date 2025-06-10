
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
import PublicRoute from '@/components/ProtectedRoute';
import PrivateRoute from '@/components/ProtectedRoute';
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
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/client/create" element={<PrivateRoute><ClientForm /></PrivateRoute>} />
          <Route path="/client/:id" element={<PrivateRoute><ClientView /></PrivateRoute>} />
          <Route path="/client/:id/edit" element={<PrivateRoute><ClientForm /></PrivateRoute>} />
          <Route path="/job/create" element={<PrivateRoute><JobForm /></PrivateRoute>} />
          <Route path="/job/:id" element={<PrivateRoute><JobView /></PrivateRoute>} />
          <Route path="/job/:id/edit" element={<PrivateRoute><JobForm /></PrivateRoute>} />
          <Route path="/invoice/create" element={<PrivateRoute><InvoiceForm /></PrivateRoute>} />
          <Route path="/invoice/:id" element={<PrivateRoute><InvoiceView /></PrivateRoute>} />
          <Route path="/invoice/:id/edit" element={<PrivateRoute><InvoiceForm /></PrivateRoute>} />
          <Route path="/invoice/:idOrViewLink/view" element={<InvoicePublicView />} />
          <Route path="/invoice/:idOrViewLink" element={<InvoiceView />} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute adminOnly><Admin /></PrivateRoute>} />
          <Route path="/debug" element={<Debug />} />
          <Route path="/version-control" element={<VersionControl />} />
        </ReactRoutes>
      </AppLayout>
    </Suspense>
  );
};

export default Routes;
