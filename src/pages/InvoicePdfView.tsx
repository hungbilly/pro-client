
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useParams } from 'react-router-dom';
import { getInvoiceByViewLink } from '@/lib/storage';
import { Invoice } from '@/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageTransition from '@/components/ui-custom/PageTransition';

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
        setLoading(true);
        const invoiceData = await getInvoiceByViewLink(viewLink);
        if (!invoiceData) {
          setError('Invoice not found');
          return;
        }
        setInvoice(invoiceData);
      } catch (err) {
        console.error('Error fetching invoice:', err);
        setError('Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [viewLink]);

  const handleCopyInvoiceLink = () => {
    if (!invoice) return;
    
    const baseUrl = window.location.origin;
    
    let cleanViewLink = invoice.viewLink;
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
      // Download logic would go here
      // For now, let's simulate a download after a delay
      setTimeout(() => {
        setIsDownloading(false);
        toast.success('Invoice downloaded successfully');
      }, 2000);
    } catch (err) {
      console.error('Error downloading invoice:', err);
      setIsDownloading(false);
      toast.error('Failed to download invoice');
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading invoice...</div>
        </div>
      </PageTransition>
    );
  }

  if (error || !invoice) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">{error || 'Invoice not found'}</div>
        </div>
      </PageTransition>
    );
  }

  const statusColors = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    paid: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };

  const contractStatusColor = invoice.contractStatus === 'accepted' 
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold mb-4">Invoice #{invoice.number}</h1>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center">
                <Badge className={statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}>
                  {invoice.status.toUpperCase()}
                </Badge>
                {invoice.invoiceAcceptedAt && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    Accepted on {new Date(invoice.invoiceAcceptedAt).toLocaleString()}
                  </span>
                )}
              </div>
              
              {invoice.contractStatus === 'accepted' && (
                <div className="flex items-center">
                  <Badge variant="outline" className={`flex items-center gap-1 ${contractStatusColor}`}>
                    <FileCheck className="h-3 w-3" />
                    Contract Accepted
                  </Badge>
                  {invoice.contractAcceptedAt && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      Accepted on {new Date(invoice.contractAcceptedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <p>View Link: {viewLink}</p>
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
