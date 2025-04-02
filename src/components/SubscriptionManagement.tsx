
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSubscription } from '@/context/SubscriptionContext';
import { toast } from 'sonner';

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

  if (!hasAccess || isInTrialPeriod) {
    return null;
  }

  return (
    <>
      <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="text-lg font-medium mb-2">Manage Subscription</h3>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Cancel your current subscription</p>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setShowCancelDialog(true)}
            disabled={isCancelling}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
          </Button>
        </div>
      </div>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.
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
