import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, Loader } from 'lucide-react';
import { User, UserMetadata } from '@supabase/supabase-js';

interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

interface SubscriptionUser {
  id: string;
  email: string | null;
  created_at: string;
  subscription?: {
    id: string;
    status: string;
    current_period_end: string;
    trial_end_date: string | null;
  }
}

// Define a type for the user objects returned from Supabase
interface SupabaseUser extends User {
  user_metadata: UserMetadata & {
    is_admin?: boolean;
  };
}

const AdminUserManagement = () => {
  const { toast } = useToast();
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [subscriptionUsers, setSubscriptionUsers] = useState<SubscriptionUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);

  // Load all admin users and subscriptions on component mount
  useEffect(() => {
    loadAdminUsers();
    loadSubscriptionUsers();
  }, []);

  // Added comprehensive logging to debug permission issues
  const fetchSubscriptionWithLogging = async () => {
    console.log('Starting subscription fetch with detailed logging...');
    
    try {
      console.log('Getting current user session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        return { data: null, error: sessionError };
      }
      
      console.log('Session obtained:', !!sessionData.session);
      console.log('User authenticated:', !!sessionData.session?.user);
      
      if (sessionData.session?.user?.user_metadata?.is_admin) {
        console.log('User has admin privileges:', true);
      } else {
        console.log('User has admin privileges:', false);
      }
      
      console.log('Attempting to fetch user_subscriptions...');
      const result = await supabase
        .from('user_subscriptions')
        .select('*');
      
      console.log('Fetch result:', {
        success: !result.error,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        dataCount: result.data?.length || 0
      });
      
      return result;
    } catch (err) {
      console.error('Unexpected error in fetchSubscriptionWithLogging:', err);
      return { data: null, error: err };
    }
  };
  
  const loadSubscriptionUsers = async () => {
    try {
      setLoadingSubscriptions(true);
      
      console.log('Starting loadSubscriptionUsers function...');
      
      // Try a different approach - use the fetchSubscriptionWithLogging function
      const { data: subscriptionsData, error: subscriptionsError } = await fetchSubscriptionWithLogging();
      
      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError);
        throw subscriptionsError;
      }
      
      console.log('Subscriptions data fetched successfully:', subscriptionsData?.length || 0, 'records');
      
      // For each subscription, fetch user info (email)
      const subscriptionsWithUsers: SubscriptionUser[] = [];
      
      if (subscriptionsData && subscriptionsData.length > 0) {
        console.log('Processing subscription data for', subscriptionsData.length, 'users');
        
        for (const subscription of subscriptionsData) {
          try {
            console.log('Processing subscription for user_id:', subscription.user_id);
            
            // Getting user data directly from auth admin API
            console.log('Trying to get user data via auth.admin.getUserById...');
            
            // Check if we have access to the admin API
            const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(
              subscription.user_id
            );
            
            if (authUserError) {
              console.error('Error with auth.admin.getUserById:', authUserError.message);
              console.log('Falling back to adding subscription without email');
              
              subscriptionsWithUsers.push({
                id: subscription.user_id,
                email: null,
                created_at: subscription.created_at,
                subscription: {
                  id: subscription.id,
                  status: subscription.status,
                  current_period_end: subscription.current_period_end,
                  trial_end_date: subscription.trial_end_date
                }
              });
            } else if (authUserData && authUserData.user) {
              console.log('Successfully retrieved user data for:', authUserData.user.email);
              
              subscriptionsWithUsers.push({
                id: subscription.user_id,
                email: authUserData.user.email,
                created_at: authUserData.user.created_at,
                subscription: {
                  id: subscription.id,
                  status: subscription.status,
                  current_period_end: subscription.current_period_end,
                  trial_end_date: subscription.trial_end_date
                }
              });
            }
          } catch (error: any) {
            console.error('Error processing user data for subscription:', error);
            
            // Still add the subscription even if we can't get the user data
            subscriptionsWithUsers.push({
              id: subscription.user_id,
              email: null,
              created_at: subscription.created_at,
              subscription: {
                id: subscription.id,
                status: subscription.status,
                current_period_end: subscription.current_period_end,
                trial_end_date: subscription.trial_end_date
              }
            });
          }
        }
      } else {
        console.log('No subscription data found or access denied');
      }
      
      console.log('Processed', subscriptionsWithUsers.length, 'subscription users in total');
      setSubscriptionUsers(subscriptionsWithUsers);
    } catch (error: any) {
      console.error('Error loading subscription users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load subscription users",
        variant: "destructive"
      });
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const loadAdminUsers = async () => {
    try {
      setLoadingAdmins(true);
      console.log('Starting loadAdminUsers function...');
      
      // Get the current user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        throw new Error("Error retrieving session");
      }
      
      if (!sessionData.session?.user) {
        console.error('No authenticated user found in session');
        throw new Error("No authenticated user found");
      }
      
      const currentUser = sessionData.session.user;
      console.log('Current user:', currentUser.id);
      
      // Check if the current user is admin
      const isAdmin = currentUser.user_metadata?.is_admin === true;
      console.log('Current user is admin:', isAdmin);
      
      if (!isAdmin) {
        console.warn('Current user is not an admin');
        throw new Error("Current user doesn't have admin privileges");
      }
      
      // For now, just add the current admin user to the list
      // A proper implementation would fetch all admin users
      const adminUsersList = [
        {
          id: currentUser.id,
          email: currentUser.email || 'No email',
          isAdmin: true
        }
      ];
      
      console.log('Admin users list:', adminUsersList);
      setAdminUsers(adminUsersList);
    } catch (error: any) {
      console.error('Error loading admin users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load admin users",
        variant: "destructive"
      });
    } finally {
      setLoadingAdmins(false);
    }
  };

  const searchUser = async () => {
    if (!searchEmail || searchEmail.trim() === '') {
      toast({
        title: "Invalid Input",
        description: "Please enter an email address to search",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Searching for user by email:', searchEmail);
      setLoading(true);
      setFoundUser(null);

      // Get the current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        throw new Error("No active session");
      }
      
      if (!sessionData.session) {
        console.error('No active session found');
        throw new Error("No active session");
      }
      
      // Check if the searched email matches the current user's email
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting current user:', userError);
        throw userError;
      }
      
      if (!userData.user) {
        console.error('No user found in current session');
        throw new Error("No user found");
      }
      
      console.log('Current user email:', userData.user.email);
      console.log('Comparing with search email:', searchEmail);
      
      if (userData.user.email?.toLowerCase() === searchEmail.trim().toLowerCase()) {
        console.log('Email match found - current user');
        setFoundUser({
          id: userData.user.id,
          email: userData.user.email,
          isAdmin: userData.user.user_metadata?.is_admin === true
        });
        return;
      }
      
      // We don't have a direct way to search for other users by email
      console.log('Email does not match current user, cannot search for other users');
      toast({
        title: "Limited Functionality",
        description: "For security reasons, you can only manage your own admin status. The searched user couldn't be found or managed.",
        variant: "destructive"
      });
      
    } catch (error: any) {
      console.error('Error searching for user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to search for user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, email: string, currentStatus: boolean) => {
    try {
      console.log('Toggling admin status for user:', userId);
      console.log('Current admin status:', currentStatus);
      setLoading(true);
      
      // Update the user metadata through updateUser
      // This only works for the current user
      const { data, error } = await supabase.auth.updateUser({
        data: { is_admin: !currentStatus }
      });
      
      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }
      
      console.log('User update successful:', data);
      
      // Update local state
      if (foundUser && foundUser.id === userId) {
        setFoundUser({
          ...foundUser,
          isAdmin: !currentStatus
        });
      }
      
      // Update admin users list
      if (!currentStatus) {
        // User was made admin, add to list if not already there
        if (!adminUsers.find(user => user.id === userId)) {
          console.log('Adding user to admin list:', email);
          setAdminUsers([...adminUsers, { id: userId, email, isAdmin: true }]);
        }
      } else {
        // User was removed as admin, remove from list
        console.log('Removing user from admin list:', email);
        setAdminUsers(adminUsers.filter(user => user.id !== userId));
      }
      
      toast({
        title: "Success",
        description: `Admin status ${!currentStatus ? 'granted to' : 'revoked from'} ${email}`,
        variant: "default"
      });
      
    } catch (error: any) {
      console.error('Error toggling admin status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Rest of the component remains the same
  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin User Management</CardTitle>
        <CardDescription>
          Search for users and manage their admin privileges
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Search form */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email address"
                className="pl-10"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              />
            </div>
            <Button onClick={searchUser} disabled={loading}>
              {loading ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
              Search
            </Button>
          </div>

          {/* Search results */}
          {foundUser && (
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">Search Result</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{foundUser.email}</p>
                  <p className="text-xs text-muted-foreground">ID: {foundUser.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`admin-toggle-${foundUser.id}`}
                    checked={foundUser.isAdmin}
                    onCheckedChange={() => toggleAdminStatus(foundUser.id, foundUser.email, foundUser.isAdmin)}
                    disabled={loading}
                  />
                  <Label htmlFor={`admin-toggle-${foundUser.id}`}>
                    {foundUser.isAdmin ? 'Admin' : 'Not Admin'}
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* User Subscriptions */}
          <div>
            <h3 className="font-medium mb-2">User Subscriptions</h3>
            {loadingSubscriptions ? (
              <div className="flex justify-center py-4">
                <Loader className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Period End</TableHead>
                      <TableHead>Trial End</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptionUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No subscription data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      subscriptionUsers.map(user => (
                        <TableRow key={user.id + (user.subscription?.id || '')}>
                          <TableCell className="text-xs">{user.id}</TableCell>
                          <TableCell>{user.email || 'Unknown'}</TableCell>
                          <TableCell>{user.subscription?.status || 'N/A'}</TableCell>
                          <TableCell>
                            {user.subscription?.current_period_end 
                              ? new Date(user.subscription.current_period_end).toLocaleDateString() 
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {user.subscription?.trial_end_date 
                              ? new Date(user.subscription.trial_end_date).toLocaleDateString() 
                              : 'No trial'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Current admin users list */}
          <div>
            <h3 className="font-medium mb-2">Current Admin Users</h3>
            {loadingAdmins ? (
              <div className="flex justify-center py-4">
                <Loader className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                          No admin users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      adminUsers.map(user => (
                        <TableRow key={user.id}>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{user.id}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAdminStatus(user.id, user.email, true)}
                              disabled={loading}
                            >
                              Remove Admin
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminUserManagement;
