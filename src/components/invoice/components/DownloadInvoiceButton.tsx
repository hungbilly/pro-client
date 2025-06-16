
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { Invoice } from '@/types';
import { useInvoiceDownload } from '../hooks/useInvoiceDownload';

interface DownloadInvoiceButtonProps {
  invoice: Invoice;
}

export const DownloadInvoiceButton: React.FC<DownloadInvoiceButtonProps> = ({
  invoice
}) => {
  const { isDownloading, handleDownloadInvoice } = useInvoiceDownload();

  return (
    <Button
      onClick={() => handleDownloadInvoice(invoice)}
      className="w-full justify-start gap-3 h-12"
      variant="outline"
      disabled={isDownloading}
    >
      {isDownloading ? (
        <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
      ) : (
        <Download className="h-5 w-5 text-purple-600" />
      )}
      <div className="text-left">
        <div className="font-medium">
          {isDownloading ? 'Generating PDF...' : 'Download Invoice'}
        </div>
        <div className="text-sm text-muted-foreground">
          {isDownloading ? 'Please wait' : 'Download PDF file'}
        </div>
      </div>
    </Button>
  );
};
