
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Database, RefreshCw, User, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string | null;
  is_admin: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  last_sign_in_at: string | null;
}

interface UserSubscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  current_period_end: string;
  trial_end_date: string | null;
  created_at: string;
  updated_at: string;
}

const DebugPage = () => {
  const { user, isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rlsEnabled, setRlsEnabled] = useState<boolean>(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        throw new Error(`Profiles error: ${profilesError.message}`);
      }
      
      // Fetch user subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (subscriptionsError) {
        throw new Error(`Subscriptions error: ${subscriptionsError.message}`);
      }
      
      setProfiles(profilesData || []);
      setSubscriptions(subscriptionsData || []);
    } catch (err) {
      console.error('Error fetching debug data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast.error('Failed to load debug data');
    } finally {
      setLoading(false);
    }
  };

  const toggleRls = async () => {
    if (!isAdmin) {
      toast.error('Only admins can toggle RLS');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('toggle-rls-for-subscriptions', { 
        body: { enable_rls: !rlsEnabled }
      });
      
      if (error) throw error;
      
      setRlsEnabled(!rlsEnabled);
      toast.success(`RLS ${!rlsEnabled ? 'enabled' : 'disabled'} for user_subscriptions table`);
      
      // Refetch data
      await fetchData();
    } catch (err) {
      console.error('Error toggling RLS:', err);
      toast.error('Failed to toggle RLS. Make sure the database function exists.');
    } finally {
      setLoading(false);
    }
  };

  const checkRlsStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-rls-status', {
        body: { table: 'user_subscriptions' }
      });
      
      if (error) throw error;
      
      if (data !== null && data !== undefined) {
        setRlsEnabled(!!data.is_enabled);
      }
    } catch (err) {
      console.error('Error checking RLS status:', err);
    }
  };

  useEffect(() => {
    fetchData();
    checkRlsStatus();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getSubscriptionForUser = (userId: string) => {
    return subscriptions.find(sub => sub.user_id === userId);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <Database className="mr-3 h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Database Debug</h1>
        </div>
        <div className="flex space-x-2">
          {isAdmin && (
            <Button 
              onClick={toggleRls} 
              variant={rlsEnabled ? "destructive" : "default"}
              className="flex items-center"
              disabled={loading}
            >
              {rlsEnabled ? (
                <><Unlock className="mr-2 h-4 w-4" /> Disable RLS</>
              ) : (
                <><Lock className="mr-2 h-4 w-4" /> Enable RLS</>
              )}
            </Button>
          )}
          <Button 
            onClick={fetchData} 
            variant="outline" 
            className="flex items-center"
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-8 border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-700">
              <AlertCircle className="mr-2 h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="profiles" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="profiles" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            Profiles ({profiles.length})
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center">
            <Database className="mr-2 h-4 w-4" />
            Subscriptions ({subscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="combined" className="flex items-center">
            Combined View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles">
          <Card>
            <CardHeader>
              <CardTitle>Profiles Table</CardTitle>
              <CardDescription>
                All user profiles in the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-4 text-center">Loading profiles data...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Updated At</TableHead>
                        <TableHead>Last Sign In</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4">
                            No profiles found
                          </TableCell>
                        </TableRow>
                      ) : (
                        profiles.map((profile) => (
                          <TableRow key={profile.id} className={user?.id === profile.id ? 'bg-blue-50' : ''}>
                            <TableCell className="font-mono text-xs">
                              {profile.id}
                              {user?.id === profile.id && (
                                <Badge className="ml-2 bg-blue-500">You</Badge>
                              )}
                            </TableCell>
                            <TableCell>{profile.email || 'N/A'}</TableCell>
                            <TableCell>
                              {profile.is_admin ? (
                                <Badge className="bg-purple-500">Admin</Badge>
                              ) : (
                                <Badge variant="outline">User</Badge>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(profile.created_at)}</TableCell>
                            <TableCell>{formatDate(profile.updated_at)}</TableCell>
                            <TableCell>{formatDate(profile.last_sign_in_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>User Subscriptions Table</CardTitle>
              <CardDescription>
                All user subscription records in the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-4 text-center">Loading subscription data...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Customer ID</TableHead>
                        <TableHead>Subscription ID</TableHead>
                        <TableHead>Period End</TableHead>
                        <TableHead>Trial End</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-4">
                            No subscriptions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        subscriptions.map((subscription) => (
                          <TableRow key={subscription.id} className={user?.id === subscription.user_id ? 'bg-blue-50' : ''}>
                            <TableCell className="font-mono text-xs">{subscription.id}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {subscription.user_id}
                              {user?.id === subscription.user_id && (
                                <Badge className="ml-2 bg-blue-500">You</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                subscription.status === 'active' ? 'bg-green-500' : 
                                subscription.status === 'trialing' ? 'bg-blue-500' :
                                'bg-gray-500'
                              }>
                                {subscription.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs max-w-[150px] truncate">
                              {subscription.stripe_customer_id}
                            </TableCell>
                            <TableCell className="font-mono text-xs max-w-[150px] truncate">
                              {subscription.stripe_subscription_id}
                            </TableCell>
                            <TableCell>{formatDate(subscription.current_period_end)}</TableCell>
                            <TableCell>{formatDate(subscription.trial_end_date)}</TableCell>
                            <TableCell>{formatDate(subscription.created_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="combined">
          <Card>
            <CardHeader>
              <CardTitle>Combined User & Subscription View</CardTitle>
              <CardDescription>
                Showing users with their subscription status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-4 text-center">Loading data...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>User Created</TableHead>
                        <TableHead>Subscription Status</TableHead>
                        <TableHead>Trial End</TableHead>
                        <TableHead>Period End</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        profiles.map((profile) => {
                          const subscription = getSubscriptionForUser(profile.id);
                          return (
                            <TableRow key={profile.id} className={user?.id === profile.id ? 'bg-blue-50' : ''}>
                              <TableCell>
                                {profile.email || 'N/A'}
                                {user?.id === profile.id && (
                                  <Badge className="ml-2 bg-blue-500">You</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {profile.is_admin ? (
                                  <Badge className="bg-purple-500">Admin</Badge>
                                ) : (
                                  <Badge variant="outline">User</Badge>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(profile.created_at)}</TableCell>
                              <TableCell>
                                {subscription ? (
                                  <Badge className={
                                    subscription.status === 'active' ? 'bg-green-500' : 
                                    subscription.status === 'trialing' ? 'bg-blue-500' :
                                    'bg-gray-500'
                                  }>
                                    {subscription.status}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">No Subscription</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {subscription?.trial_end_date ? formatDate(subscription.trial_end_date) : 'N/A'}
                              </TableCell>
                              <TableCell>
                                {subscription?.current_period_end ? formatDate(subscription.current_period_end) : 'N/A'}
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DebugPage;
