
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getInvoiceByViewLink, updateInvoiceStatus, updateContractStatus } from '@/lib/storage';
import { Invoice } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, FileCheck, Download } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { supabase } from "@/integrations/supabase/client";

const InvoicePdfView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { viewLink } = useParams<{ viewLink: string }>();

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        if (!viewLink) {
          setError('Invalid URL. Please provide a valid invoice link.');
          return;
        }

        const fetchedInvoice = await getInvoiceByViewLink(viewLink);
        if (!fetchedInvoice) {
          setError('Invoice not found. Please check the URL or contact support.');
          return;
        }

        setInvoice(fetchedInvoice);
        
        // If the PDF doesn't exist yet, generate it
        if (!fetchedInvoice.pdfUrl) {
          toast.info('Preparing invoice PDF...');
          await generateInvoicePdf(fetchedInvoice.id);
        }
      } catch (err) {
        console.error('Failed to load invoice:', err);
        setError('Failed to load invoice. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [viewLink]);

  const generateInvoicePdf = async (invoiceId: string) => {
    try {
      // Call our serverless function to generate the PDF
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId }
      });
      
      if (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate invoice PDF');
        return;
      }
      
      if (data?.pdfUrl) {
        // Update our local state with the new PDF URL
        setInvoice(prev => prev ? { ...prev, pdfUrl: data.pdfUrl } : null);
        toast.success('Invoice PDF ready');
      }
    } catch (err) {
      console.error('Error calling generate-invoice-pdf function:', err);
      toast.error('Failed to generate invoice PDF');
    }
  };

  const handleAcceptInvoice = async () => {
    if (!invoice) return;

    try {
      await updateInvoiceStatus(invoice.id, 'accepted');
      setInvoice(prev => prev ? { ...prev, status: 'accepted' } : null);
      toast.success('Invoice accepted successfully');
    } catch (err) {
      console.error('Failed to accept invoice:', err);
      toast.error('Error accepting invoice');
    }
  };

  const handleAcceptContract = async () => {
    if (!invoice) return;

    try {
      await updateContractStatus(invoice.id, 'accepted');
      setInvoice(prev => prev ? { ...prev, contractStatus: 'accepted' } : null);
      toast.success('Contract terms accepted successfully');
    } catch (err) {
      console.error('Failed to accept contract:', err);
      toast.error('Error accepting contract terms');
    }
  };

  const handleDownloadPdf = () => {
    if (!invoice?.pdfUrl) return;
    
    // Open the PDF URL in a new tab for download
    window.open(invoice.pdfUrl, '_blank');
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <p className="mb-2">Loading invoice...</p>
            <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-500 border-l-blue-200 border-r-blue-200 rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Error</h2>
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!invoice) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Not Found</h2>
            <p>Invoice not found. Please check the URL or contact support.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Invoice #{invoice.number}</h1>
          <p className="text-muted-foreground">
            Please review the invoice and contract terms below.
          </p>
        </div>

        <Card className="bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Invoice #{invoice.number}</span>
              {invoice.pdfUrl && (
                <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {invoice.pdfUrl ? (
              // Display the PDF using an embed tag
              <div className="w-full h-[70vh] border rounded-md overflow-hidden">
                <embed 
                  src={invoice.pdfUrl} 
                  type="application/pdf" 
                  width="100%" 
                  height="100%" 
                />
              </div>
            ) : (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <p className="mb-2">Preparing invoice PDF...</p>
                  <div className="w-10 h-10 border-4 border-t-blue-500 border-b-blue-500 border-l-blue-200 border-r-blue-200 rounded-full animate-spin mx-auto"></div>
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex-col gap-4 pt-4">
            <div className="w-full flex flex-col sm:flex-row gap-4 justify-center items-center">
              {['draft', 'sent'].includes(invoice.status) && (
                <Button 
                  onClick={handleAcceptInvoice} 
                  className="w-full sm:w-auto"
                  disabled={!invoice.pdfUrl}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept Invoice
                </Button>
              )}
              
              {invoice.status === 'accepted' && (
                <div className="w-full p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-800 dark:text-green-400">
                    Invoice accepted
                  </span>
                </div>
              )}
              
              {invoice.contractStatus !== 'accepted' && (
                <Button 
                  onClick={handleAcceptContract} 
                  variant="outline" 
                  className="w-full sm:w-auto"
                  disabled={!invoice.pdfUrl}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept Contract Terms
                </Button>
              )}
              
              {invoice.contractStatus === 'accepted' && (
                <div className="w-full p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-800 dark:text-green-400">
                    Contract terms accepted
                  </span>
                </div>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </PageTransition>
  );
};

export default InvoicePdfView;
