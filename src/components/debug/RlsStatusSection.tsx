
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Lock, Unlock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const RlsStatusSection = () => {
  const [rlsEnabled, setRlsEnabled] = useState<boolean>(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkRlsStatus();
  }, []);

  const checkRlsStatus = async () => {
    try {
      setRefreshing(true);
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
        console.error('Error checking RLS status:', error);
        toast.error('Failed to check RLS status');
      } else {
        console.log('RLS status:', data);
        setRlsEnabled(data.is_enabled || false);
      }
    } catch (error) {
      console.error('Error checking RLS status:', error);
      toast.error('Failed to check RLS status');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleRls = async () => {
    try {
      setToggleLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('toggle-rls-for-subscriptions', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          enable_rls: !rlsEnabled
        }
      });

      if (error) {
        console.error('Error toggling RLS:', error);
        toast.error('Failed to toggle RLS');
      } else {
        setRlsEnabled(data.rls_enabled);
        toast.success(`RLS ${data.rls_enabled ? 'enabled' : 'disabled'} successfully`);
      }
    } catch (error) {
      console.error('Error toggling RLS:', error);
      toast.error('Failed to toggle RLS');
    } finally {
      setToggleLoading(false);
    }
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Row Level Security</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={checkRlsStatus} 
            disabled={refreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </CardTitle>
        <CardDescription>
          Debug Row Level Security (RLS) for user_subscriptions table
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">RLS Status:</span>
            <Badge 
              variant={rlsEnabled ? "default" : "outline"} 
              className="px-2 py-1 flex items-center gap-1"
            >
              {rlsEnabled ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              {rlsEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          
          <Alert variant={rlsEnabled ? "default" : "destructive"}>
            {rlsEnabled ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            <AlertTitle>{rlsEnabled ? "RLS is enabled" : "RLS is disabled"}</AlertTitle>
            <AlertDescription>
              {rlsEnabled 
                ? "Access to user_subscriptions table is restricted based on user authentication." 
                : "All rows in user_subscriptions table are accessible. This should only be used for debugging."}
            </AlertDescription>
          </Alert>
          
          <Button 
            variant={rlsEnabled ? "destructive" : "default"}
            className="w-full flex items-center gap-2"
            onClick={toggleRls}
            disabled={toggleLoading}
          >
            {toggleLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : rlsEnabled ? (
              <Unlock className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {toggleLoading 
              ? "Processing..." 
              : rlsEnabled 
                ? "Disable RLS (for debugging)" 
                : "Enable RLS (recommended)"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RlsStatusSection;
