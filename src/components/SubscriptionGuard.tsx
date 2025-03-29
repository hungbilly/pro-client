
import React, { useEffect } from 'react';
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

  // Add effect to check subscription on mount
  useEffect(() => {
    // Force a re-check of subscription status when component mounts
    console.log('SubscriptionGuard: Checking subscription status...');
    checkSubscription().then(() => {
      console.log('SubscriptionGuard: Subscription check completed');
    });
  }, []);

  // Add debug logging
  useEffect(() => {
    console.log('SubscriptionGuard state:', { 
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
  }, [hasAccess, isLoading, subscription, isInTrialPeriod, trialDaysLeft]);

  useEffect(() => {
    if (!hasAccess && !isLoading) {
      toast.warning("You need an active subscription to access this feature");
    } else if (isInTrialPeriod && trialDaysLeft <= 7) {
      toast.info(`Your trial ends in ${trialDaysLeft} days. Subscribe to continue using all features.`);
    }
  }, [hasAccess, isLoading, isInTrialPeriod, trialDaysLeft]);

  if (isLoading) {
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

  return children ? <>{children}</> : <Outlet />;
};

export default SubscriptionGuard;
