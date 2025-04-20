
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, LinkIcon, Bug } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface InvoiceFooterActionsProps {
  invoiceId: string;
  invoiceNumber: string;
  viewLink: string;
  pdfUrl?: string;
  isClientView: boolean;
  isAdmin: boolean;
  onPdfGenerated?: (url: string) => void;
}

const InvoiceFooterActions: React.FC<InvoiceFooterActionsProps> = ({
  invoiceId,
  invoiceNumber,
  viewLink,
  pdfUrl,
  isClientView,
  isAdmin,
  onPdfGenerated
}) => {
  const handleCopyInvoiceLink = () => {
    const baseUrl = window.location.origin;
    
    let cleanViewLink = viewLink;
    if (cleanViewLink.includes('http') || cleanViewLink.includes('/invoice/')) {
      const parts = cleanViewLink.split('/');
      cleanViewLink = parts[parts.length - 1];
    }
    
    const cleanUrl = `${baseUrl}/invoice/${cleanViewLink}`;
    
    console.log('Copying invoice link:', cleanUrl);
    
    navigator.clipboard.writeText(cleanUrl)
      .then(() => {
        toast.success('Invoice link copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy invoice link:', err);
        toast.error('Failed to copy link to clipboard');
      });
  };

  const handleDownloadInvoice = async () => {
    if (pdfUrl) {
      try {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.setAttribute('download', `Invoice-${invoiceNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Invoice downloaded successfully');
      } catch (err) {
        console.error('Error during download:', err);
        toast.error('Failed to download invoice');
      }
      return;
    }
    
    try {
      toast.info('Preparing PDF for download...');
      
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId }
      });
      
      if (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate invoice PDF');
        return;
      }
      
      if (data?.pdfUrl) {
        if (onPdfGenerated) {
          onPdfGenerated(data.pdfUrl);
        }
        
        const link = document.createElement('a');
        link.href = data.pdfUrl;
        link.setAttribute('download', `Invoice-${invoiceNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Invoice downloaded successfully');
      }
    } catch (err) {
      console.error('Error downloading invoice:', err);
      toast.error('Failed to download invoice');
    }
  };

  const handleDebugPdf = async () => {
    try {
      toast.info('Generating simplified debug PDF with only company info...');
      
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { 
          invoiceId, 
          debugMode: true 
        }
      });
      
      if (error) {
        console.error('Error generating debug PDF:', error);
        toast.error('Failed to generate debug PDF');
        return;
      }
      
      if (data?.pdfUrl) {
        const debugPdfUrl = data.pdfUrl;
        
        const link = document.createElement('a');
        link.href = debugPdfUrl;
        link.setAttribute('download', `Invoice-${invoiceNumber}-debug.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Debug PDF downloaded successfully');
      }
    } catch (err) {
      console.error('Error generating debug PDF:', err);
      toast.error('Failed to generate debug PDF');
    }
  };

  return (
    <div className="justify-end gap-2 flex-wrap pt-4 border-t flex">
      <Button
        variant="outline"
        onClick={handleCopyInvoiceLink}
      >
        <LinkIcon className="h-4 w-4 mr-2" />
        Copy Invoice Link
      </Button>
      <Button
        variant="default"
        onClick={handleDownloadInvoice}
      >
        <Download className="h-4 w-4 mr-2" />
        Download Invoice
      </Button>
      {!isClientView && isAdmin && (
        <Button
          variant="outline"
          onClick={handleDebugPdf}
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug PDF
        </Button>
      )}
    </div>
  );
};

export default InvoiceFooterActions;
