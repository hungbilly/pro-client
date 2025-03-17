
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Index from '@/pages/Index';
import Clients from '@/pages/Clients';
import ClientDetail from '@/pages/ClientDetail';
import ClientNew from '@/pages/ClientNew';
import ClientEdit from '@/pages/ClientEdit';
import Jobs from '@/pages/Jobs';
import InvoiceCreate from '@/pages/InvoiceCreate';
import InvoiceView from '@/pages/InvoiceView';
import JobCreate from '@/pages/JobCreate';
import JobEdit from '@/pages/JobEdit';
import JobDetail from '@/pages/JobDetail';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';
import MainNavbar from '@/components/MainNavbar';
import Auth from '@/pages/Auth';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

console.log("Routes is loading...");

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <>
      {user && <MainNavbar />}
      <Routes>
        <Route path="/auth" element={
          user ? <Navigate to="/" replace /> : <Auth />
        } />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        } />
        
        <Route path="/clients" element={
          <ProtectedRoute>
            <Clients />
          </ProtectedRoute>
        } />
        
        <Route path="/client/new" element={
          <ProtectedRoute>
            <ClientNew />
          </ProtectedRoute>
        } />
        
        <Route path="/client/:id" element={
          <ProtectedRoute>
            <ClientDetail />
          </ProtectedRoute>
        } />
        
        <Route path="/client/edit/:id" element={
          <ProtectedRoute>
            <ClientEdit />
          </ProtectedRoute>
        } />
        
        <Route path="/jobs" element={
          <ProtectedRoute>
            <Jobs />
          </ProtectedRoute>
        } />
        
        <Route path="/client/:clientId/job/create" element={
          <ProtectedRoute>
            <JobCreate />
          </ProtectedRoute>
        } />
        
        <Route path="/job/create" element={
          <ProtectedRoute>
            <JobCreate />
          </ProtectedRoute>
        } />
        
        <Route path="/client/:clientId/job/edit/:id" element={
          <ProtectedRoute>
            <JobEdit />
          </ProtectedRoute>
        } />
        
        <Route path="/job/:id" element={
          <ProtectedRoute>
            <JobDetail />
          </ProtectedRoute>
        } />
        
        <Route path="/job/:jobId/invoice/create" element={
          <ProtectedRoute>
            <InvoiceCreate />
          </ProtectedRoute>
        } />
        
        <Route path="/invoice/:viewLink" element={<InvoiceView />} />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default AppRoutes;
