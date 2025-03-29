
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSubscription } from '@/context/SubscriptionContext';
import { toast } from 'sonner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface SubscriptionGuardProps {
  children?: React.ReactNode;
}

const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ children }) => {
  const { 
    hasAccess, 
    isLoading, 
    isInTrialPeriod, 
    trialDaysLeft, 
    subscription,
    checkSubscription
  } = useSubscription();
  const [hasChecked, setHasChecked] = useState(false);

  // Add effect to check subscription on mount
  useEffect(() => {
    console.log('SubscriptionGuard: Checking subscription status...');
    const verifySubscription = async () => {
      await checkSubscription(); // Wait for the subscription check to complete
      console.log('SubscriptionGuard: Subscription check completed');
      setHasChecked(true);
    };

    verifySubscription();
  }, [checkSubscription]);

  // Add debug logging
  useEffect(() => {
    if (hasChecked) {
      console.log('SubscriptionGuard state after check:', { 
        hasAccess, 
        isLoading, 
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd
        } : null,
        isInTrialPeriod,
        trialDaysLeft
      });
    }
  }, [hasAccess, isLoading, subscription, isInTrialPeriod, trialDaysLeft, hasChecked]);

  useEffect(() => {
    if (hasChecked && !isLoading && !hasAccess) {
      toast.warning("You need an active subscription to access this feature");
    } else if (isInTrialPeriod && trialDaysLeft <= 7) {
      toast.info(`Your trial ends in ${trialDaysLeft} days. Subscribe to continue using all features.`);
    }
  }, [hasAccess, isLoading, isInTrialPeriod, trialDaysLeft, hasChecked]);

  if (isLoading || !hasChecked) {
    console.log('SubscriptionGuard: Loading subscription status...');
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-600">Checking subscription...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    // For debugging purposes, show more information about what's happening
    console.log("SubscriptionGuard: No access, redirecting to /subscription");
    console.log("Subscription check failed:", { 
      hasAccess, 
      isLoading, 
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
      } : null
    });

    return (
      <div className="p-6">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Subscription Required</AlertTitle>
          <AlertDescription>
            You need an active subscription to access this feature. 
            {subscription ? ` Current status: ${subscription.status}` : ' No subscription found.'}
          </AlertDescription>
        </Alert>
        <Navigate to="/subscription" replace />
      </div>
    );
  }

  console.log('SubscriptionGuard: Access granted, rendering children');
  return children ? <>{children}</> : <Outlet />;
};

export default SubscriptionGuard;
