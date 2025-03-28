
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/context/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PageTransition from '@/components/ui-custom/PageTransition';

const Subscription = () => {
  const { isLoading, hasAccess, isInTrialPeriod, trialDaysLeft, subscription, createSubscription, checkSubscription } = useSubscription();
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSubscribe = async () => {
    try {
      const url = await createSubscription();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to create subscription');
    }
  };

  const syncSubscriptionData = async () => {
    try {
      setIsSyncing(true);
      toast.info('Checking Stripe for subscription data...');
      
      // Call the edge function directly to check and sync subscription data
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error syncing subscription data:', error);
        toast.error('Failed to sync subscription data');
        return;
      }
      
      console.log('Subscription sync result:', data);
      
      if (data.subscription) {
        toast.success('Subscription data synced from Stripe');
      } else if (data.isInTrialPeriod) {
        toast.info(`You're in a free trial period (${data.trialDaysLeft} days left)`);
      } else {
        toast.info('No active subscription found in Stripe');
      }
      
      // Update local subscription state
      await checkSubscription();
      
    } catch (error) {
      console.error('Error syncing subscription data:', error);
      toast.error('Failed to sync subscription data');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto py-12 px-4">
        <div className="grid gap-8 max-w-4xl mx-auto">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl">Premium Subscription</CardTitle>
              <CardDescription>
                Unlock all features with our premium plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-6 rounded-lg">
                <h3 className="text-3xl font-bold mb-2">HK$50 <span className="text-sm font-normal text-muted-foreground">/month</span></h3>
                <p className="text-muted-foreground mb-4">Full access to all premium features</p>
                
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Advanced client management
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Unlimited invoices
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Contract management
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Premium reports and analytics
                  </li>
                </ul>
              </div>

              {isLoading ? (
                <div className="flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {hasAccess && (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md">
                      {subscription ? (
                        <p>You have an active subscription. Enjoy all premium features!</p>
                      ) : isInTrialPeriod ? (
                        <p>You are currently in your free trial period with {trialDaysLeft} days remaining.</p>
                      ) : (
                        <p>You have access to all premium features.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="flex flex-wrap gap-4 w-full">
                {!isLoading && !hasAccess && (
                  <Button
                    onClick={handleSubscribe}
                    className="w-full"
                    size="lg"
                  >
                    Subscribe Now
                  </Button>
                )}
                
                {isInTrialPeriod && (
                  <Button
                    onClick={handleSubscribe}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    Upgrade to Premium
                  </Button>
                )}
                
                {hasAccess && subscription && (
                  <Button
                    variant="outline"
                    className="w-full"
                    size="lg"
                    onClick={() => window.open('https://billing.stripe.com/p/login/28o5kM8Xq2s14AE288', '_blank')}
                  >
                    Manage Subscription
                  </Button>
                )}
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={syncSubscriptionData}
                disabled={isSyncing}
                className="self-center mt-2"
              >
                {isSyncing ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                    Syncing...
                  </>
                ) : 'Sync Subscription Data'}
              </Button>
            </CardFooter>
          </Card>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>Have questions about your subscription? Contact support at support@example.com</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Subscription;
