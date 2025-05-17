
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSubscription } from '@/context/SubscriptionContext';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

interface SubscriptionGuardProps {
  children?: React.ReactNode;
}

const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ children }) => {
  const { 
    hasAccess, 
    isLoading, 
    isInTrialPeriod, 
    trialDaysLeft, 
    trialEndDate,
    subscription,
    checkSubscription
  } = useSubscription();
  const { isAdmin, session } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Add effect to check subscription on mount or when session changes
  useEffect(() => {
    console.log('SubscriptionGuard: Checking subscription status...', 
      session ? `Session active for ${session.user.email}` : 'No active session');
    
    const verifySubscription = async () => {
      await checkSubscription(); // Wait for the subscription check to complete
      console.log('SubscriptionGuard: Subscription check completed');
      setHasChecked(true);
    };

    if (session) {
      verifySubscription();
    } else {
      // If no session, still mark as checked but we'll handle access denial later
      setHasChecked(true);
    }
  }, [checkSubscription, session]);

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
        isAdmin,
        currentPath: location.pathname,
        hasActiveSession: !!session
      });
    }
  }, [hasAccess, isLoading, subscription, isInTrialPeriod, trialDaysLeft, hasChecked, isAdmin, location, session]);

  // Modified notification effect with localStorage tracking and more precise trial information
  useEffect(() => {
    if (hasChecked && !isLoading) {
      const currentDate = new Date().toDateString();
      
      // Show access warning notification
      if (!hasAccess && !isAdmin) {
        const accessWarningKey = `subscription_access_warning_shown_${currentDate}`;
        if (!localStorage.getItem(accessWarningKey)) {
          toast({
            variant: "destructive",
            title: "Subscription Required",
            description: "You need an active subscription to access this feature",
          });
          localStorage.setItem(accessWarningKey, 'true');
          // Clear this notification after 1 hour to avoid completely silencing it if needed again
          setTimeout(() => localStorage.removeItem(accessWarningKey), 3600000); 
        }
      } 
      // Show trial ending notification with specific end date
      else if (isInTrialPeriod && (!subscription || subscription.status !== 'active') && trialDaysLeft <= 7) {
        const trialWarningKey = `subscription_trial_warning_shown_${currentDate}_${trialDaysLeft}`;
        if (!localStorage.getItem(trialWarningKey)) {
          const formattedDate = trialEndDate ? format(new Date(trialEndDate), 'MMMM d, yyyy') : 'soon';
          
          if (trialDaysLeft <= 3) {
            toast({
              variant: "destructive",
              title: "Trial Ending Soon!",
              description: `Your trial ends in ${trialDaysLeft} days (${formattedDate}). Subscribe now to avoid losing access.`,
            });
          } else {
            toast({
              title: "Trial Period",
              description: `Your trial ends on ${formattedDate} (${trialDaysLeft} days remaining)`,
            });
          }
          
          localStorage.setItem(trialWarningKey, 'true');
          // Clear this notification after 8 hours - once per day is enough
          setTimeout(() => localStorage.removeItem(trialWarningKey), 28800000);
        }
      }
    }
  }, [hasAccess, isLoading, isInTrialPeriod, trialDaysLeft, hasChecked, subscription, isAdmin, trialEndDate]);

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await checkSubscription();
      toast({
        title: "Status Updated",
        description: "Subscription status refreshed",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to refresh subscription status",
      });
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

  // Check for no session before admin bypass
  if (!session) {
    console.log('SubscriptionGuard: No active session, redirecting to auth page');
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Admin bypass - let admins through regardless of subscription status
  if (isAdmin) {
    console.log('SubscriptionGuard: Admin user detected, granting access');
    return children ? <>{children}</> : <Outlet />;
  }

  if (!hasAccess) {
    // Add a link to tutorial page so users can learn about the app's features
    return (
      <div className="container mx-auto max-w-lg py-12 px-4">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Subscription Required</AlertTitle>
          <AlertDescription>
            You need an active subscription to access this feature. Please subscribe or check your subscription status.
          </AlertDescription>
        </Alert>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
          <Button onClick={() => navigate('/subscription')}>View Subscription Plans</Button>
          <Button variant="outline" onClick={() => navigate('/tutorial')}>Explore Features</Button>
        </div>
        
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground mb-2">
            Having issues with your subscription?
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Refreshing...
              </>
            ) : (
              'Refresh subscription status'
            )}
          </Button>
        </div>
      </div>
    );
  }

  console.log('SubscriptionGuard: Access granted, rendering children');
  return children ? <>{children}</> : <Outlet />;
};

export default SubscriptionGuard;
