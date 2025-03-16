import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getInvoiceByViewLink, updateInvoiceStatus, updateContractStatus } from '@/lib/storage';
import { Invoice, InvoiceStatus, ContractStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Check, Download, Send } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';

interface RelatedClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface RelatedCompany {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
}

interface RelatedJob {
  id: string;
  title: string;
  description?: string;
  date?: string;
  location?: string;
}

const InvoiceView = () => {
  const { viewLink } = useParams<{ viewLink: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<RelatedClient | null>(null);
  const [company, setCompany] = useState<RelatedCompany | null>(null);
  const [job, setJob] = useState<RelatedJob | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!viewLink) {
        setLoading(false);
        return;
      }

      try {
        const invoiceData = await getInvoiceByViewLink(viewLink);
        setInvoice(invoiceData);
        
        // Get related entities from session storage
        const storedClient = sessionStorage.getItem('current_invoice_client');
        const storedCompany = sessionStorage.getItem('current_invoice_company');
        const storedJob = sessionStorage.getItem('current_invoice_job');
        
        if (storedClient) setClient(JSON.parse(storedClient));
        if (storedCompany) setCompany(JSON.parse(storedCompany));
        if (storedJob) setJob(JSON.parse(storedJob));
      } catch (error) {
        console.error('Error fetching invoice:', error);
        toast.error('Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [viewLink]);

  const handleStatusUpdate = async (status: InvoiceStatus) => {
    if (!invoice) return;
    
    try {
      const updatedInvoice = await updateInvoiceStatus(invoice.id, status);
      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        toast.success(`Invoice marked as ${status}`);
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    }
  };

  const handleContractStatusUpdate = async (status: ContractStatus) => {
    if (!invoice) return;
    
    try {
      const updatedInvoice = await updateContractStatus(invoice.id, status);
      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        toast.success(`Contract ${status}`);
      }
    } catch (error) {
      console.error('Error updating contract status:', error);
      toast.error('Failed to update contract status');
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-8 px-4">
        {loading ? (
          <div className="flex justify-center items-center min-h-[50vh]">
            <p>Loading invoice...</p>
          </div>
        ) : !invoice ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Invoice Not Found</h2>
            <p>The requested invoice could not be found or has been removed.</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold">Invoice #{invoice.number}</h1>
                <p className="text-muted-foreground mt-2">
                  {invoice.date && new Date(invoice.date).toLocaleDateString()}
                </p>
              </div>
              
              {company && company.logoUrl && (
                <div className="w-32">
                  <img 
                    src={company.logoUrl} 
                    alt={company.name} 
                    className="max-w-full h-auto"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>From</CardTitle>
                </CardHeader>
                <CardContent>
                  {company ? (
                    <div>
                      <p className="font-bold">{company.name}</p>
                      {company.address && <p className="whitespace-pre-line">{company.address}</p>}
                      {company.email && <p>{company.email}</p>}
                      {company.phone && <p>{company.phone}</p>}
                    </div>
                  ) : (
                    <p>Company information not available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>To</CardTitle>
                </CardHeader>
                <CardContent>
                  {client ? (
                    <div>
                      <p className="font-bold">{client.name}</p>
                      {client.address && <p className="whitespace-pre-line">{client.address}</p>}
                      {client.email && <p>{client.email}</p>}
                      {client.phone && <p>{client.phone}</p>}
                    </div>
                  ) : (
                    <p>Client information not available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {job && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Job Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="font-bold">{job.title}</p>
                    {job.description && <p className="whitespace-pre-line">{job.description}</p>}
                    {job.location && <p><strong>Location:</strong> {job.location}</p>}
                    {job.date && <p><strong>Date:</strong> {new Date(job.date).toLocaleDateString()}</p>}
                    {invoice.shootingDate && (
                      <p><strong>Shooting Date:</strong> {new Date(invoice.shootingDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Display invoice items */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Invoice Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2">Qty</th>
                        <th className="text-right py-2">Rate</th>
                        <th className="text-right py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr key={item.id || index} className="border-b">
                          <td className="py-3">{item.description}</td>
                          <td className="text-right py-3">{item.quantity}</td>
                          <td className="text-right py-3">${item.rate.toFixed(2)}</td>
                          <td className="text-right py-3">${item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="font-bold">
                        <td colSpan={3} className="text-right py-3">Total:</td>
                        <td className="text-right py-3">${invoice.amount.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Invoice notes */}
            {invoice.notes && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line">{invoice.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Contract terms and acceptance */}
            {invoice.contractTerms && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Contract Terms</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-line">{invoice.contractTerms}</div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col items-start gap-4">
                  <div className="w-full">
                    <p className="mb-2">Contract Status: 
                      <span className={`ml-2 font-bold ${
                        invoice.contractStatus === 'accepted' ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {invoice.contractStatus === 'accepted' ? 'Accepted' : 'Pending'}
                      </span>
                    </p>
                    
                    {invoice.contractStatus !== 'accepted' && (
                      <Button 
                        onClick={() => handleContractStatusUpdate('accepted')}
                        className="w-full sm:w-auto"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Accept Contract
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            )}

            {/* Invoice status and actions */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Status</CardTitle>
                <CardDescription>
                  Current status: 
                  <span className={`ml-2 font-bold ${
                    invoice.status === 'paid' ? 'text-green-600' : 
                    invoice.status === 'accepted' ? 'text-blue-600' : 
                    invoice.status === 'sent' ? 'text-amber-600' : 'text-gray-600'
                  }`}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-3">
                {invoice.status !== 'accepted' && invoice.status !== 'paid' && (
                  <Button 
                    onClick={() => handleStatusUpdate('accepted')} 
                    variant="outline"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Accept Invoice
                  </Button>
                )}
                
                {invoice.status !== 'paid' && invoice.status === 'accepted' && (
                  <Button 
                    onClick={() => handleStatusUpdate('paid')}
                    variant="outline" 
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Mark as Paid
                  </Button>
                )}
                
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default InvoiceView;
