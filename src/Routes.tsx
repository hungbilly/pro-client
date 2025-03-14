
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import ClientDetail from '@/pages/ClientDetail';
import ClientNew from '@/pages/ClientNew';
import InvoiceCreate from '@/pages/InvoiceCreate';
import InvoiceView from '@/pages/InvoiceView';
import JobCreate from '@/pages/JobCreate';
import JobEdit from '@/pages/JobEdit';
import JobDetail from '@/pages/JobDetail';
import NotFound from '@/pages/NotFound';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/client/new" element={<ClientNew />} />
      <Route path="/client/:id" element={<ClientDetail />} />
      <Route path="/client/:clientId/job/create" element={<JobCreate />} />
      <Route path="/client/:clientId/job/edit/:id" element={<JobEdit />} />
      <Route path="/job/:id" element={<JobDetail />} />
      <Route path="/job/:jobId/invoice/create" element={<InvoiceCreate />} />
      <Route path="/invoice/:viewLink" element={<InvoiceView />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
