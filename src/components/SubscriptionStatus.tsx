
import React from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const SubscriptionStatus = () => {
  const { 
    hasAccess, 
    isLoading, 
    isInTrialPeriod, 
    trialDaysLeft, 
    trialEndDate, 
    subscription,
    checkSubscription
  } = useSubscription();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>Loading your subscription details...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Subscription Status</CardTitle>
        <CardDescription>Manage your subscription plan</CardDescription>
      </CardHeader>
      <CardContent>
        {isInTrialPeriod ? (
          <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Trial Period</h3>
                <p className="text-sm text-amber-700">
                  You are currently in your free trial period. {trialDaysLeft} days remaining.
                </p>
                {trialEndDate && (
                  <p className="text-sm text-amber-700 mt-1">
                    Trial ends on {format(new Date(trialEndDate), 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : subscription ? (
          <div className="p-4 border rounded-lg bg-green-50 border-green-200">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-green-800">
                  Active Subscription - Premium Plan
                </h3>
                <p className="text-sm text-green-700">
                  Status: {subscription.status}
                </p>
                {subscription.currentPeriodEnd && (
                  <p className="text-sm text-green-700 mt-1">
                    Next billing date: {format(new Date(subscription.currentPeriodEnd), 'MMMM d, yyyy')}
                  </p>
                )}
                <p className="text-sm text-green-700 mt-1">
                  Price: HK$50/month
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border rounded-lg bg-red-50 border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">No Active Subscription</h3>
                <p className="text-sm text-red-700">
                  You don't have an active subscription. Subscribe to access all premium features.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="w-full flex gap-4 flex-wrap">
          {!subscription && !isInTrialPeriod && (
            <Button 
              onClick={() => navigate('/subscription')}
              className="flex-1"
            >
              Subscribe Now
            </Button>
          )}
          {isInTrialPeriod && (
            <Button 
              onClick={() => navigate('/subscription')}
              variant="outline"
              className="flex-1"
            >
              Upgrade to Premium
            </Button>
          )}
          <Button 
            onClick={() => checkSubscription()} 
            variant="outline"
            className="flex-1"
          >
            Refresh Status
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default SubscriptionStatus;
