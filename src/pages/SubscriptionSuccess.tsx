
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkSubscription } = useSubscription();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationSuccessful, setVerificationSuccessful] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    const verifySubscription = async () => {
      try {
        if (!sessionId) {
          toast.error('No session ID found');
          return;
        }
        
        // First check if the subscription is already in the database
        const { data: sessionData } = await supabase
          .from('subscription_sessions')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle();
        
        console.log('Found session data:', sessionData);
        
        // Try to update subscription status
        await checkSubscription();
        
        // If we've tried a few times and still no success, try a more aggressive check
        if (attempts > 1) {
          console.log('Multiple verification attempts, using direct Stripe check');
          
          // Check Stripe directly using our edge function
          try {
            const { data } = await supabase.functions.invoke('check-subscription');
            console.log('Direct subscription check result:', data);
          } catch (err) {
            console.error('Error in direct subscription check:', err);
          }
          
          // Try once more to update local subscription state
          await checkSubscription();
        }
        
        setVerificationSuccessful(true);
        toast.success('Subscription activated successfully!');
      } catch (error) {
        console.error('Error verifying subscription:', error);
        
        // If several attempts fail, still allow user to proceed
        if (attempts >= 3) {
          setVerificationSuccessful(true);
          toast.info('Your subscription has been recorded, but verification is still pending');
        } else {
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
    await checkSubscription();
    setVerificationSuccessful(true);
    setIsVerifying(false);
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
                    </>
                  ) : (
                    <>
                      <p>
                        Your payment was processed, but we're having trouble confirming your subscription status.
                      </p>
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-sm text-yellow-700">
                          You may need to wait a moment and refresh your subscription status.
                        </p>
                      </div>
                      <Button onClick={retryVerification} className="mt-2">
                        Retry Verification
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center space-x-4">
              <Button onClick={() => navigate('/')}>
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/subscription')}>
                View Subscription
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default SubscriptionSuccess;
