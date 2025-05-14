
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/context/SubscriptionContext';
import { CalendarClock, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from 'date-fns';

export const SubscriptionStatusBadge = () => {
  const { subscription, isInTrialPeriod, trialDaysLeft, trialEndDate } = useSubscription();
  
  if (subscription?.status === 'active') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="success" className="ml-2 flex items-center gap-1">
              <span>Premium</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Active paid subscription</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (isInTrialPeriod && trialDaysLeft > 0) {
    const formattedDate = trialEndDate ? format(new Date(trialEndDate), 'MMM d, yyyy') : 'soon';
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="warning" className="ml-2 flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              <span>Trial: {trialDaysLeft}d</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Your trial ends on {formattedDate}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="destructive" className="ml-2 flex items-center gap-1">
            <Info className="w-3 h-3" />
            <span>No Subscription</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Please subscribe to continue using all features</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Create a default export component that uses SubscriptionStatusBadge
const SubscriptionStatus = () => {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center">
        <span className="font-medium">Current Status:</span>
        <SubscriptionStatusBadge />
      </div>
    </div>
  );
};

export default SubscriptionStatus;
