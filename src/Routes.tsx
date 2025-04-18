
import { Route, Routes } from 'react-router-dom';
import RequireAuth from '@/components/ProtectedRoute';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import AuthCallback from '@/pages/AuthCallback';
import NotFound from '@/pages/NotFound';
import Clients from '@/pages/Clients';
import ClientDetail from '@/pages/ClientDetail';
import ClientNew from '@/pages/ClientNew';
import ClientEdit from '@/pages/ClientEdit';
import Jobs from '@/pages/Jobs';
import JobCreate from '@/pages/JobCreate';
import JobDetail from '@/pages/JobDetail';
import JobEdit from '@/pages/JobEdit';
import Invoices from '@/pages/Invoices';
import InvoiceCreate from '@/pages/InvoiceCreate';
import InvoiceView from '@/pages/InvoiceView';
import InvoicePdfView from '@/pages/InvoicePdfView';
import Settings from '@/pages/Settings';
import Admin from '@/pages/Admin';
import AdminThemes from '@/pages/AdminThemes';
import AdminLayout from '@/components/AdminLayout';
import AppLayout from '@/components/AppLayout';
import GoogleAuthCallback from '@/pages/GoogleAuthCallback';
import SubscriptionGuard from '@/components/SubscriptionGuard';
import Subscription from '@/pages/Subscription';
import SubscriptionSuccess from '@/pages/SubscriptionSuccess';
import SubscriptionCancel from '@/pages/SubscriptionCancel';
import Accounts from '@/pages/Accounts';
import Debug from '@/pages/Debug';
import GoogleOAuthDiagnostic from '@/pages/GoogleOAuthDiagnostic';
import CalendarTest from '@/pages/CalendarTest';
import Payments from '@/pages/Payments';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected routes */}
      <Route element={<RequireAuth />}>
        {/* Main app routes */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<SubscriptionGuard><Index /></SubscriptionGuard>} />
          <Route path="/clients" element={<SubscriptionGuard><Clients /></SubscriptionGuard>} />
          <Route path="/clients/new" element={<SubscriptionGuard><ClientNew /></SubscriptionGuard>} />
          <Route path="/clients/:id" element={<SubscriptionGuard><ClientDetail /></SubscriptionGuard>} />
          <Route path="/clients/:id/edit" element={<SubscriptionGuard><ClientEdit /></SubscriptionGuard>} />
          
          <Route path="/jobs" element={<SubscriptionGuard><Jobs /></SubscriptionGuard>} />
          <Route path="/jobs/create" element={<SubscriptionGuard><JobCreate /></SubscriptionGuard>} />
          <Route path="/jobs/:id" element={<SubscriptionGuard><JobDetail /></SubscriptionGuard>} />
          <Route path="/jobs/:id/edit" element={<SubscriptionGuard><JobEdit /></SubscriptionGuard>} />
          
          <Route path="/invoices" element={<SubscriptionGuard><Invoices /></SubscriptionGuard>} />
          <Route path="/invoices/create" element={<SubscriptionGuard><InvoiceCreate /></SubscriptionGuard>} />
          <Route path="/invoices/:id" element={<SubscriptionGuard><InvoiceView /></SubscriptionGuard>} />
          <Route path="/invoices/:id/pdf" element={<SubscriptionGuard><InvoicePdfView /></SubscriptionGuard>} />
          
          <Route path="/settings" element={<SubscriptionGuard><Settings /></SubscriptionGuard>} />
          <Route path="/accounts" element={<SubscriptionGuard><Accounts /></SubscriptionGuard>} />
          <Route path="/payments" element={<SubscriptionGuard><Payments /></SubscriptionGuard>} />
          
          <Route path="/calendar-test" element={<SubscriptionGuard><CalendarTest /></SubscriptionGuard>} />
        </Route>
        
        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Admin />} />
          <Route path="themes" element={<AdminThemes />} />
          <Route path="calendar-test" element={<CalendarTest />} />
          <Route path="google-oauth-diagnostic" element={<GoogleOAuthDiagnostic />} />
        </Route>
        
        {/* Subscription routes */}
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/subscription/success" element={<SubscriptionSuccess />} />
        <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
        
        {/* Debugging */}
        <Route path="/debug" element={<Debug />} />
        
        {/* OAuth callbacks */}
        <Route path="/google/callback" element={<GoogleAuthCallback />} />
      </Route>
      
      {/* Fallback route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
