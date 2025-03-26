import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getInvoiceByViewLink, updateInvoiceStatus, updateContractStatus } from '@/lib/storage';
import { Invoice } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, FileCheck, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';
import { supabase, logDebug, logError } from "@/integrations/supabase/client";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const InvoicePdfView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [functionError, setFunctionError] = useState<string | null>(null);
  const [clientSidePdfGenerating, setClientSidePdfGenerating] = useState(false);
  const { viewLink } = useParams<{ viewLink: string }>();
  const pdfContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        if (!viewLink) {
          setError('Invalid URL. Please provide a valid invoice link.');
          return;
        }

        const cleanViewLink = viewLink.includes('/')
          ? viewLink.split('/').pop() || viewLink
          : viewLink;

        logDebug('Fetching invoice with cleaned view link:', cleanViewLink);
        
        const fetchedInvoice = await getInvoiceByViewLink(cleanViewLink);
        if (!fetchedInvoice) {
          setError('Invoice not found. Please check the URL or contact support.');
          return;
        }

        setInvoice(fetchedInvoice);
        
        if (!fetchedInvoice.pdfUrl) {
          generateInvoicePdf(fetchedInvoice.id);
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
      setGeneratingPdf(true);
      setFunctionError(null);
      toast.info('Preparing invoice PDF...');
      
      logDebug('Calling generate-invoice-pdf function', { invoiceId });
      
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId }
      });
      
      if (error) {
        logError('Error invoking generate-invoice-pdf function', error);
        setFunctionError(`Error: ${error.message || 'Failed to generate PDF'}`);
        toast.error('Failed to generate invoice PDF. Please try again.');
        return;
      }
      
      if (data?.pdfUrl) {
        setInvoice(prev => prev ? { ...prev, pdfUrl: data.pdfUrl } : null);
        toast.success('Invoice PDF ready');
      } else {
        logError('No PDF URL returned from function', data);
        setFunctionError('No PDF URL returned from the server');
        toast.error('Failed to generate invoice PDF. Please try again.');
      }
    } catch (err) {
      logError('Exception in generateInvoicePdf', err);
      setFunctionError(`Exception: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error('Failed to generate invoice PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleRetryGeneratePdf = () => {
    if (!invoice) return;
    generateInvoicePdf(invoice.id);
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
    
    window.open(invoice.pdfUrl, '_blank');
  };

  const generateClientSidePdf = async () => {
    if (!pdfContainerRef.current) {
      toast.error('Cannot generate PDF: content not found');
      return;
    }

    try {
      setClientSidePdfGenerating(true);
      toast.info('Preparing your PDF...');

      const element = pdfContainerRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      position -= pageHeight;
      
      while (position > -imgHeight) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        position -= pageHeight;
      }
      
      pdf.save(`invoice-${invoice?.number || 'download'}.pdf`);
      toast.success('PDF generated successfully');
    } catch (err) {
      console.error('Error generating client-side PDF:', err);
      toast.error('Failed to generate PDF. Please try again or use the server PDF.');
    } finally {
      setClientSidePdfGenerating(false);
    }
  };

  const renderPdfDownloadButtons = () => (
    <div className="flex justify-center gap-2 mt-4">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={generateClientSidePdf} 
        disabled={clientSidePdfGenerating}
      >
        {clientSidePdfGenerating ? 
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : 
          <Download className="h-4 w-4 mr-2" />
        }
        Download as PDF
      </Button>
      {invoice?.pdfUrl && (
        <Button 
          variant="default" 
          size="sm" 
          onClick={handleDownloadPdf}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Server PDF
        </Button>
      )}
    </div>
  );

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
          <h1 className="text-2xl font-bold mb-2">Invoice #{invoice?.number}</h1>
          <p className="text-muted-foreground">
            Please review the invoice and contract terms below.
          </p>
          {renderPdfDownloadButtons()}
        </div>

        <Card className="bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Invoice #{invoice?.number}</span>
              <div className="flex gap-2">
                {renderPdfDownloadButtons()}
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div ref={pdfContainerRef}>
              {invoice.pdfUrl ? (
                <div className="w-full h-[70vh] border rounded-md overflow-hidden">
                  <embed 
                    src={invoice.pdfUrl} 
                    type="application/pdf" 
                    width="100%" 
                    height="100%" 
                  />
                </div>
              ) : (
                <div className="flex justify-center items-center h-64 flex-col">
                  {generatingPdf ? (
                    <>
                      <p className="mb-4">Preparing invoice PDF...</p>
                      <div className="w-10 h-10 border-4 border-t-blue-500 border-b-blue-500 border-l-blue-200 border-r-blue-200 rounded-full animate-spin mx-auto"></div>
                    </>
                  ) : (
                    <>
                      {functionError ? (
                        <div className="text-center max-w-md">
                          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                          <p className="mb-4 text-red-500">There was an error generating the PDF:</p>
                          <p className="mb-4 p-2 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded text-sm font-mono overflow-auto max-h-28">{functionError}</p>
                        </div>
                      ) : (
                        <p className="mb-4">Click the button to generate the invoice PDF.</p>
                      )}
                      <Button onClick={handleRetryGeneratePdf}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate PDF
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
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

