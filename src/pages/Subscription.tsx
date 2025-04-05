import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, AlertCircle, Info, AlertTriangle, CalendarX } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Subscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    hasAccess, 
    isInTrialPeriod, 
    trialDaysLeft, 
    trialEndDate,
    subscription, 
    createSubscription,
    cancelSubscription,
    isCancelling
  } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showTestInfo, setShowTestInfo] = useState(false);

  const isPendingCancellation = subscription?.status === 'active' && subscription?.cancel_at;

  const handleSubscribe = async (withTrial: boolean = true) => {
    if (!user) {
      toast.error("You must be logged in to subscribe");
      navigate("/auth");
      return;
    }

    setIsLoading(true);
    try {
      const url = await createSubscription(withTrial);
      if (url) {
        window.open(url, '_blank');
        setShowDialog(true);
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Could not process subscription request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    const success = await cancelSubscription();
    if (success) {
      setShowCancelDialog(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <PageTransition>
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto">
            <Card className="border-orange-200 shadow-lg">
              <CardHeader>
                <div className="flex justify-center">
                  <AlertCircle className="h-16 w-16 text-orange-500 mb-4" />
                </div>
                <CardTitle className="text-2xl">Login Required</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Please login to view subscription options and manage your account.</p>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button onClick={() => navigate('/auth')}>
                  Go to Login
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (hasAccess) {
    return (
      <PageTransition>
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="border-green-200 shadow-lg">
              <CardHeader className="bg-green-50 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl text-green-700">Subscription Active</CardTitle>
                    <CardDescription className="text-green-600 mt-1">
                      You have full access to all features
                    </CardDescription>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {subscription?.status === 'canceled' && (
                  <Alert variant="warning" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Your subscription has been canceled but you still have access until the end of your current billing period.
                    </AlertDescription>
                  </Alert>
                )}

                {isPendingCancellation && (
                  <Alert variant="warning" className="mb-4">
                    <CalendarX className="h-4 w-4" />
                    <AlertDescription>
                      Your subscription is scheduled to be canceled on {formatDate(subscription.cancel_at)}. You will continue to have access until this date.
                    </AlertDescription>
                  </Alert>
                )}
                
                {isInTrialPeriod ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <div>
                        <h3 className="font-medium">Free Trial Period</h3>
                        <p className="text-sm text-gray-500">
                          You have {trialDaysLeft} days left in your trial
                        </p>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-700">
                        Enjoy your free 3-month trial. No payment information required until your trial ends.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">Subscription Details</h3>
                      <p className="text-sm text-gray-500">Premium Photography Business Management</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <p className="capitalize">{subscription?.status || 'Active'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          {isPendingCancellation ? 'Access Until' : 'Next Payment'}
                        </p>
                        <p>
                          {isPendingCancellation 
                            ? formatDate(subscription?.cancel_at || null)
                            : formatDate(subscription?.currentPeriodEnd || null)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between bg-gray-50 rounded-b-lg">
                <Button variant="outline" onClick={() => navigate('/')}>
                  Return to Dashboard
                </Button>
                <div className="flex gap-2">
                  {subscription && !isInTrialPeriod && (
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('https://billing.stripe.com/p/login/test_5kA5kSdUY9Sn0qA6oo', '_blank')}
                    >
                      Manage Billing
                    </Button>
                  )}
                  {isInTrialPeriod ? (
                    <Button 
                      variant="default"
                      onClick={() => handleSubscribe(false)}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Subscribe Now'}
                    </Button>
                  ) : subscription?.status !== 'canceled' && !isPendingCancellation && (
                    <Button 
                      variant="destructive"
                      onClick={() => setShowCancelDialog(true)}
                      disabled={isCancelling}
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Completing your subscription</DialogTitle>
              <DialogDescription>
                A new tab has been opened to complete your subscription with Stripe. 
                Once you've completed the payment process, you'll be redirected back to our site.
                
                If you don't see the tab, please check if it was blocked by your browser.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => setShowDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Subscription</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period ({formatDate(subscription?.currentPeriodEnd)}).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Keep Subscription
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancelSubscription}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Upgrade Your Photography Business</h1>
            <p className="text-gray-600 max-w-xl mx-auto">
              Get access to all features and take your photography business to the next level
            </p>
            <div className="mt-4 flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={() => setShowTestInfo(!showTestInfo)}
              >
                <Info className="h-4 w-4" />
                Test Mode Information
              </Button>
            </div>
            {showTestInfo && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg max-w-2xl mx-auto">
                <h3 className="font-medium text-blue-700">Test Mode Information</h3>
                <p className="text-sm text-blue-600 mt-2">
                  This is running in Stripe Test Mode. You can use test card number <code className="bg-blue-100 px-1 rounded">4242 4242 4242 4242</code> with any future expiration date and any 3-digit CVC to test the subscription process.
                </p>
                <p className="text-sm text-blue-600 mt-2">
                  No real charges will be made in test mode. To test the subscription, simply complete the checkout process with the test card.
                </p>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle>Free Trial</CardTitle>
                <CardDescription>
                  Try all premium features for 3 months
                </CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">HK$0</span>
                  <span className="text-gray-500 ml-1">/ 3 months</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Unlimited clients</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Unlimited invoices</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Job management</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Export data</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Custom invoices</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(true)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Start Free Trial'}
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Premium</CardTitle>
                <CardDescription>
                  After your trial ends
                </CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">HK$50</span>
                  <span className="text-gray-500 ml-1">/ month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Unlimited clients</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Unlimited invoices</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Job management</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Export data</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Custom invoices</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleSubscribe(false)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Subscribe Now'}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Need help?</h3>
            <p className="text-gray-600">
              Contact our support team at support@photobizmanager.com
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Subscription;
