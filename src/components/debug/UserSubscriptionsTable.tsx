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

      // Check for duplicates by stripe_subscription_id
      const subIdMap: {[key: string]: number} = {};
      data.forEach((sub: UserSubscription) => {
        if (sub.stripe_subscription_id) {
          if (!subIdMap[sub.stripe_subscription_id]) {
            subIdMap[sub.stripe_subscription_id] = 1;
          } else {
            subIdMap[sub.stripe_subscription_id]++;
          }
        }
      });

      // Filter to only subscription IDs with more than one record
      const duplicateSubIds = Object.entries(subIdMap)
        .filter(([_, count]) => count > 1)
        .reduce((acc, [subId, count]) => {
          acc[subId] = count;
          return acc;
        }, {} as {[key: string]: number});

      // Also check for users with multiple active subscriptions
      const userSubscriptions: {[key: string]: number} = {};
      data.forEach((sub: UserSubscription) => {
        if (sub.status === 'active') {
          if (!userSubscriptions[sub.user_id]) {
            userSubscriptions[sub.user_id] = 1;
          } else {
            userSubscriptions[sub.user_id]++;
          }
        }
      });

      // Filter to only users with more than one active subscription
      const usersWithMultipleActive = Object.entries(userSubscriptions)
        .filter(([_, count]) => count > 1)
        .reduce((acc, [userId, count]) => {
          acc[userId] = count;
          return acc;
        }, {} as {[key: string]: number});

      // Combine both types of duplicates
      setDuplicates({...duplicateSubIds, ...usersWithMultipleActive});
      
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
      
      // Instead of using GROUP BY in SQL, we'll fetch all records and process them in JavaScript
      const { data: allSubscriptions, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (fetchError) {
        throw fetchError;
      }
      
      // Find duplicate subscription IDs
      const subIdMap: {[key: string]: UserSubscription[]} = {};
      allSubscriptions.forEach((sub: UserSubscription) => {
        if (sub.stripe_subscription_id) {
          if (!subIdMap[sub.stripe_subscription_id]) {
            subIdMap[sub.stripe_subscription_id] = [sub];
          } else {
            subIdMap[sub.stripe_subscription_id].push(sub);
          }
        }
      });
      
      // Process each group of duplicates
      for (const [subId, subs] of Object.entries(subIdMap)) {
        if (subs.length <= 1) continue;
        
        console.log(`Found ${subs.length} duplicates for subscription ${subId}`);
        
        // Keep the newest record, delete the rest
        const [keep, ...duplicatesToRemove] = subs;
        
        if (duplicatesToRemove.length > 0) {
          const idsToRemove = duplicatesToRemove.map(sub => sub.id);
          
          console.log(`Keeping record ${keep.id} for subscription ${subId} and removing ${idsToRemove.length} duplicates`);
          
          const { error: deleteError } = await supabase
            .from('user_subscriptions')
            .delete()
            .in('id', idsToRemove);
            
          if (deleteError) {
            console.error(`Error deleting duplicate records for ${subId}:`, deleteError);
          }
        }
      }
      
      // Find users with multiple active subscriptions
      const userActiveSubsMap: {[key: string]: UserSubscription[]} = {};
      allSubscriptions.forEach((sub: UserSubscription) => {
        if (sub.status === 'active') {
          if (!userActiveSubsMap[sub.user_id]) {
            userActiveSubsMap[sub.user_id] = [sub];
          } else {
            userActiveSubsMap[sub.user_id].push(sub);
          }
        }
      });
      
      // Process each user with multiple active subscriptions
      for (const [userId, activeSubs] of Object.entries(userActiveSubsMap)) {
        if (activeSubs.length <= 1) continue;
        
        console.log(`Found ${activeSubs.length} active subscriptions for user ${userId}`);
        
        // Keep the newest active subscription, update the rest to inactive
        const [keep, ...subsToUpdate] = activeSubs;
        
        if (subsToUpdate.length > 0) {
          const idsToUpdate = subsToUpdate.map(sub => sub.id);
          
          console.log(`Keeping active subscription ${keep.id} for user ${userId} and marking ${idsToUpdate.length} others as inactive`);
          
          for (const id of idsToUpdate) {
            const { error: updateError } = await supabase
              .from('user_subscriptions')
              .update({ status: 'inactive' })
              .eq('id', id);
              
            if (updateError) {
              console.error(`Error updating subscription ${id} to inactive:`, updateError);
            }
          }
        }
      }
      
      toast.success('Duplicate subscriptions have been cleaned up');
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
              Found {duplicateCount} duplicate subscription records. 
              These may include duplicate stripe_subscription_id values or users with multiple active subscriptions.
              Use the "Clean Duplicates" button to resolve these issues.
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
                  subscriptions.map((subscription) => {
                    // Check if this is a duplicate record (either by subscription ID or user with multiple active)
                    const isDuplicate = subscription.stripe_subscription_id && 
                      duplicates[subscription.stripe_subscription_id] > 1 || 
                      (subscription.status === 'active' && duplicates[subscription.user_id] > 1);
                      
                    return (
                      <TableRow 
                        key={subscription.id}
                        className={isDuplicate ? "bg-amber-50" : ""}
                      >
                        <TableCell className="font-mono text-xs">
                          {subscription.user_id.substring(0, 8)}...
                          {subscription.status === 'active' && duplicates[subscription.user_id] > 1 && (
                            <Badge variant="warning" className="ml-2">
                              {duplicates[subscription.user_id]} active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {subscription.stripe_subscription_id?.substring(0, 8)}...
                          {subscription.stripe_subscription_id && duplicates[subscription.stripe_subscription_id] > 1 && (
                            <Badge variant="warning" className="ml-2">
                              {duplicates[subscription.stripe_subscription_id]} duplicates
                            </Badge>
                          )}
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
                    );
                  })
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
