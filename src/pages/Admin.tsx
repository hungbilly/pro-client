
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import UserSubscriptionsDebugging from '@/components/debug/UserSubscriptionsDebugging';
import { Input } from "@/components/ui/input";
import UserSelector from '@/components/admin/UserSelector';
import UserDataTabs from '@/components/admin/UserDataTabs';

interface UserSubscription {
  id: string;
  email: string;
  status: string | null;
  trialEndDate: string | null;
  isActive: boolean;
  createdAt: string;
  isAdmin: boolean;
}

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState<number>(90);
  const [trialSettingsLoading, setTrialSettingsLoading] = useState(true);
  const [savingTrialDays, setSavingTrialDays] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No active session');
        }

        console.log('Fetching users with admin edge function...');
        
        const { data, error } = await supabase.functions.invoke('admin-get-users', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }

        if (!data || !data.users) {
          console.error('Invalid response data:', data);
          throw new Error('Invalid response from server');
        }

        console.log(`Received ${data.users.length} users from admin-get-users`);
        
        if (data.users.length > 0) {
          console.log('Sample user data:', data.users[0]);
        }

        const usersWithTrials = data.users.filter(user => user.trialEndDate);
        console.log(`Found ${usersWithTrials.length} users with trial end dates`);
        
        data.users.forEach((user: any) => {
          console.log(`User ${user.email}: trialEndDate=${user.trialEndDate || 'null'}, status=${user.status || 'null'}`);
        });

        setUsers(data.users || []);
      } catch (error: any) {
        console.error('Error fetching users:', error);
        setFetchError(error.message || 'Failed to load user data');
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAdmin, navigate]);

  useEffect(() => {
    const loadTrialSettings = async () => {
      setTrialSettingsLoading(true);
      const { data, error } = await supabase
        .from("admin_settings")
        .select("default_trial_days")
        .limit(1)
        .single();
      if (data && typeof data.default_trial_days === "number") {
        setTrialDays(data.default_trial_days);
      }
      setTrialSettingsLoading(false);
    };
    if (isAdmin) loadTrialSettings();
  }, [isAdmin]);

  const saveTrialDays = async () => {
    setSavingTrialDays(true);
    const { error } = await supabase
      .from("admin_settings")
      .update({ default_trial_days: trialDays })
      .neq("default_trial_days", trialDays);

    if (!error) {
      toast.success("Trial period updated!");
    } else {
      toast.error("Failed to update trial period.");
      console.error(error);
    }
    setSavingTrialDays(false);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) {
      console.log('NULL date provided to formatDate');
      return 'N/A';
    }
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        console.log(`Invalid date: "${dateString}"`);
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString();
    } catch (err) {
      console.error(`Error formatting date "${dateString}":`, err);
      return 'Error';
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center">
        <Shield className="mr-3 h-10 w-10 text-purple-600" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-purple-600" />
              Calendar Test Tools
            </CardTitle>
            <CardDescription>
              Test and debug Google Calendar integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              This tool allows you to test Google Calendar event creation, updates, and deletion.
            </p>
            <Button asChild>
              <Link to="/admin/calendar-test" className="inline-flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Open Calendar Test Page
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">Trial Period Settings</CardTitle>
            <CardDescription>
              Configure the number of days users can use the app before a subscription is required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trialSettingsLoading ? (
              <span className="text-gray-500">Loading current trial settings...</span>
            ) : (
              <form
                className="flex flex-col gap-3"
                onSubmit={e => {
                  e.preventDefault();
                  saveTrialDays();
                }}
              >
                <label className="font-medium flex items-center gap-2">
                  Trial Period (days)
                  <Input
                    type="number"
                    min={0}
                    value={trialDays}
                    onChange={e => setTrialDays(Number(e.target.value))}
                    className="w-32 ml-2"
                  />
                </label>
                <Button
                  type="submit"
                  disabled={savingTrialDays}
                  className="w-fit"
                >
                  {savingTrialDays ? "Saving..." : "Save"}
                </Button>
              </form>
            )}
            <div className="text-xs text-muted-foreground mt-2">
              This setting affects all new users who sign up without an active subscription.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            User Subscriptions
          </CardTitle>
          <CardDescription>
            View and manage user subscription status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fetchError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          )}
          
          {loading ? (
            <div className="py-4 text-center">Loading user data...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trial End Date</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          {user.email}
                          {user.isAdmin && (
                            <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                              Admin
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status || (user.isActive ? 'Active' : 'Inactive')}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.trialEndDate ? formatDate(user.trialEndDate) : (
                            <span className="text-gray-500 italic">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDate(user.createdAt)}
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
      
      {/* New User Data Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            User Data Explorer
          </CardTitle>
          <CardDescription>
            View detailed data for a specific user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <UserSelector onUserSelect={handleUserSelect} />
          </div>
          
          <UserDataTabs userId={selectedUserId} />
        </CardContent>
      </Card>

      <div className="mb-8">
        <UserSubscriptionsDebugging />
      </div>
    </div>
  );
};

export default Admin;
