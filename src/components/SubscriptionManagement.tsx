
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSubscription } from '@/context/SubscriptionContext';
import { toast } from 'sonner';
import { CalendarX } from 'lucide-react';
import { format } from 'date-fns';

const SubscriptionManagement = () => {
  const { 
    subscription, 
    cancelSubscription, 
    isCancelling,
    hasAccess,
    isInTrialPeriod
  } = useSubscription();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancelSubscription = async () => {
    setError(null);
    try {
      const success = await cancelSubscription();
      if (success) {
        setShowCancelDialog(false);
        toast.success('Subscription canceled successfully');
      } else {
        setError('Failed to cancel subscription. Please try again later.');
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError('An unexpected error occurred. Please try again later.');
    }
  };

  // Check if subscription is scheduled for cancellation
  const isPendingCancellation = subscription?.status === 'active' && subscription?.cancel_at;

  // Format date for display
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'MMMM d, yyyy');
  };

  // Check if subscription can be canceled - now also includes trialing state
  const canCancelSubscription = subscription && 
    (subscription.status === 'active' || subscription.status === 'trialing');

  // Don't show anything if user doesn't have access
  if (!hasAccess) {
    return null;
  }

  return (
    <>
      <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="text-lg font-medium mb-2">Manage Subscription</h3>
        
        {isPendingCancellation ? (
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
            <CalendarX className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Subscription Cancellation Scheduled</p>
              <p className="text-sm">
                Your subscription will remain active until {formatDate(subscription.cancel_at)}, after which it will be canceled.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {subscription?.status === 'trialing' 
                ? 'Cancel your trial subscription' 
                : 'Cancel your current subscription'}
            </p>
            {canCancelSubscription && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setShowCancelDialog(true)}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              {subscription?.status === 'trialing'
                ? 'Are you sure you want to cancel your subscription? You will lose access at the end of your 30-day trial and will not be charged.'
                : `Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.`}
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionManagement;
