
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useParams } from 'react-router-dom';
import { getInvoiceByViewLink } from '@/lib/storage';
import { Invoice } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import PageTransition from '@/components/ui-custom/PageTransition';

const InvoicePdfView = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { viewLink } = useParams<{ viewLink: string }>();

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
        toast.success('Invoice Link Copied', {
          description: cleanUrl,  // Show the actual copied URL
          duration: 3000,  // Ensure toast stays visible longer
          className: 'copy-link-toast'  // Optional: for custom styling
        });
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

  // In a real implementation, you would fetch the invoice using the viewLink
  // For now, we'll just render a placeholder

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-4">Invoice PDF View</h1>
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
