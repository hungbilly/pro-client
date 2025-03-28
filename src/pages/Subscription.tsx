
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, AlertCircle } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Subscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    hasAccess, 
    isInTrialPeriod, 
    trialDaysLeft, 
    trialEndDate,
    subscription, 
    createSubscription 
  } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

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
        // Open the Stripe checkout URL in a new tab
        window.open(url, '_blank');
        // Show a dialog to guide the user
        setShowDialog(true);
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Could not process subscription request");
    } finally {
      setIsLoading(false);
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
                        <p className="text-sm font-medium text-gray-500">Next Payment</p>
                        <p>{formatDate(subscription?.currentPeriodEnd || null)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between bg-gray-50 rounded-b-lg">
                <Button variant="outline" onClick={() => navigate('/')}>
                  Return to Dashboard
                </Button>
                {subscription && !isInTrialPeriod && (
                  <Button 
                    variant="ghost" 
                    onClick={() => window.open('https://billing.stripe.com/p/login/test_5kA5kSdUY9Sn0qA6oo', '_blank')}
                  >
                    Manage Billing
                  </Button>
                )}
                {isInTrialPeriod && (
                  <Button 
                    variant="default"
                    onClick={() => handleSubscribe(false)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Subscribe Now'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-2">Upgrade Your Photography Business</h1>
            <p className="text-gray-600 max-w-xl mx-auto">
              Get access to all features and take your photography business to the next level
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle>Free Trial</CardTitle>
                <CardDescription>
                  Try all premium features for 3 months
                </CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$0</span>
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
                  <span className="text-3xl font-bold">$19.99</span>
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
    </PageTransition>
  );
};

export default Subscription;
