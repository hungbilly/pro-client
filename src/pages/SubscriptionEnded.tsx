
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, CheckCircle, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import PageTransition from '@/components/ui-custom/PageTransition';

const SubscriptionEnded = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    subscription, 
    isInTrialPeriod, 
    trialDaysLeft, 
    trialEndDate, 
    createSubscription,
    isLoading
  } = useSubscription();
  
  const fromPath = location.state?.from || '/';
  
  const handleSubscribe = async () => {
    try {
      const url = await createSubscription(false); // No trial since they've already had one
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        variant: "destructive",
        title: "Subscription Error",
        description: "Failed to create subscription. Please try again.",
      });
    }
  };
  
  const getStatusMessage = () => {
    if (subscription) {
      if (subscription.status === 'canceled') {
        return "Your subscription has been canceled.";
      } else if (subscription.status === 'inactive' || subscription.status === 'incomplete' || subscription.status === 'incomplete_expired') {
        return "Your subscription is no longer active.";
      } else if (subscription.status === 'past_due') {
        return "Your subscription payment is past due.";
      } else {
        return "Your subscription requires attention.";
      }
    } else if (trialEndDate) {
      // Trial has ended
      const formattedDate = format(new Date(trialEndDate), 'MMMM d, yyyy');
      return `Your free trial ended on ${formattedDate}.`;
    } else {
      return "You need an active subscription to continue.";
    }
  };

  return (
    <PageTransition>
      <div className="container max-w-4xl py-12">
        <Card className="border-red-200 shadow-lg">
          <CardHeader className="bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              <CardTitle>Subscription Required</CardTitle>
            </div>
            <CardDescription>
              {getStatusMessage()}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                <h3 className="font-medium flex items-center gap-2 text-amber-800">
                  <Clock className="h-5 w-5" />
                  Access Restricted
                </h3>
                <p className="mt-2 text-amber-700">
                  You were trying to access: <span className="font-medium">{fromPath}</span>
                </p>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                  <h3 className="font-medium flex items-center gap-2 text-blue-800">
                    <CheckCircle className="h-5 w-5" />
                    What's Included:
                  </h3>
                  <ul className="mt-2 space-y-1 text-blue-700">
                    <li>• Full client management tools</li>
                    <li>• Invoice creation and tracking</li>
                    <li>• Job scheduling and management</li>
                    <li>• Payment processing</li>
                    <li>• Unlimited storage</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 p-4 rounded-md border border-green-100">
                  <h3 className="font-medium flex items-center gap-2 text-green-800">
                    <Calendar className="h-5 w-5" />
                    Subscription Benefits:
                  </h3>
                  <ul className="mt-2 space-y-1 text-green-700">
                    <li>• Low monthly fee</li>
                    <li>• Cancel anytime</li>
                    <li>• No long-term contracts</li>
                    <li>• Immediate access upon subscribing</li>
                    <li>• Free updates and new features</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col sm:flex-row gap-4 pt-2 pb-6 border-t border-gray-100">
            <Button 
              className="w-full sm:w-auto" 
              onClick={handleSubscribe} 
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Subscribe Now'
              )}
            </Button>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto" 
              onClick={() => navigate('/subscription')}
              size="lg"
            >
              View Pricing Plans
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageTransition>
  );
};

export default SubscriptionEnded;
