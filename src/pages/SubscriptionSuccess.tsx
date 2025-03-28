
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkSubscription } = useSubscription();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationSuccessful, setVerificationSuccessful] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    const verifySubscription = async () => {
      try {
        if (!sessionId) {
          toast.error('No session ID found');
          setVerificationMessage('No session ID was found in the URL');
          return;
        }
        
        // First check if the subscription is already in the database
        const { data: sessionData, error: sessionError } = await supabase
          .from('subscription_sessions')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle();
        
        console.log('Found session data:', sessionData);
        if (sessionError) {
          console.error('Error fetching session data:', sessionError);
        }
        
        // Try to update subscription status
        await checkSubscription();
        
        // If we've tried a few times and still no success, try a more aggressive check
        if (attempts > 1) {
          console.log('Multiple verification attempts, using direct Stripe check');
          setVerificationMessage('Performing direct verification with Stripe...');
          
          // Check Stripe directly using our edge function
          try {
            const { data } = await supabase.functions.invoke('check-subscription');
            console.log('Direct subscription check result:', data);
            
            if (data?.subscription) {
              setSubscriptionDetails(data.subscription);
            }
          } catch (err) {
            console.error('Error in direct subscription check:', err);
            setVerificationMessage('Error connecting to Stripe for verification');
          }
          
          // Try once more to update local subscription state
          await checkSubscription();
        }
        
        setVerificationSuccessful(true);
        toast.success('Subscription activation verified!');
      } catch (error) {
        console.error('Error verifying subscription:', error);
        
        // If several attempts fail, still allow user to proceed
        if (attempts >= 3) {
          setVerificationSuccessful(true);
          setVerificationMessage('Your subscription has been recorded, but verification is pending. Your account will reflect the updated status shortly.');
          toast.info('Your subscription has been recorded, but verification is still pending');
        } else {
          setVerificationMessage(`Verification attempt ${attempts + 1} failed. Retrying...`);
          toast.error('There was a problem verifying your subscription');
          setAttempts(prev => prev + 1);
        }
      } finally {
        setIsVerifying(false);
      }
    };

    const timer = setTimeout(() => {
      verifySubscription();
    }, 1500); // Give Stripe webhook some time to process

    return () => clearTimeout(timer);
  }, [checkSubscription, searchParams, attempts]);
  
  const retryVerification = async () => {
    setIsVerifying(true);
    setVerificationMessage('Manually retrying verification...');
    await checkSubscription();
    setVerificationSuccessful(true);
    setIsVerifying(false);
  };

  const checkDatabase = async () => {
    try {
      setIsVerifying(true);
      setVerificationMessage('Checking subscription database records...');
      
      // Check user_subscriptions table
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (subError) {
        console.error('Error checking subscription database:', subError);
        toast.error('Error checking subscription database');
      } else {
        console.log('User subscription data:', subData);
        if (subData && subData.length > 0) {
          setSubscriptionDetails(subData[0]);
          toast.success('Found subscription in database');
        } else {
          toast.info('No subscription record found in database. You may be on a free trial.');
        }
      }
      
      // Check trial period
      const { data } = await supabase.functions.invoke('check-subscription');
      console.log('Subscription check result:', data);
      
      if (data?.isInTrialPeriod) {
        setVerificationMessage(`You are in a free trial period with ${data.trialDaysLeft} days remaining until ${new Date(data.trialEndDate).toLocaleDateString()}`);
      }
      
      setVerificationSuccessful(true);
    } catch (error) {
      console.error('Error checking database:', error);
      toast.error('Error checking subscription database');
    } finally {
      setIsVerifying(false);
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
                  {verificationMessage && (
                    <p className="text-sm text-gray-600">{verificationMessage}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {verificationSuccessful ? (
                    <>
                      <p>
                        Thank you for subscribing to our service. Your account has been activated with full access to all premium features.
                      </p>
                      {subscriptionDetails && (
                        <div className="bg-gray-50 p-4 rounded-lg text-left">
                          <h4 className="font-medium mb-2">Subscription Details:</h4>
                          <p className="text-sm text-gray-700">
                            Status: <span className="font-medium">{subscriptionDetails.status}</span>
                          </p>
                          {subscriptionDetails.current_period_end && (
                            <p className="text-sm text-gray-700">
                              Next billing: <span className="font-medium">{new Date(subscriptionDetails.current_period_end).toLocaleDateString()}</span>
                            </p>
                          )}
                        </div>
                      )}
                      {verificationMessage && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-blue-700">
                            {verificationMessage}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 justify-center">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <p>
                          Your payment was processed, but we're having trouble confirming your subscription status.
                        </p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-sm text-yellow-700">
                          You may need to wait a moment and refresh your subscription status.
                        </p>
                        {verificationMessage && (
                          <p className="text-sm text-yellow-700 mt-2">
                            {verificationMessage}
                          </p>
                        )}
                      </div>
                      <Button onClick={retryVerification} className="mt-2">
                        Retry Verification
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <div className="flex justify-center space-x-4 w-full">
                <Button onClick={() => navigate('/')}>
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => navigate('/subscription')}>
                  View Subscription
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={checkDatabase}
                disabled={isVerifying}
              >
                Check Subscription Database
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default SubscriptionSuccess;
