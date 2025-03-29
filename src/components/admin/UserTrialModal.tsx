
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, parseISO, addDays } from 'date-fns';
import { Loader } from 'lucide-react';

interface User {
  id: string;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  status: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  current_period_end: string;
  trial_end_date: string | null;
  created_at: string;
}

interface UserTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User & { subscription?: Subscription };
  onTrialUpdated: (userId: string, trialEndDate: string, daysAdded: number) => void;
}

const UserTrialModal: React.FC<UserTrialModalProps> = ({
  isOpen,
  onClose,
  user,
  onTrialUpdated
}) => {
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  
  const handleUpdateTrial = async () => {
    if (!days || days <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid number of days greater than 0.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Call the database function to set the trial end date
      const { data, error } = await supabase.rpc('set_user_trial_end_date', {
        user_id: user.id,
        days_from_now: days
      });
      
      if (error) throw error;
      
      // Format the returned timestamp for display
      const formattedDate = format(parseISO(data), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');
      
      // Call the callback to update UI
      onTrialUpdated(user.id, formattedDate, days);
      onClose();
      
    } catch (error: any) {
      console.error('Error updating trial period:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update trial period",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate current trial end date
  const getCurrentTrialEnd = () => {
    if (user.subscription?.trial_end_date) {
      return format(parseISO(user.subscription.trial_end_date), 'MMMM d, yyyy');
    }
    
    // Default 90-day trial from account creation
    const trialEnd = addDays(new Date(user.created_at), 90);
    return format(trialEnd, 'MMMM d, yyyy');
  };
  
  // Calculate the new end date based on current input
  const getNewTrialEnd = () => {
    const newDate = addDays(new Date(), days);
    return format(newDate, 'MMMM d, yyyy');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modify Trial Period</DialogTitle>
          <DialogDescription>
            Update the trial period for user ID: {user.id.substring(0, 8)}...
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Current Trial End</Label>
            <div className="p-2 bg-muted rounded text-sm">
              {getCurrentTrialEnd()}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="days">Add Days from Today</Label>
            <Input
              id="days"
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 0)}
            />
            <div className="text-sm text-muted-foreground">
              New end date: {getNewTrialEnd()}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpdateTrial} disabled={loading}>
            {loading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Trial'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserTrialModal;
