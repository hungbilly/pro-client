
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const WebhookSetupInstructions = () => {
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`;
  
  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  };

  return (
    <Card className="mt-6 border-amber-200 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <InfoIcon className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg">Webhook Setup Instructions</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        <p>
          To ensure subscription updates are automatic, set up a webhook in your Stripe dashboard:
        </p>
        <ol className="list-decimal list-inside space-y-2 pl-2">
          <li>Go to the Stripe Dashboard → Developers → Webhooks</li>
          <li>Click "Add endpoint"</li>
          <li>
            Set the endpoint URL to: 
            <div className="flex items-center gap-2 my-2">
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs break-all">{webhookUrl}</code>
              <Button variant="outline" size="sm" onClick={copyWebhookUrl}>Copy</Button>
            </div>
          </li>
          <li>Select these events to listen for:
            <ul className="list-disc list-inside pl-4 text-gray-600">
              <li>checkout.session.completed</li>
              <li>customer.subscription.created</li>
              <li>customer.subscription.updated</li>
              <li>customer.subscription.deleted</li>
              <li>invoice.paid</li>
              <li>invoice.payment_failed</li>
            </ul>
          </li>
          <li>After creation, copy the Webhook Secret</li>
          <li>Add the Webhook Secret to your Supabase Edge Function secrets with the name <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">STRIPE_WEBHOOK_SECRET</code></li>
        </ol>
        <div className="pt-2">
          <a 
            href="https://dashboard.stripe.com/webhooks" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-purple-600 hover:text-purple-800"
          >
            Open Stripe Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhookSetupInstructions;
