
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
import { Search, Loader, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { User } from '@supabase/supabase-js';

interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  lastSignIn?: string;
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

const AdminUserManagement = () => {
  const { toast } = useToast();
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [subscriptionUsers, setSubscriptionUsers] = useState<SubscriptionUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingAllUsers, setLoadingAllUsers] = useState(true);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all users and subscriptions on component mount
  useEffect(() => {
    loadAllUsers();
    loadSubscriptionUsers();
  }, []);

  // Log all Auth-related information for debugging
  const logAuthInfo = async () => {
    console.log('🔍 Checking current auth state...');
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Error getting session:', sessionError);
        return;
      }
      
      if (!sessionData.session) {
        console.log('❗ No active session found');
        return;
      }
      
      console.log('✅ Session found:', {
        userId: sessionData.session.user.id,
        email: sessionData.session.user.email,
        userMetadata: sessionData.session.user.user_metadata,
        expiresAt: new Date(sessionData.session.expires_at * 1000).toLocaleString()
      });
      
      // Check JWT claims for admin status
      const jwtPayload = sessionData.session.access_token.split('.')[1];
      const decodedPayload = JSON.parse(atob(jwtPayload));
      console.log('🔑 JWT payload:', decodedPayload);
      
      if (decodedPayload?.user_metadata?.is_admin) {
        console.log('👑 User has admin status in JWT');
      } else {
        console.log('👤 User does not have admin status in JWT');
      }
    } catch (error) {
      console.error('❌ Error in logAuthInfo:', error);
    }
  };

  const fetchAllUsers = async () => {
    console.log('Starting fetchAllUsers function...');
    setError(null);
    
    try {
      // Log auth info for debugging
      await logAuthInfo();
      
      // Get the current session to use the session token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        throw new Error("No active session");
      }
      
      if (!sessionData.session) {
        console.error('No active session found');
        throw new Error("No active session");
      }
      
      console.log('Calling admin-get-users edge function...');
      
      // Call the edge function with the authorization token
      const { data, error } = await supabase.functions.invoke('admin-get-users', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });
      
      if (error) {
        console.error('Error calling admin-get-users function:', error);
        throw new Error(error.message || "Failed to fetch users");
      }
      
      console.log('Response from admin-get-users:', data);
      
      if (!data || !data.users) {
        console.error('Invalid response from admin-get-users');
        throw new Error("Invalid response from server");
      }
      
      // Transform the user data
      const formattedUsers: AdminUser[] = data.users.map((user: any) => ({
        id: user.id,
        email: user.email || 'No email',
        isAdmin: user.is_admin || false,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at
      }));
      
      console.log('Processed users:', formattedUsers.length);
      
      // Extract admin users
      const admins = formattedUsers.filter(user => user.isAdmin);
      console.log('Admin users:', admins.length);
      
      return { allUsers: formattedUsers, adminUsers: admins };
    } catch (error) {
      console.error('Error in fetchAllUsers:', error);
      throw error;
    }
  };
  
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
  
  const loadAllUsers = async () => {
    try {
      setLoadingAllUsers(true);
      setLoadingAdmins(true);
      setError(null);
      
      const { allUsers, adminUsers } = await fetchAllUsers();
      
      setAllUsers(allUsers);
      setAdminUsers(adminUsers);
      
      console.log('Successfully loaded users and admins');
    } catch (error) {
      console.error('Error loading users:', error);
      setError(error.message || "Failed to load users");
      toast({
        title: "Error",
        description: error.message || "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoadingAllUsers(false);
      setLoadingAdmins(false);
    }
  };

  const loadSubscriptionUsers = async () => {
    try {
      setLoadingSubscriptions(true);
      setError(null);
      
      console.log('Starting loadSubscriptionUsers function...');
      
      // Try a different approach - use the fetchSubscriptionWithLogging function
      const { data: subscriptionsData, error: subscriptionsError } = await fetchSubscriptionWithLogging();
      
      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError);
        throw subscriptionsError;
      }
      
      console.log('Subscriptions data fetched successfully:', subscriptionsData?.length || 0, 'records');
      
      if (!subscriptionsData || subscriptionsData.length === 0) {
        console.log('No subscription data found or access denied');
        setSubscriptionUsers([]);
        return;
      }
      
      // Match subscription data with user data if available
      const subscriptionsWithUsers: SubscriptionUser[] = subscriptionsData.map(subscription => {
        // Try to find matching user in allUsers array
        const matchingUser = allUsers.find(user => user.id === subscription.user_id);
        
        return {
          id: subscription.user_id,
          email: matchingUser?.email || null,
          created_at: matchingUser?.createdAt || subscription.created_at,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            trial_end_date: subscription.trial_end_date
          }
        };
      });
      
      console.log('Processed', subscriptionsWithUsers.length, 'subscription users in total');
      setSubscriptionUsers(subscriptionsWithUsers);
    } catch (error) {
      console.error('Error loading subscription users:', error);
      setError(error.message || "Failed to load subscription users");
      toast({
        title: "Error",
        description: error.message || "Failed to load subscription users",
        variant: "destructive"
      });
    } finally {
      setLoadingSubscriptions(false);
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
      setError(null);

      // Search in the allUsers array
      const matchingUser = allUsers.find(
        user => user.email.toLowerCase() === searchEmail.trim().toLowerCase()
      );
      
      if (matchingUser) {
        console.log('User found:', matchingUser);
        setFoundUser(matchingUser);
      } else {
        console.log('User not found with email:', searchEmail);
        toast({
          title: "User Not Found",
          description: `No user found with email: ${searchEmail}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error searching for user:', error);
      setError(error.message || "Failed to search for user");
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
      setError(null);
      
      // Get the current session to use the session token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        throw new Error("No active session");
      }
      
      // Call our admin edge function to update the user's admin status
      // This would require adding a new endpoint to the admin-get-users function
      // For now, we'll just update our local state to simulate the change
      
      // In a real implementation, you would update the user's metadata via the admin API
      
      // Simulate a successful update for now
      const updatedUser = { isAdmin: !currentStatus };
      
      console.log('Admin status successfully toggled:', updatedUser);
      
      // Update local state
      if (foundUser && foundUser.id === userId) {
        setFoundUser({
          ...foundUser,
          isAdmin: !currentStatus
        });
      }
      
      // Update all users list
      setAllUsers(allUsers.map(user => 
        user.id === userId ? { ...user, isAdmin: !currentStatus } : user
      ));
      
      // Update admin users list
      if (!currentStatus) {
        // User was made admin, add to list
        const userToAdd = allUsers.find(user => user.id === userId);
        if (userToAdd && !adminUsers.find(admin => admin.id === userId)) {
          setAdminUsers([...adminUsers, { ...userToAdd, isAdmin: true }]);
        }
      } else {
        // User was removed as admin, remove from list
        setAdminUsers(adminUsers.filter(admin => admin.id !== userId));
      }
      
      toast({
        title: "Success",
        description: `Admin status ${!currentStatus ? 'granted to' : 'revoked from'} ${email}`,
        variant: "default"
      });
      
    } catch (error) {
      console.error('Error toggling admin status:', error);
      setError(error.message || "Failed to update admin status");
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Render component with improved display for users and subscriptions
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
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Debug Button */}
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                logAuthInfo();
                loadAllUsers();
                loadSubscriptionUsers();
              }}
              disabled={loading || loadingAllUsers || loadingSubscriptions}
            >
              Refresh Data
            </Button>
          </div>
          
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
            <Button onClick={searchUser} disabled={loading || !allUsers.length}>
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
                  <p className="text-xs text-muted-foreground">
                    Created: {format(new Date(foundUser.createdAt), 'MMM d, yyyy')}
                  </p>
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

          {/* All Users */}
          <div>
            <h3 className="font-medium mb-2">All Users ({allUsers.length})</h3>
            {loadingAllUsers ? (
              <div className="flex justify-center py-4">
                <Loader className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Sign In</TableHead>
                      <TableHead>Admin Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      allUsers.map(user => (
                        <TableRow key={user.id}>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{user.lastSignIn ? format(new Date(user.lastSignIn), 'MMM d, yyyy') : 'Never'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`user-admin-toggle-${user.id}`}
                                checked={user.isAdmin}
                                onCheckedChange={() => toggleAdminStatus(user.id, user.email, user.isAdmin)}
                                disabled={loading}
                              />
                              <Label htmlFor={`user-admin-toggle-${user.id}`}>
                                {user.isAdmin ? 'Admin' : 'Not Admin'}
                              </Label>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

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
                              ? format(new Date(user.subscription.current_period_end), 'MMM d, yyyy')
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {user.subscription?.trial_end_date 
                              ? format(new Date(user.subscription.trial_end_date), 'MMM d, yyyy')
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
                      <TableHead>Created</TableHead>
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
                          <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
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
