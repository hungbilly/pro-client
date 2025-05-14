import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | 'paused' | 'inactive' | null;

interface Subscription {
  id: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  cancel_at?: string | null;
}

interface SubscriptionContextType {
  hasAccess: boolean;
  isLoading: boolean;
  isInTrialPeriod: boolean;
  trialDaysLeft: number;
  trialEndDate: string | null;
  subscription: Subscription | null;
  checkSubscription: () => Promise<void>;
  createSubscription: (withTrial?: boolean) => Promise<string | null>;
  cancelSubscription: () => Promise<boolean>;
  isCancelling: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  hasAccess: false,
  isLoading: true,
  isInTrialPeriod: false,
  trialDaysLeft: 0,
  trialEndDate: null,
  subscription: null,
  checkSubscription: async () => {},
  createSubscription: async () => null,
  cancelSubscription: async () => false,
  isCancelling: false,
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInTrialPeriod, setIsInTrialPeriod] = useState<boolean>(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasCheckedSubscription, setHasCheckedSubscription] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [trialDaysConfig, setTrialDaysConfig] = useState<number>(90);

  useEffect(() => {
    const loadConfig = async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("default_trial_days")
        .limit(1)
        .single();
      if (data && typeof data.default_trial_days === "number") {
        setTrialDaysConfig(data.default_trial_days);
        console.log("Fetched trialDaysConfig from admin_settings:", data.default_trial_days);
      }
    };
    loadConfig();
  }, []);

  // Helper function to check if a trial has expired
  const checkTrialExpiration = (trialEndDateString: string | null) => {
    if (!trialEndDateString) return false;
    
    const now = new Date();
    const trialEnd = new Date(trialEndDateString);
    return now > trialEnd;
  };

  const checkSubscription = useCallback(async () => {
    if (!user || !session) {
      console.log('No user or session, setting hasAccess to false');
      setHasAccess(false);
      setIsLoading(false);
      setHasCheckedSubscription(true);
      console.log('State after no user/session:', { hasAccess: false, isLoading: false, hasCheckedSubscription: true });
      return;
    }

    try {
      setIsLoading(true);
      console.log('Checking subscription for user:', user.id);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('Authenticated user ID from Supabase client:', currentUser?.id);
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('Current session:', currentSession);

      console.log('Querying user_subscriptions table...');
      const { data: subscriptionData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (subError) {
        console.error('Error checking local subscription:', subError.message);
      } else if (!subscriptionData) {
        console.log('No subscription found in user_subscriptions table');
      } else {
        console.log('Found subscription in database:', subscriptionData);
      }
      
      if (subscriptionData) {
        // Secondary check for trial expiration - client-side validation
        if (subscriptionData.status === 'trialing' && subscriptionData.trial_end_date) {
          const isTrialExpired = checkTrialExpiration(subscriptionData.trial_end_date);
          
          if (isTrialExpired) {
            console.log('Trial has expired based on client-side check, updating status...');
            
            // Update local subscription data
            try {
              const { error: updateError } = await supabase
                .from('user_subscriptions')
                .update({ status: 'inactive' })
                .eq('id', subscriptionData.id);
              
              if (updateError) {
                console.error('Error updating expired subscription locally:', updateError);
              } else {
                console.log('Successfully updated expired subscription to inactive');
                
                // Update local state to reflect expired trial
                setHasAccess(false);
                setIsInTrialPeriod(false);
                setTrialDaysLeft(0);
                setSubscription({
                  id: subscriptionData.stripe_subscription_id,
                  status: 'inactive',
                  currentPeriodEnd: subscriptionData.current_period_end,
                  cancel_at: subscriptionData.cancel_at,
                });
                
                setIsLoading(false);
                setHasCheckedSubscription(true);
                return;
              }
            } catch (error) {
              console.error('Error in local trial expiration update:', error);
            }
          }
        }
        
        if (['active', 'trialing'].includes(subscriptionData.status)) {
          console.log('Setting hasAccess to true for subscription:', subscriptionData);
          setHasAccess(true);
          setSubscription({
            id: subscriptionData.stripe_subscription_id,
            status: subscriptionData.status as SubscriptionStatus,
            currentPeriodEnd: subscriptionData.current_period_end,
            cancel_at: subscriptionData.cancel_at,
          });
          
          if (subscriptionData.status === 'active') {
            setIsInTrialPeriod(false);
            setTrialDaysLeft(0);
            setTrialEndDate(null);
            console.log('Active subscription found, disabling trial period');
            setIsLoading(false);
            setHasCheckedSubscription(true);
            return;
          } else {
            setIsInTrialPeriod(subscriptionData.status === 'trialing');
            
            if (subscriptionData.status === 'trialing' && subscriptionData.trial_end_date) {
              const trialEnd = new Date(subscriptionData.trial_end_date);
              const now = new Date();
              const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              setTrialDaysLeft(daysLeft > 0 ? daysLeft : 0);
              setTrialEndDate(subscriptionData.trial_end_date);
            }
          }
          
          setIsLoading(false);
          setHasCheckedSubscription(true);
          
          console.log('State after setting subscription from database:', {
            hasAccess: true,
            isLoading: false,
            subscription: {
              id: subscriptionData.stripe_subscription_id,
              status: subscriptionData.status,
              currentPeriodEnd: subscriptionData.current_period_end,
              cancel_at: subscriptionData.cancel_at,
            },
            isInTrialPeriod: subscriptionData.status === 'trialing',
            hasCheckedSubscription: true,
          });
          return;
        } else {
          console.log(`Subscription found but status is ${subscriptionData.status}, setting hasAccess to false`);
          setHasAccess(false);
          setSubscription({
            id: subscriptionData.stripe_subscription_id,
            status: subscriptionData.status as SubscriptionStatus,
            currentPeriodEnd: subscriptionData.current_period_end,
            cancel_at: subscriptionData.cancel_at,
          });
          setIsInTrialPeriod(false);
          setTrialDaysLeft(0);
          setTrialEndDate(null);
          setIsLoading(false);
          setHasCheckedSubscription(true);
          return;
        }
      }

      console.log('No active subscription found in database, calling check-subscription function...');
      try {
        console.log('Calling check-subscription function with token:', session.access_token.substring(0, 10) + '...');
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error('Error calling check-subscription function:', error.message);
          handleTrialFallback();
          return;
        }

        console.log('Subscription check result from edge function:', data);
        
        setHasAccess(data.hasAccess);
        
        if (data.subscription) {
          setSubscription({
            id: data.subscription.id,
            status: data.subscription.status as SubscriptionStatus,
            currentPeriodEnd: data.subscription.currentPeriodEnd,
            cancel_at: data.subscription.cancel_at
          });
          
          if (data.subscription.status === 'active') {
            setIsInTrialPeriod(false);
            setTrialDaysLeft(0);
            setTrialEndDate(null);
            console.log('Active subscription found from edge function, disabling trial period');
          } else {
            setIsInTrialPeriod(data.isInTrialPeriod);
            setTrialDaysLeft(data.trialDaysLeft);
            setTrialEndDate(data.trialEndDate);
          }
        } else {
          setSubscription(null);
          setIsInTrialPeriod(data.isInTrialPeriod);
          setTrialDaysLeft(data.trialDaysLeft);
          setTrialEndDate(data.trialEndDate);
        }
        
        console.log('State after edge function:', {
          hasAccess: data.hasAccess,
          isLoading: false,
          subscription: data.subscription,
          isInTrialPeriod: data.subscription && data.subscription.status === 'active' ? false : data.isInTrialPeriod,
          trialDaysLeft: data.subscription && data.subscription.status === 'active' ? 0 : data.trialDaysLeft,
          trialEndDate: data.subscription && data.subscription.status === 'active' ? null : data.trialEndDate,
          hasCheckedSubscription: true,
        });
      } catch (error) {
        console.error('Error checking subscription with edge function:', error.message);
        handleTrialFallback();
      }
    } catch (error) {
      console.error('Error in checkSubscription:', error.message);
      handleTrialFallback();
    } finally {
      setIsLoading(false);
      setHasCheckedSubscription(true);
      console.log('State in finally block:', { 
        hasAccess, 
        isLoading: false, 
        hasCheckedSubscription: true,
        isInTrialPeriod,
        subscription
      });
    }
  }, [user, session, trialDaysConfig]);

  const handleTrialFallback = () => {
    if (!user) return;
    
    console.log('Falling back to trial period check based on user creation date...');
    const userCreatedAt = new Date(user.created_at || Date.now());
    const trialEndDate = new Date(userCreatedAt);
    trialEndDate.setDate(trialEndDate.getDate() + trialDaysConfig);

    const now = new Date();
    const isInTrialPeriod = now < trialEndDate;
    
    console.log('User created at:', userCreatedAt.toISOString());
    console.log('Trial end date:', trialEndDate.toISOString());
    console.log('Is in trial period:', isInTrialPeriod);
    
    setHasAccess(isInTrialPeriod);
    setIsInTrialPeriod(isInTrialPeriod);
    setTrialDaysLeft(Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    setTrialEndDate(trialEndDate.toISOString());
    setSubscription(null);
    setHasCheckedSubscription(true);
    console.log('State after trial fallback:', {
      hasAccess: isInTrialPeriod,
      isLoading: false,
      isInTrialPeriod,
      trialDaysLeft: Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      trialEndDate: trialEndDate.toISOString(),
      subscription: null,
      hasCheckedSubscription: true,
    });
  };

  const cancelSubscription = async (): Promise<boolean> => {
    if (!user || !session) {
      toast.error('You must be logged in to cancel your subscription');
      return false;
    }

    try {
      setIsCancelling(true);
      console.log('Cancelling subscription...');
      
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error cancelling subscription:', error);
        toast.error('Failed to cancel subscription');
        return false;
      }

      console.log('Cancel subscription response:', data);
      
      if (data.success) {
        toast.success('Subscription cancelled successfully');
        await checkSubscription();
        return true;
      } else {
        toast.error(data.error || 'Failed to cancel subscription');
        return false;
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription');
      return false;
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    console.log('useEffect triggered with user:', user?.id, 'hasCheckedSubscription:', hasCheckedSubscription);
    if (user && !hasCheckedSubscription) {
      console.log('User logged in, checking subscription');
      checkSubscription();
    } else if (!user) {
      console.log('No user, setting hasAccess to false');
      setHasAccess(false);
      setIsLoading(false);
      setHasCheckedSubscription(false);
      console.log('State after logout:', { hasAccess: false, isLoading: false, hasCheckedSubscription: false });
    }
  }, [user, checkSubscription, hasCheckedSubscription]);

  const createSubscription = async (withTrial: boolean = true): Promise<string | null> => {
    if (!user || !session) {
      toast.error('You must be logged in to subscribe');
      return null;
    }

    try {
      console.log('Creating subscription with trial:', withTrial);
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { 
          withTrial, 
          productId: "prod_SGsTE3Gxgd0acM" // Updated product ID
        },
      });

      if (error) {
        console.error('Error creating subscription:', error);
        toast.error('Failed to create subscription');
        return null;
      }

      console.log('Create subscription response:', data);

      if (data.alreadySubscribed) {
        toast.info('You already have an active subscription');
        await checkSubscription();
        return null;
      }

      return data.url;
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to create subscription');
      return null;
    }
  };

  const value = {
    hasAccess,
    isLoading,
    isInTrialPeriod,
    trialDaysLeft,
    trialEndDate,
    subscription,
    checkSubscription,
    createSubscription,
    cancelSubscription,
    isCancelling,
  };

  console.log('SubscriptionProvider state before render:', value);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionProvider;
