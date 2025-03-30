
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, User, AlertTriangle } from 'lucide-react';
import { supabase, handleDeadlockError } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface UserSubscription {
  id: string;
  user_id: string;
  status: string | null;
  trial_end_date: string | null;
  current_period_end: string | null;
  created_at: string;
}

const UserSubscriptionsTable = () => {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          .select('*');
        
        if (error) throw error;
        return data || [];
      });
      
      setSubscriptions(data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setError(`Failed to load subscription data: ${error.message || 'Unknown error'}`);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>User Subscriptions</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSubscriptions} 
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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

        {loading ? (
          <div className="py-4 text-center">Loading subscriptions data...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial End</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No subscription records found
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-mono text-xs">
                        {subscription.user_id.substring(0, 8)}...
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
