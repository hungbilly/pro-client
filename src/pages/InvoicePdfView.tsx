import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, AlertTriangle, FileText, RefreshCw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoiceByViewLink, getInvoice, getClient, getJob } from '@/lib/storage';
import { Invoice, Client, Job } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import PageTransition from '@/components/ui-custom/PageTransition';
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import PdfDebugger from '@/components/ui-custom/PdfDebugger';
import { generateInvoicePdf, uploadInvoicePdf } from '@/utils/pdfGenerator';
import { useCompanyContext } from '@/context/CompanyContext';

const InvoicePdfView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadAttempts, setDownloadAttempts] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [clientViewCompany, setClientViewCompany] = useState<any>(null);
  const { viewLink } = useParams<{ viewLink: string }>();
  const navigate = useNavigate();
  const { selectedCompany } = useCompanyContext();

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!viewLink) return;
      
      try {
        const invoiceData = await getInvoiceByViewLink(viewLink);
        setInvoice(invoiceData);
        console.log('Fetched invoice data:', invoiceData);
        
        if (invoiceData) {
          // Fetch client data
          if (invoiceData.clientId) {
            const clientData = await getClient(invoiceData.clientId);
            setClient(clientData);
          }
          
          // Fetch job data if exists
          if (invoiceData.jobId) {
            const jobData = await getJob(invoiceData.jobId);
            setJob(jobData);
          }
          
          // Fetch company client view data if exists
          if (invoiceData.companyId) {
            try {
              const { data: companyData, error: companyError } = await supabase
                .from('company_clientview')
                .select('*')
                .eq('company_id', invoiceData.companyId)
                .single();
              
              if (!companyError && companyData) {
                console.log('Fetched client view company data:', companyData);
                setClientViewCompany(companyData);
              } else {
                console.error('Error fetching company client view:', companyError);
              }
            } catch (err) {
              console.error('Failed to fetch company data:', err);
            }
          }
        }
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
    if (!invoice || !client) return;
    
    setIsDownloading(true);
    setDownloadError(null);
    setDebugInfo(null);
    toast.info('Preparing PDF for download...');
    
    try {
      // Check if we already have a valid PDF URL
      if (invoice.pdfUrl) {
        const validation = await validatePdfUrl(invoice.pdfUrl);
        
        if (validation.isValid) {
          window.open(invoice.pdfUrl, '_blank');
          toast.success('Invoice downloaded successfully');
          setIsDownloading(false);
          return;
        }
        
        console.log('Existing PDF URL is invalid, generating new one:', validation);
      }
      
      setDownloadAttempts(prev => prev + 1);
      
      // Generate PDF on client side
      const company = selectedCompany || clientViewCompany?.company;
      
      // Enhanced debug info
      const debugData = {
        invoiceId: invoice.id,
        companyId: invoice.companyId,
        companyName: company?.name || clientViewCompany?.name,
        hasPaymentMethods: !!clientViewCompany?.payment_methods,
        paymentMethodsText: clientViewCompany?.payment_methods ? 
          (clientViewCompany.payment_methods.substring(0, 50) + '...') : 'None',
        paymentMethodsLength: clientViewCompany?.payment_methods?.length || 0,
        clientInfo: {
          userAgent: navigator.userAgent,
          timestamp: new Date().getTime()
        }
      };
      
      setDebugInfo(debugData);
      
      console.log('Generating PDF with data:', { 
        invoice, 
        client,
        job,
        company,
        clientViewCompany,
        paymentMethods: clientViewCompany?.payment_methods || 'None provided'
      });
      
      // Generate the PDF
      const pdfBlob = await generateInvoicePdf(
        invoice, 
        client, 
        job, 
        company, 
        clientViewCompany
      );
      
      // Try to upload the PDF to Supabase (but continue even if it fails)
      try {
        const pdfUrl = await uploadInvoicePdf(
          invoice.id,
          pdfBlob,
          invoice.number,
          supabase
        );
        
        // Update the invoice with the new PDF URL if upload was successful
        if (pdfUrl) {
          setInvoice(prev => prev ? { ...prev, pdfUrl } : null);
        }
      } catch (uploadError) {
        // Log the upload error but continue with direct download
        console.error('Failed to upload PDF to storage:', uploadError);
        // We don't set downloadError here as the PDF generation succeeded
      }
      
      // Create an object URL for direct download regardless of storage success
      const pdfObjectUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfObjectUrl, '_blank');
      
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

  const handleDebugPdf = async () => {
    if (!invoice || !client) return;
    
    try {
      toast.info('Generating simplified debug PDF with only company info...');
      
      const company = selectedCompany || clientViewCompany?.company;
      
      // Log detailed debug info about payment methods
      console.log('[Debug PDF] Payment methods info:', {
        hasClientViewCompany: !!clientViewCompany,
        paymentMethodsExists: !!clientViewCompany?.payment_methods,
        paymentMethodsLength: clientViewCompany?.payment_methods?.length || 0,
        paymentMethodsPreview: clientViewCompany?.payment_methods 
          ? clientViewCompany.payment_methods.substring(0, 100) + '...' 
          : 'None'
      });
      
      // Generate debug PDF
      const pdfBlob = await generateInvoicePdf(
        invoice, 
        client, 
        job, 
        company,
        clientViewCompany,
        true // Debug mode
      );
      
      // Create an object URL for the blob
      const pdfObjectUrl = URL.createObjectURL(pdfBlob);
      
      // Open the PDF in a new tab
      window.open(pdfObjectUrl, '_blank');
      
      toast.success('Debug PDF generated successfully');
    } catch (err) {
      console.error('Error generating debug PDF:', err);
      toast.error('Failed to generate debug PDF');
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
                Invoice #{invoice?.number}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Download or view this invoice as a PDF
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={invoice?.status === 'paid' ? 'success' : invoice?.status === 'accepted' ? 'default' : 'outline'}>
                {invoice?.status?.toUpperCase()}
              </Badge>
              
              <Badge variant="outline">
                {invoice?.date ? new Date(invoice.date).toLocaleDateString() : '--'}
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
                className="w-full mb-2"
              >
                Copy Invoice Link
              </Button>
              
              <Button
                onClick={handleDebugPdf}
                variant="outline"
                className="w-full"
              >
                <Bug className="h-4 w-4 mr-2" /> Debug PDF
              </Button>
            </div>
            
            {clientViewCompany && (
              <div>
                <Separator className="my-4" />
                <h3 className="text-sm font-medium mb-2">Payment Methods Status</h3>
                <div className="text-sm bg-muted p-3 rounded-md">
                  <p><strong>Has payment methods:</strong> {clientViewCompany.payment_methods ? 'Yes' : 'No'}</p>
                  {clientViewCompany.payment_methods && (
                    <p><strong>Length:</strong> {clientViewCompany.payment_methods.length} characters</p>
                  )}
                </div>
              </div>
            )}
            
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
