
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { Client } from '@/types';

interface WhatsAppShareButtonProps {
  client: Client;
  message: string;
}

export const WhatsAppShareButton: React.FC<WhatsAppShareButtonProps> = ({
  client,
  message
}) => {
  const handleWhatsAppShare = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${client.phone?.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!client.phone) return null;

  return (
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
  );
};
