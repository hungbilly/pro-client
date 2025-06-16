
import React from 'react';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { Client, Invoice } from '@/types';

interface EmailShareButtonProps {
  client: Client;
  invoice: Invoice;
  companyName: string;
  message: string;
}

export const EmailShareButton: React.FC<EmailShareButtonProps> = ({
  client,
  invoice,
  companyName,
  message
}) => {
  const handleEmailShare = () => {
    const subject = `Invoice #${invoice.number} from ${companyName}`;
    const encodedSubject = encodeURIComponent(subject);
    const encodedMessage = encodeURIComponent(message);
    const emailUrl = `mailto:${client.email}?subject=${encodedSubject}&body=${encodedMessage}`;
    window.open(emailUrl, '_blank');
  };

  if (!client.email) return null;

  return (
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
  );
};
