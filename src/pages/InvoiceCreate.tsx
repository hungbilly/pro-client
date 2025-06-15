
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoiceData } from '@/hooks/useInvoiceData';
import PageTransition from '@/components/ui-custom/PageTransition';
import JobClientSummary from '@/components/invoice/JobClientSummary';
import InvoiceTemplateSelector from '@/components/invoice/InvoiceTemplateSelector';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import InvoiceForm from '@/components/InvoiceForm';

const InvoiceCreate = () => {
  const {
    invoice, setInvoice,
    client, job, loading,
    contractTemplates, loadingTemplates,
    templates, selectedTemplate, setSelectedTemplate,
    handleTemplateSelection,
    isEditView,
    clientId, jobId, invoiceId,
  } = useInvoiceData();

  const navigate = useNavigate();

  const getBreadcrumbPaths = () => {
    const paths = [
      { label: "Dashboard", path: "/" },
    ];
    if (job) {
      paths.push({ label: "Jobs", path: "/jobs" });
      paths.push({ label: job.title, path: `/job/${job.id}` });
    } else if (client) {
      paths.push({ label: "Clients", path: "/clients" });
      paths.push({ label: client.name, path: `/client/${client.id}` });
    }
    paths.push({ label: invoice ? "Edit Invoice" : "New Invoice", path: "#" });
    return paths;
  };

  const paths = getBreadcrumbPaths();

  if (loading || loadingTemplates) {
    return (
      <PageTransition>
        <div className="container py-8 flex justify-center items-center">
          <div>Loading data...</div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="py-8">
        <div className="container">
          <div className="flex flex-col space-y-2 mb-6">
            <h1 className="text-3xl font-bold tracking-tight">{invoice ? 'Edit Invoice' : 'New Invoice'}</h1>
            <div className="text-sm text-muted-foreground flex items-center">
              {paths.map((path, index) => (
                <div key={`breadcrumb-${index}`}>
                  {index > 0 && <span className="mx-1">{'>'}</span>}
                  {path.path === '#' ? (
                    <span>{path.label}</span>
                  ) : (
                    <span
                      className="hover:underline cursor-pointer"
                      onClick={() => navigate(path.path)}
                    >
                      {path.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <JobClientSummary job={job} client={client} />
          {!job && !client && (
            <div className="mb-6">
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-6">
                  <p className="text-amber-800">
                    This invoice is not associated with a job or client. It's recommended to create invoices from a job or client page.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          <InvoiceTemplateSelector
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateChange={handleTemplateSelection}
            onClear={() => setSelectedTemplate(null)}
          />
        </div>
        <InvoiceForm
          propInvoice={invoice}
          propClientId={clientId || job?.clientId}
          propJobId={jobId}
          propInvoiceId={invoiceId}
          isEditView={isEditView}
          hasContractTemplates={contractTemplates.length > 0}
        />
      </div>
    </PageTransition>
  );
};

export default InvoiceCreate;
