
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/utils";
import UserStatusManager from './UserStatusManager';
import UserSubscriptionHistory from './UserSubscriptionHistory';

interface UserDataTabsProps {
  userId: string;
}

interface UserData {
  id: string;
  email: string;
  created_at: string;
  subscription: {
    status: string | null;
    trialEndDate: string | null;
    admin_override: boolean | null;
  } | null;
}

const UserDataTabs: React.FC<UserDataTabsProps> = ({ userId }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-user-data', {
        body: { userId }
      });
      
      if (error) throw new Error(error.message);
      if (!data) throw new Error('No data returned');
      
      setUserData(data);
    } catch (err: any) {
      console.error('Error fetching user data:', err);
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserData();
    } else {
      setUserData(null);
    }
  }, [userId]);

  return (
    <div className="w-full">
      {userId ? (
        <>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : userData ? (
            <>
              <Card className="mb-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{userData.email}</CardTitle>
                    <CardDescription>
                      User ID: {userData.id} • Created: {formatDate(userData.created_at)}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={fetchUserData}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold">Subscription Status:</span>{' '}
                      <span className={`${
                        userData.subscription?.status === 'active' ? 'text-green-600' :
                        userData.subscription?.status === 'trialing' ? 'text-amber-600' :
                        'text-gray-600'
                      }`}>
                        {userData.subscription?.status || 'No active subscription'}
                      </span>
                      
                      {userData.subscription?.admin_override && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                          Admin Override
                        </span>
                      )}
                    </div>
                    
                    {userData.subscription?.trialEndDate && (
                      <div>
                        <span className="font-semibold">Trial End Date:</span>{' '}
                        {formatDate(userData.subscription.trialEndDate)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
          
              <Tabs defaultValue="status">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="status">Manage Status</TabsTrigger>
                  <TabsTrigger value="history">Status History</TabsTrigger>
                </TabsList>
                <TabsContent value="status">
                  <UserStatusManager 
                    userId={userData.id}
                    email={userData.email}
                    currentStatus={userData.subscription?.status || undefined}
                    currentTrialEndDate={userData.subscription?.trialEndDate || undefined}
                    onStatusUpdated={fetchUserData}
                  />
                </TabsContent>
                <TabsContent value="history">
                  <UserSubscriptionHistory userId={userData.id} />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="text-center py-8">
              No user data found
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex justify-center items-center p-8">
            <p className="text-muted-foreground">Select a user to view and manage their subscription details</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserDataTabs;
