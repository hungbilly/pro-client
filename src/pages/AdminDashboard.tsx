
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
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
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserTrialModal from '@/components/admin/UserTrialModal';
import AdminUserManagement from '@/components/admin/AdminUserManagement';
import { format, parseISO, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Search, Loader, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import UserSubscriptionBadge from '@/components/admin/UserSubscriptionBadge';

interface User {
  id: string;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  status: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  current_period_end: string;
  trial_end_date: string | null;
  created_at: string;
}

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<(User & { subscription?: Subscription })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<(User & { subscription?: Subscription }) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("subscriptions");

  useEffect(() => {
    // Redirect if not admin
    if (!loading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [isAdmin, loading, navigate, toast]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Query user_subscriptions table directly instead of auth.users
        const { data: subscriptionsData, error: subscriptionsError } = await supabase
          .from('user_subscriptions')
          .select('*');
        
        if (subscriptionsError) throw subscriptionsError;
        
        if (subscriptionsData && subscriptionsData.length > 0) {
          // Transform subscription data into user format with subscription info
          const usersWithSubscriptions = subscriptionsData.map(subscription => {
            return {
              id: subscription.user_id,
              created_at: subscription.created_at,
              subscription: {
                id: subscription.id,
                user_id: subscription.user_id,
                status: subscription.status,
                stripe_subscription_id: subscription.stripe_subscription_id,
                stripe_customer_id: subscription.stripe_customer_id,
                current_period_end: subscription.current_period_end,
                trial_end_date: subscription.trial_end_date,
                created_at: subscription.created_at
              }
            };
          });
          
          setUsers(usersWithSubscriptions);
        } else {
          setUsers([]);
          console.log('No subscription data found');
        }
      } catch (error: any) {
        console.error('Error fetching users:', error);
        setError(error.message);
        toast({
          title: "Error Fetching Users",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, toast]);

  const getTrialStatus = (user: User & { subscription?: Subscription }) => {
    if (!user.subscription) {
      // Calculate if in 90-day trial period based on created_at
      const createdAt = new Date(user.created_at);
      const trialEndDate = addDays(createdAt, 90);
      const now = new Date();
      
      if (now < trialEndDate) {
        const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          status: 'trial',
          daysLeft,
          endDate: trialEndDate.toISOString()
        };
      } else {
        return { status: 'expired', daysLeft: 0, endDate: null };
      }
    } else if (user.subscription.trial_end_date) {
      // Use explicit trial_end_date if available
      const trialEndDate = new Date(user.subscription.trial_end_date);
      const now = new Date();
      
      if (now < trialEndDate) {
        const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          status: 'trial',
          daysLeft,
          endDate: trialEndDate.toISOString()
        };
      } else {
        return { status: 'expired', daysLeft: 0, endDate: null };
      }
    } else if (user.subscription.status === 'active') {
      return { status: 'active', daysLeft: 0, endDate: user.subscription.current_period_end };
    } else {
      return { status: 'inactive', daysLeft: 0, endDate: null };
    }
  };

  // Since we don't have access to email from auth.users, we'll just use user ID
  const filteredUsers = users.filter(user => 
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenTrialModal = (user: User & { subscription?: Subscription }) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleTrialUpdated = (userId: string, trialEndDate: string, daysAdded: number) => {
    setUsers(prevUsers => 
      prevUsers.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            subscription: {
              ...user.subscription,
              trial_end_date: trialEndDate,
              status: 'trialing'
            } as Subscription
          };
        }
        return user;
      })
    );
    
    toast({
      title: "Trial Period Updated",
      description: `Added ${daysAdded} days to user's trial period.`,
      variant: "default"
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader className="h-6 w-6 animate-spin mr-2" />
        <p>Checking permissions...</p>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full md:w-auto grid-cols-2">
          <TabsTrigger value="subscriptions">User Subscriptions</TabsTrigger>
          <TabsTrigger value="admin-users">Admin Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>User Subscription Management</CardTitle>
              <CardDescription>
                View and manage users and their subscription status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user ID"
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader className="h-6 w-6 animate-spin mr-2" />
                  <p>Loading users...</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead>Trial Status</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map(user => {
                          const trialInfo = getTrialStatus(user);
                          return (
                            <TableRow key={user.id}>
                              <TableCell>{user.id}</TableCell>
                              <TableCell>{format(parseISO(user.created_at), 'MMM d, yyyy')}</TableCell>
                              <TableCell>
                                <UserSubscriptionBadge status={user.subscription?.status || 'none'} />
                              </TableCell>
                              <TableCell>
                                {trialInfo.status === 'trial' ? (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                    Trial ({trialInfo.daysLeft} days left)
                                  </Badge>
                                ) : trialInfo.status === 'active' ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    Active Subscription
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    Expired
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {trialInfo.endDate ? format(parseISO(trialInfo.endDate), 'MMM d, yyyy') : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleOpenTrialModal(user)}
                                >
                                  Modify Trial
                                </Button>
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
        
        <TabsContent value="admin-users">
          <AdminUserManagement />
        </TabsContent>
      </Tabs>
      
      {selectedUser && (
        <UserTrialModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          user={selectedUser}
          onTrialUpdated={handleTrialUpdated}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
