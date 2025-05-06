import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useParams } from 'react-router-dom';
import { getInvoiceByViewLink } from '@/lib/storage';
import { Invoice } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import PageTransition from '@/components/ui-custom/PageTransition';
import { supabase } from "@/integrations/supabase/client";

const InvoicePdfView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { viewLink } = useParams<{ viewLink: string }>();

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!viewLink) return;
      
      try {
        const invoiceData = await getInvoiceByViewLink(viewLink);
        setInvoice(invoiceData);
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError("Could not load invoice data. Please check the link and try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoice();
  }, [viewLink]);

  const handleCopyInvoiceLink = () => {
    if (!invoice) return;
    
    const baseUrl = window.location.origin;
    
    let cleanViewLink = invoice.viewLink || '';
    if (cleanViewLink.includes('http') || cleanViewLink.includes('/invoice/')) {
      const parts = cleanViewLink.split('/');
      cleanViewLink = parts[parts.length - 1];
    }
    
    const cleanUrl = `${baseUrl}/invoice/${cleanViewLink}`;
    
    navigator.clipboard.writeText(cleanUrl)
      .then(() => {
        toast.success('Invoice Link Copied');
      })
      .catch((err) => {
        console.error('Failed to copy invoice link:', err);
        toast.error('Failed to Copy Link', {
          description: 'Please try again or manually copy the link.'
        });
      });
  };

  const handleDownloadInvoice = async () => {
    if (!invoice) return;
    
    setIsDownloading(true);
    toast.info('Preparing PDF for download...');
    
    try {
      // If we already have a PDF URL, use it directly
      if (invoice.pdfUrl) {
        window.open(invoice.pdfUrl, '_blank');
        setIsDownloading(false);
        return;
      }
      
      // Otherwise, generate a new PDF
      const response = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId: invoice.id }
      });
      
      if (response.error) {
        throw new Error(`Failed to generate PDF: ${response.error.message}`);
      }
      
      if (response.data?.pdfUrl) {
        window.open(response.data.pdfUrl, '_blank');
        // Update the invoice object with the new PDF URL
        setInvoice(prev => prev ? { ...prev, pdfUrl: response.data.pdfUrl } : null);
        toast.success('Invoice downloaded successfully');
      } else {
        throw new Error('No PDF URL returned from the function');
      }
    } catch (err) {
      console.error('Error downloading invoice:', err);
      toast.error('Failed to download invoice', {
        description: 'Please try again later or contact support.'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6 flex justify-center items-center min-h-[300px]">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 w-64 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Invoice</h1>
                <p className="text-gray-600">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-4">Invoice Details</h1>
            {invoice && (
              <div className="space-y-4">
                <div>
                  <span className="font-medium">Invoice Number:</span> {invoice.number}
                </div>
                <div>
                  <span className="font-medium">Client ID:</span> {invoice.clientId}
                </div>
                <div>
                  <span className="font-medium">Amount:</span> ${invoice.amount?.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {invoice.status}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t p-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCopyInvoiceLink}
            >
              Copy Invoice Link
            </Button>
            <Button
              variant="default"
              onClick={handleDownloadInvoice}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageTransition>
  );
};

export default InvoicePdfView;
