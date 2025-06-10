import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes as ReactRoutes, Route } from 'react-router-dom';
import AppLayout from '@/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import ClientForm from '@/pages/ClientForm';
import ClientView from '@/pages/ClientView';
import JobForm from '@/pages/JobForm';
import JobView from '@/pages/JobView';
import InvoiceForm from '@/pages/InvoiceForm';
import InvoiceView from '@/pages/InvoiceView';
import Settings from '@/pages/Settings';
import Admin from '@/pages/Admin';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import SignUp from '@/pages/SignUp';
import PublicRoute from '@/components/PublicRoute';
import PrivateRoute from '@/components/PrivateRoute';
import InvoicePublicView from '@/pages/InvoicePublicView';
import Debug from '@/pages/Debug';
import VersionControl from '@/pages/VersionControl';

const Routes = () => {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <AppLayout>
          <ReactRoutes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />
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
            <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
            <Route path="/debug" element={<Debug />} />
            <Route path="/version-control" element={<VersionControl />} />
          </ReactRoutes>
        </AppLayout>
      </Suspense>
    </Router>
  );
};

export default Routes;
