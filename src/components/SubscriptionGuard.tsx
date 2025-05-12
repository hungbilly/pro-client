
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSubscription } from '@/context/SubscriptionContext';
import { toast } from 'sonner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

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
  const { isAdmin } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  
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
        trialDaysLeft,
        isAdmin
      });
    }
  }, [hasAccess, isLoading, subscription, isInTrialPeriod, trialDaysLeft, hasChecked, isAdmin]);

  useEffect(() => {
    if (hasChecked && !isLoading && !hasAccess && !isAdmin) {
      toast.warning("You need an active subscription to access this feature");
    } else if (isInTrialPeriod && (!subscription || subscription.status !== 'active') && trialDaysLeft <= 7) {
      toast.info(`Your trial ends in ${trialDaysLeft} days. Subscribe to continue using all features.`);
    }
  }, [hasAccess, isLoading, isInTrialPeriod, trialDaysLeft, hasChecked, subscription, isAdmin]);

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

  if (isLoading || !hasChecked) {
    console.log('SubscriptionGuard: Loading subscription status...');
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600">Checking subscription...</p>
        </div>
      </div>
    );
  }

  // Admin bypass - let admins through regardless of subscription status
  if (isAdmin) {
    console.log('SubscriptionGuard: Admin user detected, granting access');
    return children ? <>{children}</> : <Outlet />;
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
      <div className="p-6 max-w-md mx-auto">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Subscription Required</AlertTitle>
          <AlertDescription>
            You need an active subscription to access this feature. 
            {subscription ? ` Current status: ${subscription.status}` : ' No subscription found.'}
          </AlertDescription>
        </Alert>
        
        <div className="flex flex-col space-y-4 mt-4">
          <Button 
            variant="default"
            onClick={() => navigate('/subscription')}
            className="w-full"
          >
            View Subscription Options
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
            className="w-full"
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
        
        <Navigate to="/subscription" replace />
      </div>
    );
  }

  console.log('SubscriptionGuard: Access granted, rendering children');
  return children ? <>{children}</> : <Outlet />;
};

export default SubscriptionGuard;
