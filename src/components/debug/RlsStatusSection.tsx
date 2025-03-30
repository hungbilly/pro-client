
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface RlsStatus {
  table_name: string;
  rls_enabled: boolean;
}

const RlsStatusSection = () => {
  const [rlsStatus, setRlsStatus] = useState<RlsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchRlsStatus();
  }, []);

  const fetchRlsStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('check-rls-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      setRlsStatus(data.status || null);
    } catch (error) {
      console.error('Error checking RLS status:', error);
      setError(`Failed to check RLS status: ${error.message || 'Unknown error'}`);
      toast.error('Failed to check RLS status');
    } finally {
      setLoading(false);
    }
  };

  const toggleRls = async () => {
    try {
      setToggling(true);
      setError(null);
      clearRetryTimeout();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('toggle-rls-for-subscriptions', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          enable_rls: !rlsStatus?.rls_enabled,
        },
      });

      if (error) {
        throw error;
      }

      setRlsStatus(prev => prev ? {...prev, rls_enabled: data.rls_enabled} : null);
      toast.success(`RLS ${data.rls_enabled ? 'enabled' : 'disabled'} successfully`);
      
      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      console.error('Error toggling RLS:', error);
      
      const errorMessage = error.message || 'Unknown error';
      setError(`Failed to toggle RLS: ${errorMessage}`);
      
      // Handle deadlock specifically
      if (errorMessage.includes('deadlock')) {
        if (retryCount < 3) {
          const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          toast.warning(`Database deadlock detected. Retrying in ${retryDelay/1000} seconds...`);
          
          const timeout = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            toggleRls();
          }, retryDelay);
          
          setRetryTimeout(timeout);
        } else {
          toast.error('Failed to toggle RLS after multiple attempts. Please try again later.');
        }
      } else {
        toast.error('Failed to toggle RLS');
      }
    } finally {
      setToggling(false);
    }
  };

  const clearRetryTimeout = () => {
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }
  };

  // Clean up any timeouts when component unmounts
  useEffect(() => {
    return () => clearRetryTimeout();
  }, []);

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Row Level Security Status</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchRlsStatus} 
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Manage RLS for user_subscriptions table
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {loading ? (
          <div className="py-4 text-center flex items-center justify-center">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin text-primary" />
            <span>Checking RLS status...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                {rlsStatus?.rls_enabled ? (
                  <Lock className="mr-2 h-5 w-5 text-green-500" />
                ) : (
                  <Unlock className="mr-2 h-5 w-5 text-amber-500" />
                )}
                <span className="font-medium">user_subscriptions</span>
              </div>
              
              <Badge 
                variant={rlsStatus?.rls_enabled ? "success" : "warning"}
                className="px-2 py-1"
              >
                {rlsStatus?.rls_enabled ? "RLS Enabled" : "RLS Disabled"}
              </Badge>
            </div>
            
            <div className="pt-2">
              <Button 
                variant={rlsStatus?.rls_enabled ? "outline" : "default"}
                className={rlsStatus?.rls_enabled ? "" : "bg-green-600 hover:bg-green-700"}
                onClick={toggleRls}
                disabled={toggling || loading}
              >
                {toggling && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                {rlsStatus?.rls_enabled ? "Disable RLS" : "Enable RLS"}
              </Button>
            </div>
            
            <div className="pt-2 text-sm text-muted-foreground">
              <p>
                {rlsStatus?.rls_enabled 
                  ? "Row Level Security is enabled. Users can only access their own subscription data."
                  : "Row Level Security is disabled. Users can access all subscription data."}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RlsStatusSection;
