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
import PdfDebugger from '@/components/ui-custom/PdfDebugger';

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

  const validatePdfUrl = async (url: string): Promise<{isValid: boolean, contentType?: string, contentLength?: string, error?: string}> => {
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
        return {
          isValid: false, 
          error: `HTTP error ${response.status}: ${response.statusText}`
        };
      }
      
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      // Check if it's actually a PDF
      if (!contentType?.includes('pdf')) {
        return {
          isValid: false,
          contentType,
          contentLength,
          error: `URL does not point to a PDF: ${contentType}`
        };
      }
      
      // Check if content type contains multiple types (suspicious)
      if (contentType.includes(',')) {
        return {
          isValid: false,
          contentType,
          contentLength,
          error: `Suspicious content type: ${contentType}`
        };
      }
      
      // Check if it has content
      const size = parseInt(contentLength || '0', 10);
      if (size < 1000) { // PDFs should be larger than 1KB
        return {
          isValid: false,
          contentType,
          contentLength,
          error: `PDF appears to be too small: ${size} bytes`
        };
      }
      
      // Check if it's suspiciously large (> 5MB)
      if (size > 5000000) {
        return {
          isValid: false,
          contentType,
          contentLength,
          error: `PDF is suspiciously large: ${(size / 1024 / 1024).toFixed(2)} MB`
        };
      }
      
      return {
        isValid: true,
        contentType,
        contentLength
      };
    } catch (err) {
      console.error('Error validating PDF URL:', err);
      return {
        isValid: false,
        error: err instanceof Error ? err.message : 'Unknown error validating PDF'
      };
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
          
          const validation = await validatePdfUrl(invoice.pdfUrl);
          
          if (validation.isValid) {
            console.log('Using existing valid PDF URL');
            window.open(invoice.pdfUrl, '_blank');
            setIsDownloading(false);
            return;
          } else {
            console.warn('Existing PDF validation failed:', validation.error);
            // Add validation info to debug info
            setDebugInfo(prev => ({
              ...(prev || {}),
              existingPdfValidation: validation
            }));
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
      
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { 
          invoiceId: invoice.id,
          forceRegenerate: true,  // Force regeneration even if PDF exists
          debugMode: true, // Always enable debug mode for better troubleshooting
          clientInfo: {
            userAgent: navigator.userAgent,
            timestamp: timestamp
          }
        }
      });
      
      console.log("PDF generation response:", data);
      
      if (error) {
        throw new Error(`Failed to generate PDF: ${error.message}`);
      }
      
      // Save debug info if available
      if (data?.debugInfo) {
        setDebugInfo(data.debugInfo);
      }
      
      if (!data?.pdfUrl) {
        throw new Error('No PDF URL returned from generation service');
      }
      
      // Validate the generated PDF URL
      const validation = await validatePdfUrl(data.pdfUrl);
      console.log('New PDF validation result:', validation);
      
      if (!validation.isValid) {
        throw new Error(`Generated PDF validation failed: ${validation.error}`);
      }
      
      // Update the invoice with the new PDF URL
      setInvoice(prev => prev ? { ...prev, pdfUrl: data.pdfUrl } : null);
      
      // Open the PDF in a new tab
      window.open(data.pdfUrl, '_blank');
      
      // Show success message
      toast.success('Invoice downloaded successfully');
    } catch (err) {
      console.error('Error downloading invoice:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setDownloadError(errorMessage);
      
      toast.error('Failed to download invoice', {
        description: errorMessage
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading invoice...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error || !invoice) {
    return (
      <PageTransition>
        <div className="container mx-auto py-8 px-4">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-red-500 flex items-center gap-2">
                <AlertTriangle size={20} />
                Error Loading Invoice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{error || "Invoice not found"}</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => navigate('/')}>
                Return to Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice PDF View
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-xl font-medium flex items-center gap-2">
                Invoice #{invoice.number}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Download or view this invoice as a PDF
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'accepted' ? 'default' : 'outline'}>
                {invoice.status.toUpperCase()}
              </Badge>
              
              <Badge variant="outline">
                {new Date(invoice.date).toLocaleDateString()}
              </Badge>
            </div>
            
            {downloadError && (
              <Alert variant="destructive">
                <AlertTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Error generating PDF
                </AlertTitle>
                <AlertDescription className="text-sm">
                  {downloadError}
                  {downloadAttempts > 0 && (
                    <p className="mt-2">
                      Attempts: {downloadAttempts}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="pt-2">
              <Button 
                onClick={handleDownloadInvoice} 
                className="w-full mb-2"
                disabled={isDownloading}
              >
                {isDownloading 
                  ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating PDF...</>
                  : <><Download className="h-4 w-4 mr-2" /> Download Invoice</>
                }
              </Button>
              
              <Button 
                onClick={handleCopyInvoiceLink}
                variant="outline" 
                className="w-full"
              >
                Copy Invoice Link
              </Button>
            </div>
            
            {debugInfo && (
              <div className="mt-6">
                <Separator className="my-4" />
                <h3 className="text-sm font-medium mb-2">Debug Information</h3>
                <PdfDebugger debugInfo={debugInfo} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default InvoicePdfView;
