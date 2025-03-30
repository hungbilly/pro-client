
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ShieldAlert, ShieldCheck, User, UserCheck, Lock, Unlock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Profile {
  id: string;
  email: string;
  is_admin: boolean;
  last_sign_in_at: string;
  created_at: string;
  updated_at: string;
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

interface JoinedUserData {
  id: string;
  email: string;
  is_admin: boolean;
  subscription_status: string | null;
  subscription_end: string | null;
  trial_end: string | null;
}

const Debug = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [joinedData, setJoinedData] = useState<JoinedUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rlsEnabled, setRlsEnabled] = useState<boolean>(true);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    // Redirect if not admin
    if (!isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }

    fetchData();
    checkRlsStatus();
  }, [isAdmin, navigate]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;
      
      // Fetch subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('*');
      
      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError);
        toast.error('Could not fetch subscription data. RLS might be preventing access.');
      }
      
      // Set the fetched data
      setProfiles(profilesData || []);
      setSubscriptions(subscriptionsData || []);
      
      // Join the data for the combined view
      const joined = (profilesData || []).map(profile => {
        const subscription = (subscriptionsData || []).find(s => s.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email || 'No email',
          is_admin: profile.is_admin || false,
          subscription_status: subscription?.status || null,
          subscription_end: subscription?.current_period_end || null,
          trial_end: subscription?.trial_end_date || null
        };
      });
      
      setJoinedData(joined);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load debug data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const toggleRls = async () => {
    setToggleLoading(true);

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('toggle-rls-for-subscriptions', { 
        body: { enable_rls: !rlsEnabled }
      });
      
      if (error) throw error;
      
      setRlsEnabled(!rlsEnabled);
      toast.success(`RLS ${!rlsEnabled ? 'enabled' : 'disabled'} for user_subscriptions table`);
      
      // Refresh data after toggling RLS
      await fetchData();
    } catch (err) {
      console.error('Error toggling RLS:', err);
      toast.error('Failed to toggle RLS');
    } finally {
      setToggleLoading(false);
      setLoading(false);
    }
  };

  const checkRlsStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-rls-status');
      
      if (error) throw error;
      
      if (data !== null && data !== undefined) {
        setRlsEnabled(!!data.is_enabled);
      }
    } catch (err) {
      console.error('Error checking RLS status:', err);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <ShieldAlert className="mr-3 h-10 w-10 text-red-600" />
          <h1 className="text-3xl font-bold">Debug Console</h1>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline"
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      <Alert className="mb-6">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Admin Only Area</AlertTitle>
        <AlertDescription>
          This page shows debug information about users and subscriptions.
        </AlertDescription>
      </Alert>

      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Row Level Security Status</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <Badge variant={rlsEnabled ? "default" : "destructive"} className="mr-2">
              {rlsEnabled ? "Enabled" : "Disabled"}
            </Badge>
            {rlsEnabled ? 
              <ShieldCheck className="h-5 w-5 text-green-500" /> : 
              <ShieldAlert className="h-5 w-5 text-red-500" />
            }
          </div>
          <Button 
            onClick={toggleRls} 
            variant={rlsEnabled ? "destructive" : "default"}
            disabled={toggleLoading}
            className="flex items-center gap-2"
          >
            {rlsEnabled ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {toggleLoading ? 'Processing...' : (rlsEnabled ? 'Disable RLS' : 'Enable RLS')}
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            User Profiles
          </CardTitle>
          <CardDescription>
            Data from the profiles table
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">Loading...</TableCell>
                  </TableRow>
                ) : profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">No profiles found</TableCell>
                  </TableRow>
                ) : (
                  profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-mono text-xs">{profile.id}</TableCell>
                      <TableCell>{profile.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={profile.is_admin ? "default" : "secondary"}>
                          {profile.is_admin ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(profile.last_sign_in_at)}</TableCell>
                      <TableCell>{formatDate(profile.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <UserCheck className="mr-2 h-5 w-5" />
              User Subscriptions
            </CardTitle>
            <Badge variant={rlsEnabled ? "default" : "destructive"} className="ml-2">
              RLS: {rlsEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <CardDescription>
            Data from the user_subscriptions table - {subscriptions.length} records found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Subscription ID</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Trial End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">Loading...</TableCell>
                  </TableRow>
                ) : subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No subscriptions found
                      {rlsEnabled && (
                        <div className="text-amber-600 text-sm mt-2">
                          RLS is enabled. This might be preventing you from seeing the data.
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-mono text-xs">{subscription.user_id}</TableCell>
                      <TableCell>
                        <Badge variant={
                          subscription.status === 'active' ? "success" : 
                          subscription.status === 'trialing' ? "warning" : 
                          "destructive"
                        }>
                          {subscription.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{subscription.stripe_customer_id.substring(0, 10)}...</TableCell>
                      <TableCell className="font-mono text-xs">{subscription.stripe_subscription_id.substring(0, 10)}...</TableCell>
                      <TableCell>{formatDate(subscription.current_period_end)}</TableCell>
                      <TableCell>{formatDate(subscription.trial_end_date)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Combined User Data
          </CardTitle>
          <CardDescription>
            Joined view of profiles and subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Subscription Status</TableHead>
                  <TableHead>Subscription End</TableHead>
                  <TableHead>Trial End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">Loading...</TableCell>
                  </TableRow>
                ) : joinedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">No joined data found</TableCell>
                  </TableRow>
                ) : (
                  joinedData.map((data) => (
                    <TableRow key={data.id}>
                      <TableCell>{data.email}</TableCell>
                      <TableCell>
                        <Badge variant={data.is_admin ? "default" : "secondary"}>
                          {data.is_admin ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {data.subscription_status ? (
                          <Badge variant={
                            data.subscription_status === 'active' ? "success" : 
                            data.subscription_status === 'trialing' ? "warning" : 
                            "destructive"
                          }>
                            {data.subscription_status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">None</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(data.subscription_end)}</TableCell>
                      <TableCell>{formatDate(data.trial_end)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Debug;
