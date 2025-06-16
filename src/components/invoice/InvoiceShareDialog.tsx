
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Share2 } from 'lucide-react';
import { Invoice, Client } from '@/types';
import { generateShareMessage } from './utils/messageGenerator';
import { WhatsAppShareButton } from './components/WhatsAppShareButton';
import { LineShareButton } from './components/LineShareButton';
import { EmailShareButton } from './components/EmailShareButton';
import { DownloadInvoiceButton } from './components/DownloadInvoiceButton';
import { CopyLinkButton } from './components/CopyLinkButton';

interface InvoiceShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  client: Client;
  companyName: string;
  currency: string;
}

const InvoiceShareDialog: React.FC<InvoiceShareDialogProps> = ({
  open,
  onOpenChange,
  invoice,
  client,
  companyName,
  currency
}) => {
  const message = generateShareMessage(invoice, client, companyName, currency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Invoice
          </DialogTitle>
          <DialogDescription>
            Choose how you'd like to share invoice #{invoice.number} with {client.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          <WhatsAppShareButton client={client} message={message} />
          <LineShareButton message={message} />
          <EmailShareButton 
            client={client} 
            invoice={invoice} 
            companyName={companyName} 
            message={message} 
          />
          <DownloadInvoiceButton invoice={invoice} />
          <CopyLinkButton invoice={invoice} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceShareDialog;
