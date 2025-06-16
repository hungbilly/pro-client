
import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Invoice } from '@/types';

interface CopyLinkButtonProps {
  invoice: Invoice;
}

export const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({ invoice }) => {
  const handleCopyInvoiceLink = () => {
    const baseUrl = window.location.origin;
    
    let cleanViewLink = invoice.viewLink;
    if (cleanViewLink.includes('http') || cleanViewLink.includes('/invoice/')) {
      const parts = cleanViewLink.split('/');
      cleanViewLink = parts[parts.length - 1];
    }
    
    const cleanUrl = `${baseUrl}/invoice/${cleanViewLink}`;
    
    navigator.clipboard.writeText(cleanUrl)
      .then(() => {
        toast.success('Invoice link copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy invoice link:', err);
        toast.error('Failed to copy link to clipboard');
      });
  };

  return (
    <Button
      onClick={handleCopyInvoiceLink}
      className="w-full justify-start gap-3 h-12"
      variant="outline"
    >
      <Copy className="h-5 w-5 text-gray-600" />
      <div className="text-left">
        <div className="font-medium">Copy Invoice Link</div>
        <div className="text-sm text-muted-foreground">Copy link to clipboard</div>
      </div>
    </Button>
  );
};
