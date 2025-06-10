import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ShieldAlert, User, Info, Database } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import RlsStatusSection from '@/components/debug/RlsStatusSection';
import UserSubscriptionsTable from '@/components/debug/UserSubscriptionsTable';
import ProfilesTable from '@/components/debug/ProfilesTable';
import { Link } from 'react-router-dom';
import { GitBranch } from 'lucide-react';

const Debug = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if not admin
    if (!isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }

    setLoading(false);
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <ShieldAlert className="mr-3 h-10 w-10 text-purple-600" />
          <h1 className="text-3xl font-bold">Admin Debug Dashboard</h1>
        </div>
        <Button asChild variant="outline">
          <Link to="/version-control">
            <GitBranch className="h-4 w-4 mr-2" />
            Version Control
          </Link>
        </Button>
      </div>

      <Alert className="mb-8">
        <Info className="h-4 w-4" />
        <AlertTitle>Database Operations</AlertTitle>
        <AlertDescription>
          Some operations on this page interact directly with the database. If you encounter deadlock errors, 
          the system will automatically retry. For persistent issues, wait a few moments and try again.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <RlsStatusSection />
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>System configuration and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Current User:</span>
                <span className="font-mono text-sm">{user?.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Admin Status:</span>
                <Badge variant={isAdmin ? "success" : "destructive"} className="px-2 py-1">
                  {isAdmin ? "Admin" : "Not Admin"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Database:</span>
                <div className="flex items-center">
                  <Database className="mr-1 h-4 w-4 text-blue-500" />
                  <span>Supabase PostgreSQL</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-8">
        <ProfilesTable />
        <UserSubscriptionsTable />
      </div>
    </div>
  );
};

export default Debug;
