
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Mail, Share2 } from 'lucide-react';
import { Invoice, Client } from '@/types';
import { formatCurrency } from '@/lib/utils';

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
  const generateMessage = () => {
    const invoiceLink = `${window.location.origin}/invoice/${invoice.viewLink}`;
    const formattedAmount = formatCurrency(invoice.amount, currency);
    const dueDate = new Date(invoice.dueDate).toLocaleDateString();
    
    return `Hi ${client.name},

Your invoice #${invoice.number} from ${companyName} is ready for review.

Amount: ${formattedAmount}
Due Date: ${dueDate}

Please view and accept your invoice here: ${invoiceLink}

Thank you!`;
  };

  const handleWhatsAppShare = () => {
    const message = generateMessage();
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${client.phone?.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleLineShare = () => {
    const message = generateMessage();
    const encodedMessage = encodeURIComponent(message);
    const lineUrl = `https://line.me/R/msg/text/?${encodedMessage}`;
    window.open(lineUrl, '_blank');
  };

  const handleEmailShare = () => {
    const message = generateMessage();
    const subject = `Invoice #${invoice.number} from ${companyName}`;
    const encodedSubject = encodeURIComponent(subject);
    const encodedMessage = encodeURIComponent(message);
    const emailUrl = `mailto:${client.email}?subject=${encodedSubject}&body=${encodedMessage}`;
    window.open(emailUrl, '_blank');
  };

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
          {client.phone && (
            <Button
              onClick={handleWhatsAppShare}
              className="w-full justify-start gap-3 h-12"
              variant="outline"
            >
              <MessageCircle className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <div className="font-medium">Share via WhatsApp</div>
                <div className="text-sm text-muted-foreground">{client.phone}</div>
              </div>
            </Button>
          )}
          
          <Button
            onClick={handleLineShare}
            className="w-full justify-start gap-3 h-12"
            variant="outline"
          >
            <MessageCircle className="h-5 w-5 text-green-500" />
            <div className="text-left">
              <div className="font-medium">Share via LINE</div>
              <div className="text-sm text-muted-foreground">Open LINE app</div>
            </div>
          </Button>
          
          {client.email && (
            <Button
              onClick={handleEmailShare}
              className="w-full justify-start gap-3 h-12"
              variant="outline"
            >
              <Mail className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <div className="font-medium">Share via Email</div>
                <div className="text-sm text-muted-foreground">{client.email}</div>
              </div>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceShareDialog;
