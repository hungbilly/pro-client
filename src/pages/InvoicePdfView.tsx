import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useParams } from 'react-router-dom';
import { getInvoiceByViewLink } from '@/lib/storage';
import { Invoice } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import PageTransition from '@/components/ui-custom/PageTransition';
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const InvoicePdfView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadAttempts, setDownloadAttempts] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
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
    setDownloadError(null);
    toast.info('Preparing PDF for download...');
    
    try {
      // If we already have a PDF URL, verify it works before using it
      if (invoice.pdfUrl) {
        try {
          console.log('Attempting to fetch existing PDF from URL:', invoice.pdfUrl);
          
          // Check if PDF actually exists and is valid
          const pdfResponse = await fetch(invoice.pdfUrl, { method: 'HEAD' });
          
          console.log('PDF HEAD response status:', pdfResponse.status);
          console.log('PDF HEAD response headers:', 
            Array.from(pdfResponse.headers.entries())
              .map(([key, val]) => `${key}: ${val}`)
              .join(', ')
          );
          
          if (pdfResponse.ok) {
            const contentType = pdfResponse.headers.get('content-type');
            const contentLength = pdfResponse.headers.get('content-length');
            
            console.log('PDF content-type:', contentType);
            console.log('PDF content-length:', contentLength);
            
            // If content type is PDF and size is reasonable, use the existing URL
            if (contentType?.includes('pdf') && parseInt(contentLength || '0') > 1000) {
              console.log('Using existing valid PDF URL');
              window.open(invoice.pdfUrl, '_blank');
              setIsDownloading(false);
              return;
            } else {
              console.warn('Existing PDF appears invalid, regenerating...');
            }
          } else {
            console.warn('Existing PDF URL returned non-OK status, regenerating...');
          }
        } catch (e) {
          console.error('Error verifying existing PDF:', e);
          // Continue with regeneration
        }
      }
      
      // Otherwise, generate a new PDF
      console.log('Generating new PDF via edge function');
      setDownloadAttempts(prev => prev + 1);
      
      const response = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { 
          invoiceId: invoice.id,
          forceRegenerate: true  // Force regeneration even if PDF exists
        }
      });
      
      console.log("PDF generation response:", response);
      
      if (response.error) {
        throw new Error(`Failed to generate PDF: ${response.error.message}`);
      }
      
      if (response.data?.pdfUrl) {
        console.log('Received PDF URL from function:', response.data.pdfUrl);
        
        // Verify the generated PDF is accessible
        try {
          const pdfVerifyResponse = await fetch(response.data.pdfUrl, { method: 'HEAD' });
          console.log('Generated PDF verification response:', pdfVerifyResponse.status);
          
          if (!pdfVerifyResponse.ok) {
            throw new Error(`PDF URL returned status ${pdfVerifyResponse.status}`);
          }
          
          const contentType = pdfVerifyResponse.headers.get('content-type');
          if (!contentType?.includes('pdf')) {
            throw new Error(`Generated file is not a PDF (${contentType})`);
          }
        } catch (verifyErr) {
          console.error('Error verifying generated PDF:', verifyErr);
          // Continue anyway to try opening the PDF
        }
        
        // Attempt to open the PDF
        window.open(response.data.pdfUrl, '_blank');
        
        // Update the invoice object with the new PDF URL
        setInvoice(prev => prev ? { ...prev, pdfUrl: response.data.pdfUrl } : null);
        toast.success('Invoice downloaded successfully');
      } else {
        throw new Error('No PDF URL returned from the function');
      }
    } catch (err) {
      console.error('Error downloading invoice:', err);
      setDownloadError(err instanceof Error ? err.message : 'Unknown error');
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
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          
          <CardContent>
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
                <div>
                  <span className="font-medium">PDF URL:</span>{" "}
                  {invoice.pdfUrl ? (
                    <span className="text-green-600">Available</span>
                  ) : (
                    <span className="text-amber-600">Not yet generated</span>
                  )}
                </div>
              </div>
            )}
            
            {downloadError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error downloading PDF</AlertTitle>
                <AlertDescription>
                  {downloadError}
                  {downloadAttempts > 0 && (
                    <div className="mt-2 text-sm">
                      Attempts: {downloadAttempts}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
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
        
        {invoice?.pdfUrl && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Direct Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="break-all">
                <p className="text-sm text-muted-foreground mb-2">PDF URL:</p>
                <code className="text-xs bg-muted p-2 rounded block">{invoice.pdfUrl}</code>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="mr-2 h-4 w-4" />
                  Open PDF Directly
                </a>
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </PageTransition>
  );
};

export default InvoicePdfView;
