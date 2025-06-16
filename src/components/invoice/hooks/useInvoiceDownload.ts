
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { Invoice } from '@/types';

export const useInvoiceDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      setIsDownloading(true);
      toast.info('Preparing PDF for download...');
      
      // If we already have a PDF URL, use it directly
      if (invoice.pdfUrl) {
        window.open(invoice.pdfUrl, '_blank');
        toast.success('Invoice downloaded successfully');
        return;
      }
      
      // Generate a new PDF
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { 
          invoiceId: invoice.id,
          forceRegenerate: true // Force regeneration to ensure we get a fresh PDF
        }
      });
      
      if (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate invoice PDF');
        return;
      }
      
      if (data?.pdfUrl) {
        // Open the PDF in a new tab
        window.open(data.pdfUrl, '_blank');
        toast.success('Invoice downloaded successfully');
      } else {
        throw new Error('No PDF URL returned');
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

  return {
    isDownloading,
    handleDownloadInvoice
  };
};
