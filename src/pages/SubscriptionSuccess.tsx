
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkSubscription } = useSubscription();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationSuccessful, setVerificationSuccessful] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    const verifySubscription = async () => {
      try {
        if (!sessionId) {
          toast.error('No session ID found');
          return;
        }
        
        await checkSubscription();
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
                          Please contact support if you continue to have issues accessing premium features.
                        </p>
                      </div>
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
