
import React, { useState } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const SubscriptionStatusBadge = () => {
  const { 
    hasAccess, 
    isLoading, 
    isInTrialPeriod, 
    subscription 
  } = useSubscription();

  if (isLoading) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
        Loading...
      </span>
    );
  }

  // Always prioritize active subscription status over trial status
  if (subscription && subscription.status === 'active') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800">
        Active
      </span>
    );
  } 
  
  if (isInTrialPeriod && (!subscription || subscription.status !== 'active')) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
        Trial
      </span>
    );
  } 
  
  if (!hasAccess) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-800">
        Expired
      </span>
    );
  }

  return null;
};

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Add debug logging
  console.log("SubscriptionStatus render state:", {
    hasAccess,
    isLoading,
    isInTrialPeriod,
    trialDaysLeft,
    trialEndDate,
    subscription
  });

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await checkSubscription();
      toast.success("Subscription status refreshed");
    } catch (error) {
      toast.error("Failed to refresh subscription status");
      console.error("Error refreshing subscription:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>Loading your subscription details...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Subscription Status</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefreshStatus} 
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </CardTitle>
        <CardDescription>Manage your subscription plan</CardDescription>
      </CardHeader>
      <CardContent>
        {subscription && subscription.status === 'active' ? (
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
        ) : isInTrialPeriod && (!subscription || subscription.status !== 'active') ? (
          <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Trial Period</h3>
                <p className="text-sm text-amber-700">
                  You are currently in your free trial period. 
                  <span className="font-medium">{trialDaysLeft} days remaining.</span>
                </p>
                {trialEndDate && (
                  <p className="text-sm text-amber-700 mt-1">
                    Trial ends on {format(new Date(trialEndDate), 'MMMM d, yyyy')}
                  </p>
                )}
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
          {isInTrialPeriod && (!subscription || subscription.status !== 'active') && (
            <Button 
              onClick={() => navigate('/subscription')}
              variant="outline"
              className="flex-1"
            >
              Upgrade to Premium
            </Button>
          )}
          <Button 
            onClick={handleRefreshStatus} 
            variant="outline"
            className="flex-1"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh Status'
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default SubscriptionStatus;
