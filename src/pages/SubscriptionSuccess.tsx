import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Database, RefreshCw, ShieldAlert, InfoIcon, CheckIcon } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import WebhookSetupInstructions from '@/components/WebhookSetupInstructions';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkSubscription } = useSubscription();
  const { user, isAdmin } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationSuccessful, setVerificationSuccessful] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [dbSubscriptionData, setDbSubscriptionData] = useState<any>(null);
  const [webhookMissing, setWebhookMissing] = useState(true);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    const verifySubscription = async () => {
      try {
        if (!sessionId) {
          console.warn("SubscriptionSuccess: No session_id found in URL. Proceeding with general subscription check.");
        }
        
        await checkSubscription();
        await fetchSubscriptionData();
        setVerificationSuccessful(true);
        toast({
          variant: "default",
          title: "Success",
          description: "Subscription activated successfully!"
        });
      } catch (error) {
        console.error('Error verifying subscription:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "There was a problem verifying your subscription"
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifySubscription();
  }, [checkSubscription, searchParams, user]);

  const fetchSubscriptionData = async () => {
    if (!user) return;
    
    try {
      // Filter by user ID to get only the current user's subscription
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setDbSubscriptionData(data[0]);
        setVerificationSuccessful(true);
        if (isAdmin) {
          await checkWebhookStatus();
        }
      } else {
        console.log('No subscription data found for user', user.id);
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
    }
  };

  const checkWebhookStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`, {
        method: 'OPTIONS',
      });
      
      setWebhookMissing(!response.ok);
      return response.ok;
    } catch (error) {
      console.error('Error checking webhook status:', error);
      setWebhookMissing(true);
      return false;
    }
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      await fetchSubscriptionData();
      toast({
        variant: "default",
        title: "Success",
        description: "Subscription data synchronized successfully"
      });
    } catch (error) {
      console.error('Error syncing subscription data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sync subscription data"
      });
    } finally {
      setIsManualSyncing(false);
    }
  };

  const testWebhook = async () => {
    setIsTestingWebhook(true);
    try {
      const isReachable = await checkWebhookStatus();
      if (isReachable) {
        toast({
          variant: "default",
          title: "Success",
          description: "Webhook endpoint is reachable"
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Webhook endpoint is not reachable"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to test webhook"
      });
    } finally {
      setIsTestingWebhook(false);
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
                      
                      {dbSubscriptionData && (
                        <div className="bg-blue-50 p-4 rounded-lg mt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Database className="h-4 w-4 text-blue-600" />
                            <h3 className="font-medium text-blue-700">Subscription Status</h3>
                          </div>
                          <div className="text-sm text-blue-700 text-left">
                            <p><strong>Status:</strong> {dbSubscriptionData.status}</p>
                            {dbSubscriptionData.stripe_subscription_id && (
                              <p><strong>ID:</strong> {dbSubscriptionData.stripe_subscription_id?.substring(0, 12)}...</p>
                            )}
                            <p><strong>Created:</strong> {new Date(dbSubscriptionData.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      )}

                      {isAdmin && webhookMissing && (
                        <Alert variant="warning" className="mt-4 bg-amber-50 border-amber-200">
                          <ShieldAlert className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-amber-800">Webhook not configured</AlertTitle>
                          <AlertDescription className="text-amber-700 text-sm">
                            Stripe webhook is not configured. Subscription status may not update automatically. Please set up a webhook in your Stripe dashboard pointing to your app's webhook endpoint.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {isAdmin && !webhookMissing && (
                        <Alert className="mt-4 bg-green-50 border-green-200">
                          <CheckIcon className="h-4 w-4 text-green-600" />
                          <AlertTitle className="text-green-800">Webhook configured</AlertTitle>
                          <AlertDescription className="text-green-700 text-sm">
                            Webhook endpoint is reachable. Subscription status should update automatically.
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
              
              {isAdmin && (
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={testWebhook}
                  disabled={isTestingWebhook}
                >
                  <ShieldAlert className="h-4 w-4" />
                  {isTestingWebhook ? 'Testing...' : 'Test Webhook'}
                </Button>
              )}
            </CardFooter>
          </Card>

          {isAdmin && <WebhookSetupInstructions />}
        </div>
      </div>
    </PageTransition>
  );
};

export default SubscriptionSuccess;
