
import React, { useState } from 'react';
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
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Load all admin users on component mount
  React.useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = async () => {
    try {
      setLoadingAdmins(true);
      
      // Instead of using admin.listUsers, we'll get the current user and check if they're admin
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user found");
      }
      
      // Check if the current user is admin
      if (!user.user_metadata?.is_admin) {
        throw new Error("Current user doesn't have admin privileges");
      }
      
      // Fetch all users who have is_admin set to true in their user_metadata
      // Since we can't directly query all users, we'll maintain a list in the app
      // starting with the current admin user
      const adminUsersList = [
        {
          id: user.id,
          email: user.email || 'No email',
          isAdmin: true
        }
      ];
      
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
      setLoading(true);
      setFoundUser(null);

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }
      
      // Since getUserByEmail doesn't exist in the API, we'll use a different approach
      // First, check if the current user's email matches the search
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser && currentUser.email?.toLowerCase() === searchEmail.trim().toLowerCase()) {
        setFoundUser({
          id: currentUser.id,
          email: currentUser.email,
          isAdmin: currentUser.user_metadata?.is_admin === true
        });
        return;
      }
      
      // If we're looking for a different user, we can't use the admin API directly
      // Instead, we'll show a message that we can only manage the current user
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
      setLoading(true);
      
      // We'll update the user metadata through updateUser
      // This only works for the current user
      const { data, error } = await supabase.auth.updateUser({
        data: { is_admin: !currentStatus }
      });
      
      if (error) throw error;
      
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
          setAdminUsers([...adminUsers, { id: userId, email, isAdmin: true }]);
        }
      } else {
        // User was removed as admin, remove from list
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
