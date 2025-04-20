
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertCircle, Bug, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RawSubscriptionData {
  id: string;
  user_id: string;
  status: string | null;
  trial_end_date: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
  stripe_subscription_id: string;
}

const UserSubscriptionsDebugging = () => {
  const [subscriptions, setSubscriptions] = useState<RawSubscriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionsDirectly = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Directly query the user_subscriptions table
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to fetch subscription data: ${error.message}`);
      }
      
      console.log(`Found ${data.length} raw subscription records`);
      
      // Log details about trial_end_date values
      const withTrialEndDate = data.filter(sub => sub.trial_end_date).length;
      console.log(`Subscriptions with trial_end_date: ${withTrialEndDate}/${data.length}`);
      
      if (data.length > 0) {
        console.log('First subscription record:', data[0]);
        
        // Check if trial_end_date is properly formatted
        data.forEach(sub => {
          if (sub.trial_end_date) {
            try {
              const date = new Date(sub.trial_end_date);
              const isValid = !isNaN(date.getTime());
              console.log(`User ${sub.user_id}: trial_end_date=${sub.trial_end_date}, valid=${isValid}`);
            } catch (err) {
              console.error(`Invalid date format for user ${sub.user_id}:`, sub.trial_end_date);
            }
          }
        });
      }
      
      setSubscriptions(data);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionsDirectly();
  }, []);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return `Invalid (${dateString})`;
      }
      return date.toLocaleString();
    } catch (err) {
      return `Error (${dateString})`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bug className="mr-2 h-5 w-5 text-amber-500" />
          Raw Subscription Data Debugging
        </CardTitle>
        <CardDescription>
          Direct database query of user_subscriptions table
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSubscriptionsDirectly}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Raw Data
          </Button>
        </div>
        
        {loading ? (
          <div className="py-4 text-center">Loading subscription data...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial End Date</TableHead>
                  <TableHead>Current Period End</TableHead>
                  <TableHead>Created At</TableHead>
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          subscription.status === 'active' ? 'bg-green-100 text-green-800' : 
                          subscription.status === 'trialing' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {subscription.status || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                          {subscription.trial_end_date || 'null'}
                        </code>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(subscription.trial_end_date)}
                        </div>
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

export default UserSubscriptionsDebugging;
