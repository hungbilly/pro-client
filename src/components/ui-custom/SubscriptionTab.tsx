
import React from 'react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/context/SubscriptionContext';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface SubscriptionTabProps {
  onClose: () => void;
}

const SubscriptionTab: React.FC<SubscriptionTabProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { 
    subscription, 
    isInTrialPeriod, 
    trialDaysLeft, 
    trialEndDate,
    cancelSubscription,
    isCancelling
  } = useSubscription();

  const handleCancelSubscription = async () => {
    const success = await cancelSubscription();
    if (success) {
      // Tab switching will be handled by parent component
    }
  };

  const getSubscriptionStatus = () => {
    if (subscription?.status === 'active') {
      return {
        label: 'Active Subscription',
        description: `Your subscription is active until ${format(new Date(subscription.currentPeriodEnd), 'MMMM d, yyyy')}`,
        className: 'bg-green-50 border-green-200',
        textClass: 'text-green-700'
      };
    } 
    
    if (isInTrialPeriod && trialDaysLeft > 0) {
      return {
        label: 'Trial Period',
        description: `Your trial ends in ${trialDaysLeft} days (${trialEndDate ? format(new Date(trialEndDate), 'MMMM d, yyyy') : 'soon'})`,
        className: 'bg-amber-50 border-amber-200',
        textClass: 'text-amber-700'
      };
    }
    
    return {
      label: 'No Active Subscription',
      description: 'Subscribe to access all premium features',
      className: 'bg-gray-50 border-gray-200',
      textClass: 'text-gray-700'
    };
  };

  const status = getSubscriptionStatus();

  return (
    <div className="py-4 space-y-4">
      <div className={`border rounded-md p-4 ${status.className}`}>
        <h3 className={`text-lg font-medium ${status.textClass}`}>{status.label}</h3>
        <p className={`text-sm ${status.textClass}`}>{status.description}</p>
      </div>
      
      <div className="space-y-4">
        {subscription?.status === 'active' ? (
          <Button
            variant="destructive"
            onClick={handleCancelSubscription}
            disabled={isCancelling}
          >
            {isCancelling ? 'Processing...' : 'Cancel Subscription'}
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={() => {
              onClose();
              navigate('/subscription');
            }}
          >
            View Subscription Plans
          </Button>
        )}
        
        <div>
          <p className="text-sm text-muted-foreground">
            {subscription?.status === 'active' 
              ? 'Your subscription will continue until the end of the current billing period.'
              : 'Upgrade to premium to access all features.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionTab;
