
import React, { useState, useEffect } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { CalendarClock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const TrialBanner: React.FC = () => {
  const { isInTrialPeriod, trialDaysLeft, trialEndDate, subscription } = useSubscription();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Check local storage for dismissed state on component mount
  useEffect(() => {
    const today = new Date().toDateString();
    const dismissed = localStorage.getItem(`trial_banner_dismissed_${today}`);
    setIsDismissed(!!dismissed);
  }, []);
  
  const handleDismiss = () => {
    const today = new Date().toDateString();
    localStorage.setItem(`trial_banner_dismissed_${today}`, 'true');
    setIsDismissed(true);
  };
  
  // Don't show for active subscriptions or if dismissed
  if (!isInTrialPeriod || subscription?.status === 'active' || isDismissed || trialDaysLeft <= 0) {
    return null;
  }
  
  const urgencyClass = 
    trialDaysLeft <= 3 ? 'bg-red-500' : 
    trialDaysLeft <= 7 ? 'bg-orange-500' : 
    'bg-blue-500';
  
  const formattedDate = trialEndDate ? format(new Date(trialEndDate), 'MMMM d, yyyy') : 'soon';

  return (
    <div className={`w-full ${urgencyClass} text-white py-2 px-4`}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          <span className="text-sm font-medium">
            Your trial ends in <strong>{trialDaysLeft} days</strong> ({formattedDate})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-white border-white hover:bg-white/20 h-7"
            onClick={() => navigate('/subscription')}
          >
            Upgrade Now
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-white hover:bg-white/20 p-1 h-7 w-7"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TrialBanner;
