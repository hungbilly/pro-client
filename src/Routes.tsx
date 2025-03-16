
import React from 'react';
import { Routes, Route } from 'react-router-dom';
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

const AppRoutes = () => {
  return (
    <>
      <MainNavbar />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/client/new" element={<ClientNew />} />
        <Route path="/client/:id" element={<ClientDetail />} />
        <Route path="/client/edit/:id" element={<ClientEdit />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/client/:clientId/job/create" element={<JobCreate />} />
        <Route path="/job/create" element={<JobCreate />} />
        <Route path="/client/:clientId/job/edit/:id" element={<JobEdit />} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/job/:jobId/invoice/create" element={<InvoiceCreate />} />
        <Route path="/invoice/:viewLink" element={<InvoiceView />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default AppRoutes;
