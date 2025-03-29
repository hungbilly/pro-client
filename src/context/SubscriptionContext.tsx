
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | 'paused' | null;

interface Subscription {
  id: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
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
      
      // Log the authenticated user ID from the Supabase client
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
        console.log('Found active subscription in database:', subscriptionData);
      }
      
      if (subscriptionData && ['active', 'trialing'].includes(subscriptionData.status)) {
        console.log('Setting hasAccess to true for subscription:', subscriptionData);
        setHasAccess(true);
        setSubscription({
          id: subscriptionData.stripe_subscription_id,
          status: subscriptionData.status as SubscriptionStatus,
          currentPeriodEnd: subscriptionData.current_period_end,
        });
        setIsInTrialPeriod(subscriptionData.status === 'trialing');
        setIsLoading(false);
        setHasCheckedSubscription(true);
        console.log('State after setting active subscription:', {
          hasAccess: true,
          isLoading: false,
          subscription: {
            id: subscriptionData.stripe_subscription_id,
            status: subscriptionData.status,
            currentPeriodEnd: subscriptionData.current_period_end,
          },
          isInTrialPeriod: subscriptionData.status === 'trialing',
          hasCheckedSubscription: true,
        });
        return;
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
            currentPeriodEnd: data.subscription.currentPeriodEnd
          });
        } else {
          setSubscription(null);
        }
        
        setIsInTrialPeriod(data.isInTrialPeriod);
        setTrialDaysLeft(data.trialDaysLeft);
        setTrialEndDate(data.trialEndDate);
        console.log('State after edge function:', {
          hasAccess: data.hasAccess,
          isLoading: false,
          subscription: data.subscription,
          isInTrialPeriod: data.isInTrialPeriod,
          trialDaysLeft: data.trialDaysLeft,
          trialEndDate: data.trialEndDate,
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
      console.log('State in finally block:', { hasAccess, isLoading: false, hasCheckedSubscription: true });
    }
  }, [user, session]);

  const handleTrialFallback = () => {
    if (!user) return;
    
    console.log('Falling back to trial period check based on user creation date...');
    const userCreatedAt = new Date(user.created_at || Date.now());
    const trialEndDate = new Date(userCreatedAt);
    trialEndDate.setDate(trialEndDate.getDate() + 90);
    
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
          productId: "prod_S1W7TUjrYkLT1I" // Pass the product ID to the function
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

      // Return the URL rather than redirecting here
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
  };

  console.log('SubscriptionProvider state before render:', value);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionProvider;
