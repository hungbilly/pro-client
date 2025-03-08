
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import ClientDetail from '@/pages/ClientDetail';
import ClientNew from '@/pages/ClientNew';
import InvoiceCreate from '@/pages/InvoiceCreate';
import InvoiceView from '@/pages/InvoiceView';
import NotFound from '@/pages/NotFound';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/client/new" element={<ClientNew />} />
      <Route path="/client/:id" element={<ClientDetail />} />
      <Route path="/client/:id/invoice/new" element={<InvoiceCreate />} />
      <Route path="/invoice/:link" element={<InvoiceView />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
