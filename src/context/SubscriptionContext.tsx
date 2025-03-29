
import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const checkSubscription = async () => {
    if (!user || !session) {
      console.log('No user or session, setting hasAccess to false');
      setHasAccess(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Checking subscription for user:', user.id);
      
      // First try to get subscription directly from database
      const { data: subscriptionData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (subError) {
        console.error('Error checking local subscription:', subError);
      } else {
        console.log('Subscription data from database:', subscriptionData);
      }
      
      // If we have a subscription record with active or trialing status, grant access immediately
      if (subscriptionData && ['active', 'trialing'].includes(subscriptionData.status)) {
        console.log('Found active subscription in database:', subscriptionData);
        setHasAccess(true);
        setSubscription({
          id: subscriptionData.stripe_subscription_id,
          status: subscriptionData.status as SubscriptionStatus,
          currentPeriodEnd: subscriptionData.current_period_end,
        });
        setIsInTrialPeriod(subscriptionData.status === 'trialing');
        setIsLoading(false);
        return;
      }

      // If no valid subscription was found in the database or we need to validate with Stripe,
      // call the check-subscription function
      try {
        console.log('Calling check-subscription function with token:', session.access_token.substring(0, 10) + '...');
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error('Error calling check-subscription function:', error);
          // Fall back to user creation date for trial check if we can't reach the function
          handleTrialFallback();
          return;
        }

        console.log('Subscription check result from edge function:', data);
        
        // Important: Set hasAccess first to ensure state is updated properly
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
      } catch (error) {
        console.error('Error checking subscription:', error);
        // Fall back to user creation date for trial check
        handleTrialFallback();
      }
    } catch (error) {
      console.error('Error in checkSubscription:', error);
      handleTrialFallback();
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback to calculate trial based on user creation date if Stripe check fails
  const handleTrialFallback = () => {
    if (!user) return;
    
    const userCreatedAt = new Date(user.created_at || Date.now());
    const trialEndDate = new Date(userCreatedAt);
    trialEndDate.setDate(trialEndDate.getDate() + 90); // 90-day trial
    
    const now = new Date();
    const isInTrialPeriod = now < trialEndDate;
    
    setHasAccess(isInTrialPeriod);
    setIsInTrialPeriod(isInTrialPeriod);
    setTrialDaysLeft(Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    setTrialEndDate(trialEndDate.toISOString());
    setSubscription(null);
  };

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

  useEffect(() => {
    if (user) {
      console.log('User logged in, checking subscription');
      checkSubscription();
    } else {
      console.log('No user, setting hasAccess to false');
      setHasAccess(false);
      setIsLoading(false);
    }
  }, [user, session]);

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

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionProvider;
