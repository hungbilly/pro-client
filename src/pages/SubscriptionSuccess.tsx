
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Database, RefreshCw, ShieldAlert, InfoIcon } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkSubscription } = useSubscription();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationSuccessful, setVerificationSuccessful] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [dbSubscriptionData, setDbSubscriptionData] = useState<any>(null);
  const [webhookMissing, setWebhookMissing] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    const verifySubscription = async () => {
      try {
        if (!sessionId) {
          toast.error('No session ID found');
          return;
        }
        
        await checkSubscription();
        await fetchSubscriptionData();
        setVerificationSuccessful(true);
        toast.success('Subscription activated successfully!');
      } catch (error) {
        console.error('Error verifying subscription:', error);
        toast.error('There was a problem verifying your subscription');
      } finally {
        setIsVerifying(false);
      }
    };

    verifySubscription();
  }, [checkSubscription, searchParams]);

  const fetchSubscriptionData = async () => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .limit(1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setDbSubscriptionData(data[0]);
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
    }
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      // Call the check-subscription function to force a sync
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      await fetchSubscriptionData();
      toast.success('Subscription data synchronized successfully');
    } catch (error) {
      console.error('Error syncing subscription data:', error);
      toast.error('Failed to sync subscription data');
    } finally {
      setIsManualSyncing(false);
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card className="text-center border-green-200 shadow-lg">
            <CardHeader>
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              </div>
              <CardTitle className="text-2xl">Subscription Successful!</CardTitle>
            </CardHeader>
            <CardContent>
              {isVerifying ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                  </div>
                  <p>Verifying your subscription...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verificationSuccessful ? (
                    <>
                      <p>
                        Thank you for subscribing to our service. Your account has been activated with full access to all premium features.
                      </p>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-700">
                          You can now enjoy all the premium features of our platform.
                        </p>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="h-4 w-4 text-blue-600" />
                          <h3 className="font-medium text-blue-700">Database Status</h3>
                        </div>
                        {dbSubscriptionData ? (
                          <div className="text-sm text-blue-700 text-left">
                            <p><strong>Status:</strong> {dbSubscriptionData.status}</p>
                            <p><strong>ID:</strong> {dbSubscriptionData.stripe_subscription_id?.substring(0, 12)}...</p>
                            <p><strong>Created:</strong> {new Date(dbSubscriptionData.created_at).toLocaleString()}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-blue-700">
                            No subscription record found in database yet. Click "Sync Data" below.
                          </p>
                        )}
                      </div>

                      {webhookMissing && (
                        <Alert variant="warning" className="mt-4 bg-amber-50 border-amber-200">
                          <ShieldAlert className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-amber-800">Webhook not configured</AlertTitle>
                          <AlertDescription className="text-amber-700 text-sm">
                            Stripe webhook is not configured. Subscription status may not update automatically. Please set up a webhook in your Stripe dashboard pointing to your app's webhook endpoint.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  ) : (
                    <>
                      <p>
                        Your payment was processed, but we're having trouble confirming your subscription status.
                      </p>
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-sm text-yellow-700">
                          Please use the "Sync Data" button below to manually synchronize your subscription or contact support if the issue persists.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate('/')}>
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/subscription')}>
                View Subscription
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={handleManualSync}
                disabled={isManualSyncing}
              >
                <RefreshCw className={`h-4 w-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
                {isManualSyncing ? 'Syncing...' : 'Sync Data'}
              </Button>
            </CardFooter>
          </Card>

          <Card className="mt-6 border-amber-200 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <InfoIcon className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg">Webhook Setup Instructions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-left space-y-3">
              <p>
                To ensure subscription updates are automatic, please set up a webhook in your Stripe dashboard:
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-2">
                <li>Go to the Stripe Dashboard → Developers → Webhooks</li>
                <li>Click "Add endpoint"</li>
                <li>Set the endpoint URL to: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">[YOUR_DOMAIN]/functions/stripe-webhook</code></li>
                <li>Select events to listen for:
                  <ul className="list-disc list-inside pl-4 text-gray-600">
                    <li>customer.subscription.created</li>
                    <li>customer.subscription.updated</li>
                    <li>customer.subscription.deleted</li>
                    <li>invoice.paid</li>
                  </ul>
                </li>
                <li>Add the Webhook Secret to your Supabase Edge Function secrets with the name <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">STRIPE_WEBHOOK_SECRET</code></li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default SubscriptionSuccess;
