
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import EmailTemplatesList from '@/components/admin/EmailTemplatesList';
import EmailTemplateForm from '@/components/admin/EmailTemplateForm';
import TestEmailForm from '@/components/admin/TestEmailForm';

const EmailTemplates = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <Routes>
        <Route path="/" element={<EmailTemplatesList />} />
        <Route path="/new" element={<EmailTemplateForm />} />
        <Route path="/edit/:id" element={<EmailTemplateForm />} />
        <Route path="/test/:id" element={<TestEmailForm />} />
      </Routes>
    </div>
  );
};

export default EmailTemplates;
