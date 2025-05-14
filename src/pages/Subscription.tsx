import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, AlertCircle, Info, AlertTriangle, CalendarX, Shield } from 'lucide-react';
import PageTransition from '@/components/ui-custom/PageTransition';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Subscription = () => {
  const navigate = useNavigate();
  const {
    user,
    isAdmin
  } = useAuth();
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
  const isPendingCancellation = subscription?.status === 'active' && subscription?.cancel_at;
  const canCancelSubscription = subscription && (subscription.status === 'active' || subscription.status === 'trialing');
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
      day: 'numeric'
    });
  };
  if (!user) {
    return <PageTransition>
        <div className="container mx-auto py-8 px-4">
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
      </PageTransition>;
  }

  // Special case for admin users
  if (isAdmin) {
    return <PageTransition>
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="border-purple-200 shadow-lg">
            <CardHeader className="bg-purple-50 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl text-purple-700">Admin Access</CardTitle>
                  <CardDescription className="text-purple-600 mt-1">
                    You have full access to all features as an administrator
                  </CardDescription>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Alert variant="default" className="mb-4 bg-purple-50 text-purple-700 border-purple-200">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  As an admin user, you have automatic access to all features without requiring a subscription.
                  You can view and manage all user subscriptions from the Admin Dashboard.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <div>
                    <h3 className="font-medium">Unlimited clients</h3>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <div>
                    <h3 className="font-medium">Unlimited invoices</h3>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <div>
                    <h3 className="font-medium">Job management</h3>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <div>
                    <h3 className="font-medium">Export data</h3>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between bg-gray-50 rounded-b-lg">
              <Button variant="outline" onClick={() => navigate('/')}>
                Return to Dashboard
              </Button>
              <Button onClick={() => navigate('/admin')}>
                Go to Admin Dashboard
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </PageTransition>;
  }
  if (hasAccess) {
    return <PageTransition>
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
                {subscription?.status === 'canceled' && <Alert variant="warning" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Your subscription has been canceled but you still have access until the end of your current billing period.
                    </AlertDescription>
                  </Alert>}

                {isPendingCancellation && <Alert variant="warning" className="mb-4">
                    <CalendarX className="h-4 w-4" />
                    <AlertDescription>
                      Your subscription is scheduled to be canceled on {formatDate(subscription.cancel_at)}. You will continue to have access until this date.
                    </AlertDescription>
                  </Alert>}
                
                {isInTrialPeriod ? <div className="space-y-4">
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
                      <p className="text-sm text-blue-700">Enjoy your free 1-month trial. No payment information required until your trial ends.</p>
                    </div>
                  </div> : <div className="space-y-4">
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
                          {isPendingCancellation ? formatDate(subscription?.cancel_at || null) : formatDate(subscription?.currentPeriodEnd || null)}
                        </p>
                      </div>
                    </div>
                  </div>}
              </CardContent>
              <CardFooter className="flex justify-between bg-gray-50 rounded-b-lg">
                <Button variant="outline" onClick={() => navigate('/')}>
                  Return to Dashboard
                </Button>
                <div className="flex gap-2">
                  {subscription && !isInTrialPeriod && <Button variant="outline" onClick={() => window.open('https://billing.stripe.com/p/login/dR69BE6CAbGhcsEeUU', '_blank')}>
                      Manage Billing
                    </Button>}
                  {canCancelSubscription && <Button variant="destructive" onClick={() => setShowCancelDialog(true)} disabled={isCancelling}>
                      {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
                    </Button>}
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
                {subscription?.status === 'trialing' ? 'Are you sure you want to cancel your subscription? You will lose access at the end of your 30-day trial and will not be charged.' : `Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period (${formatDate(subscription?.currentPeriodEnd)}).`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Keep Subscription
              </Button>
              <Button variant="destructive" onClick={handleCancelSubscription} disabled={isCancelling}>
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageTransition>;
  }
  return <PageTransition>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Upgrade Your Business</h1>
            <p className="text-gray-600 max-w-xl mx-auto">Get access to all features and take your business to the next level</p>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Premium</CardTitle>
                <CardDescription>
                  Full access to all features
                </CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">USD$7</span>
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
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Cancel anytime</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleSubscribe(true)} disabled={isLoading}>
                  {isLoading ? 'Processing...' : 'Subscribe Now'}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg mt-12">
            <h3 className="text-lg font-medium mb-2">Need help?</h3>
            <p className="text-gray-600">Contact our support team at support@proclientapp.com</p>
          </div>
        </div>
      </div>
    </PageTransition>;
};

export default Subscription;
