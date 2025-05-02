
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

const AppRoutes = () => {
  const { user } = useAuth();
  const { subscription } = useSubscription();

  return (
    <ReactRoutes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
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
      
      <Route path="/" element={
        <ProtectedRoute>
          <SubscriptionGuard>
            <AppLayout />
          </SubscriptionGuard>
        </ProtectedRoute>
      }>
        <Route path="/clients" element={<Clients />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/account" element={<Payments />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      
      {/* Public invoice view */}
      <Route path="/invoice/:viewLink" element={<InvoiceView />} />
      <Route path="/invoice-pdf/:viewLink" element={<InvoicePdfView />} />
      
      <Route path="*" element={<NotFound />} />
    </ReactRoutes>
  );
};

export default AppRoutes;
