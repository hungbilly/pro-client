
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface LineShareButtonProps {
  message: string;
}

export const LineShareButton: React.FC<LineShareButtonProps> = ({ message }) => {
  const handleLineShare = () => {
    const encodedMessage = encodeURIComponent(message);
    const lineUrl = `https://line.me/R/msg/text/?${encodedMessage}`;
    window.open(lineUrl, '_blank');
  };

  return (
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
  );
};
