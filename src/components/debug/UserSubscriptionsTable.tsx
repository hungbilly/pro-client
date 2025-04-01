import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, User, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase, handleDeadlockError } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';

interface UserSubscription {
  id: string;
  user_id: string;
  status: string | null;
  trial_end_date: string | null;
  current_period_end: string | null;
  created_at: string;
  stripe_subscription_id: string;
}

const UserSubscriptionsTable = () => {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [duplicates, setDuplicates] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the deadlock handling utility
      const data = await handleDeadlockError(async () => {
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      });
      
      setSubscriptions(data);

      // Check for duplicates
      const userSubscriptions: {[key: string]: number} = {};
      data.forEach((sub: UserSubscription) => {
        if (!userSubscriptions[sub.user_id]) {
          userSubscriptions[sub.user_id] = 1;
        } else {
          userSubscriptions[sub.user_id]++;
        }
      });

      // Filter to only users with more than one subscription
      const duplicatesOnly = Object.entries(userSubscriptions)
        .filter(([_, count]) => count > 1)
        .reduce((acc, [userId, count]) => {
          acc[userId] = count;
          return acc;
        }, {} as {[key: string]: number});

      setDuplicates(duplicatesOnly);
      
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setError(`Failed to load subscription data: ${error.message || 'Unknown error'}`);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const cleanupDuplicates = async () => {
    if (!isAdmin) {
      toast.error('Only admins can perform this operation');
      return;
    }

    try {
      setCleaningUp(true);
      
      // Get all user IDs with duplicates
      const userIds = Object.keys(duplicates);
      
      for (const userId of userIds) {
        // Get all subscriptions for this user
        const { data: userSubs } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (!userSubs || userSubs.length <= 1) continue;
        
        // Keep the newest subscription (first one due to desc ordering)
        const [keep, ...duplicatesToRemove] = userSubs;
        
        // Delete all but the most recent one
        if (duplicatesToRemove.length > 0) {
          const idsToRemove = duplicatesToRemove.map(sub => sub.id);
          
          const { error: deleteError } = await supabase
            .from('user_subscriptions')
            .delete()
            .in('id', idsToRemove);
          
          if (deleteError) {
            throw deleteError;
          }
          
          console.log(`Removed ${idsToRemove.length} duplicate subscriptions for user ${userId}`);
        }
      }
      
      toast.success('Duplicate subscriptions have been removed');
      fetchSubscriptions(); // Refresh the list
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      toast.error(`Failed to clean up duplicates: ${error.message}`);
    } finally {
      setCleaningUp(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const duplicateCount = Object.values(duplicates).reduce((total, count) => total + count, 0) - Object.keys(duplicates).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>User Subscriptions</span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSubscriptions} 
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {duplicateCount > 0 && isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={cleanupDuplicates}
                disabled={cleaningUp}
              >
                <Trash2 className={`mr-2 h-4 w-4`} />
                Clean Duplicates ({duplicateCount})
              </Button>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          View all subscription records in the database
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {duplicateCount > 0 && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Duplicate Subscriptions Detected</AlertTitle>
            <AlertDescription>
              Found {duplicateCount} duplicate subscription records across {Object.keys(duplicates).length} users. 
              Use the "Clean Duplicates" button to keep only the most recent subscription for each user.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="py-4 text-center">Loading subscriptions data...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Subscription ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial End</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No subscription records found
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((subscription) => (
                    <TableRow 
                      key={subscription.id}
                      className={duplicates[subscription.user_id] > 1 ? "bg-amber-50" : ""}
                    >
                      <TableCell className="font-mono text-xs">
                        {subscription.user_id.substring(0, 8)}...
                        {duplicates[subscription.user_id] > 1 && (
                          <Badge variant="warning" className="ml-2">
                            {duplicates[subscription.user_id]} records
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {subscription.stripe_subscription_id?.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            subscription.status === 'active' ? 'success' : 
                            subscription.status === 'trialing' ? 'warning' : 'default'
                          }
                        >
                          {subscription.status || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(subscription.trial_end_date)}
                      </TableCell>
                      <TableCell>
                        {formatDate(subscription.current_period_end)}
                      </TableCell>
                      <TableCell>
                        {formatDate(subscription.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserSubscriptionsTable;
