
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, CheckCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const GoogleCalendarIntegration = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkGoogleConnection();
  }, []);

  const checkGoogleConnection = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if the user has Google Calendar connected by checking for the refresh token
      const { data, error } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google_calendar')
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      setIsConnected(!!data);
    } catch (err: any) {
      console.error('Error checking Google connection:', err);
      setError(err.message || 'Failed to check Google integration status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Start Google OAuth flow
      // This would redirect to Google for authentication and calendar permissions
      const redirectUrl = `${window.location.origin}/auth/google-callback`;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: 'https://www.googleapis.com/auth/calendar',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      
      if (error) throw error;
      
      if (data && data.url) {
        // Redirect to Google auth
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Error connecting Google Calendar:', err);
      setError(err.message || 'Failed to connect Google Calendar');
      toast.error(err.message || 'Failed to connect Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Remove the integration record
      const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'google_calendar');
      
      if (error) throw error;
      
      setIsConnected(false);
      toast.success('Google Calendar disconnected successfully');
    } catch (err: any) {
      console.error('Error disconnecting Google Calendar:', err);
      setError(err.message || 'Failed to disconnect Google Calendar');
      toast.error(err.message || 'Failed to disconnect Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Connect your Google Calendar to schedule events directly from this app
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            By connecting Google Calendar, you'll be able to:
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Create calendar events for jobs and appointments</li>
            <li>Update event details when job information changes</li>
            <li>Delete events when jobs are cancelled</li>
          </ul>
          
          {isConnected && (
            <div className="flex items-center gap-2 mt-4 bg-green-50 p-3 rounded-md text-green-700">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Your Google Calendar is connected</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {isConnected ? (
          <Button 
            variant="outline" 
            onClick={handleDisconnect}
            disabled={isLoading}
          >
            Disconnect Google Calendar
          </Button>
        ) : (
          <Button 
            onClick={handleConnect} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <svg viewBox="0 0 48 48" className="w-4 h-4">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
            </svg>
            Connect Google Calendar
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          asChild
          className="ml-2"
        >
          <a 
            href="https://calendar.google.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            Open Google Calendar
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GoogleCalendarIntegration;
