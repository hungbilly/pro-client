import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';
import { useUser } from '@supabase/auth-helpers-react';
import { useSubscription } from '@/hooks/useSubscription';

import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import AuthCallback from '@/pages/AuthCallback';
import Subscription from '@/pages/Subscription';
import SubscriptionSuccess from '@/pages/SubscriptionSuccess';
import SubscriptionCancel from '@/pages/SubscriptionCancel';
import Account from '@/pages/Account';
import Clients from '@/pages/Clients';
import Client from '@/pages/Client';
import Invoices from '@/pages/Invoices';
import Invoice from '@/pages/Invoice';
import InvoiceView from '@/pages/InvoiceView';
import Jobs from '@/pages/Jobs';
import Job from '@/pages/Job';
import NotFound from '@/pages/NotFound';
import AppLayout from '@/components/AppLayout';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import InvoicePdfView from '@/pages/InvoicePdfView';

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  return user ? <>{children}</> : null;
};

const SubscriptionGuard = ({ children }: { children?: React.ReactNode }) => {
  const user = useUser();
  const { subscription } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !subscription) {
      navigate('/subscription');
    }
  }, [user, subscription, navigate]);

  return subscription ? <>{children}</> : null;
};

const Routes = () => {
  const user = useUser();
  const { subscription } = useSubscription();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Static pages */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<SubscriptionGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/account" element={<Account />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:clientId" element={<Client />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/:invoiceId" element={<Invoice />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:jobId" element={<Job />} />
            </Route>
          </Route>
          
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/subscription/success" element={<SubscriptionSuccess />} />
          <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
        </Route>
        
        {/* Public invoice view */}
        <Route path="/invoice/:viewLink" element={<InvoiceView />} />
        <Route path="/invoice-pdf/:viewLink" element={<InvoicePdfView />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default Routes;
