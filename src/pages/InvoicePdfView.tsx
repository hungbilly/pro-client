
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoiceByViewLink } from '@/lib/storage';
import { Invoice } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import PageTransition from '@/components/ui-custom/PageTransition';
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const InvoicePdfView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadAttempts, setDownloadAttempts] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { viewLink } = useParams<{ viewLink: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!viewLink) return;
      
      try {
        const invoiceData = await getInvoiceByViewLink(viewLink);
        setInvoice(invoiceData);
        console.log('Fetched invoice data:', invoiceData);
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

  const validatePdfUrl = async (url: string): Promise<boolean> => {
    try {
      console.log('Validating PDF URL:', url);
      // Try to fetch the PDF with a HEAD request
      const response = await fetch(url, { method: 'HEAD' });
      
      console.log('PDF validation response:', {
        status: response.status, 
        ok: response.ok,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
      
      if (!response.ok) {
        console.error(`PDF URL validation failed: ${response.status} ${response.statusText}`);
        return false;
      }
      
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      // Check if it's actually a PDF
      if (!contentType?.includes('pdf')) {
        console.error(`URL does not point to a PDF: ${contentType}`);
        return false;
      }
      
      // Check if it has content
      const size = parseInt(contentLength || '0', 10);
      if (size < 1000) { // PDFs should be larger than 1KB
        console.error(`PDF appears to be too small: ${size} bytes`);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error validating PDF URL:', err);
      return false;
    }
  };

  const handleDownloadInvoice = async () => {
    if (!invoice) return;
    
    setIsDownloading(true);
    setDownloadError(null);
    setDebugInfo(null);
    toast.info('Preparing PDF for download...');
    
    try {
      // If we already have a PDF URL, verify it works before using it
      if (invoice.pdfUrl) {
        try {
          console.log('Attempting to verify existing PDF from URL:', invoice.pdfUrl);
          
          const isValid = await validatePdfUrl(invoice.pdfUrl);
          
          if (isValid) {
            console.log('Using existing valid PDF URL');
            window.open(invoice.pdfUrl, '_blank');
            setIsDownloading(false);
            return;
          } else {
            console.warn('Existing PDF appears invalid, regenerating...');
          }
        } catch (e) {
          console.error('Error verifying existing PDF:', e);
          // Continue with regeneration
        }
      }
      
      // Otherwise, generate a new PDF
      console.log('Generating new PDF via edge function');
      setDownloadAttempts(prev => prev + 1);
      
      // Add a timestamp to prevent caching issues
      const timestamp = new Date().getTime();
      
      const response = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { 
          invoiceId: invoice.id,
          forceRegenerate: true,  // Force regeneration even if PDF exists
          debugMode: downloadAttempts > 1, // Enable debug mode after first attempt
          clientInfo: {
            userAgent: navigator.userAgent,
            timestamp: timestamp
          }
        }
      });
      
      console.log("PDF generation response:", response);
      
      if (response.error) {
        throw new Error(`Failed to generate PDF: ${response.error.message}`);
      }
      
      // Save debug info if available
      if (response.data?.debugInfo) {
        setDebugInfo(response.data.debugInfo);
      }
      
      if (response.data?.pdfUrl) {
        console.log('Received PDF URL from function:', response.data.pdfUrl);
        
        // Verify the generated PDF is accessible
        const pdfUrl = `${response.data.pdfUrl}?t=${timestamp}`;
        const isValid = await validatePdfUrl(pdfUrl);
        
        if (!isValid) {
          throw new Error('Generated PDF appears invalid or inaccessible');
        }
        
        // Attempt to open the PDF
        window.open(pdfUrl, '_blank');
        
        // Update the invoice object with the new PDF URL
        setInvoice(prev => prev ? { ...prev, pdfUrl } : null);
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

  // Function to refresh the invoice data
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    setDownloadError(null);
    setDebugInfo(null);
    
    try {
      if (!viewLink) {
        setError("Missing view link parameter");
        return;
      }
      
      const invoiceData = await getInvoiceByViewLink(viewLink);
      setInvoice(invoiceData);
      console.log('Refreshed invoice data:', invoiceData);
      toast.success('Invoice data refreshed');
    } catch (err) {
      console.error("Error refreshing invoice data:", err);
      setError("Could not refresh invoice data. Please try again.");
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
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
                <Button onClick={() => navigate('/')} className="mt-4">
                  Return to Dashboard
                </Button>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Invoice Details</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          
          <CardContent>
            {invoice && (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Invoice Number:</span> {invoice.number}
                    </div>
                    <div>
                      <span className="font-medium">Client ID:</span> {invoice.clientId}
                    </div>
                    <div>
                      <span className="font-medium">Amount:</span> ${invoice.amount?.toFixed(2)}
                    </div>
                  </div>
                  <Badge variant={invoice.status === "draft" ? "outline" : invoice.status === "paid" ? "success" : "secondary"}>
                    {invoice.status}
                  </Badge>
                </div>
                
                <div>
                  <span className="font-medium">PDF Status:</span>{" "}
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

            {debugInfo && (
              <div className="mt-4 border rounded p-4 bg-slate-50">
                <h3 className="font-medium mb-2">Debug Information</h3>
                <pre className="text-xs overflow-auto max-h-[200px] p-2 bg-slate-100 rounded">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="border-t p-6 flex flex-wrap justify-end gap-2">
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
            <CardFooter className="flex flex-col space-y-2">
              <Button variant="outline" asChild className="w-full">
                <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="mr-2 h-4 w-4" />
                  Open PDF Directly
                </a>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  if (invoice.pdfUrl) {
                    validatePdfUrl(invoice.pdfUrl).then(isValid => {
                      toast[isValid ? 'success' : 'error'](
                        isValid ? 'PDF URL is valid' : 'PDF URL is invalid'
                      );
                    });
                  }
                }}
              >
                Verify PDF URL
              </Button>
            </CardFooter>
          </Card>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>
    </PageTransition>
  );
};

export default InvoicePdfView;
