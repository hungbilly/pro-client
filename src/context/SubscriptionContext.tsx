
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
      setHasAccess(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        setHasAccess(false);
      } else {
        setHasAccess(data.hasAccess);
        setSubscription(data.subscription);
        setIsInTrialPeriod(data.isInTrialPeriod);
        setTrialDaysLeft(data.trialDaysLeft);
        setTrialEndDate(data.trialEndDate);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const createSubscription = async (withTrial: boolean = true): Promise<string | null> => {
    if (!user || !session) {
      toast.error('You must be logged in to subscribe');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { withTrial },
      });

      if (error) {
        console.error('Error creating subscription:', error);
        toast.error('Failed to create subscription');
        return null;
      }

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
      checkSubscription();
    } else {
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
