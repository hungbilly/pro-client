
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, LogOut, AlertTriangle, CheckCircle2, Bug } from 'lucide-react';
import { toast } from 'sonner';

// Define the redirect URI for Google OAuth
const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;
const SCOPES = ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"].join(" ");

interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  token_type: string | null;
  expires_at: string | null;
}

const GoogleCalendarIntegration: React.FC = () => {
  const { user } = useAuth();
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Fetch the client ID from server
  useEffect(() => {
    const fetchClientId = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('get-google-client-id');
        
        if (error) {
          console.error('Error fetching Google client ID:', error);
          setError(`Error fetching Google client ID: ${error.message}`);
        } else if (data) {
          console.log('Google Auth config:', data);
          setDebugInfo(data);
          
          if (data.clientId) {
            setClientId(data.clientId);
          } else {
            setError('Google OAuth is not properly configured: Missing client ID');
          }
        }
      } catch (error) {
        console.error('Exception when fetching Google client ID:', error);
        setError(`Exception when fetching Google client ID: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchClientId();
  }, []);

  // Fetch user's Google Calendar integration status
  useEffect(() => {
    const fetchIntegration = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_integrations')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'google_calendar')
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching integration:', error);
          toast.error('Failed to fetch integration status');
        } else {
          setIntegration(data as CalendarIntegration || null);
        }
      } catch (error) {
        console.error('Exception when fetching integration:', error);
        toast.error('An error occurred while checking integration status');
      } finally {
        setLoading(false);
      }
    };

    fetchIntegration();
  }, [user]);

  const initiateGoogleAuth = () => {
    if (!clientId) {
      toast.error('Google OAuth is not properly configured');
      return;
    }
    
    // Construct the OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    
    // Add query parameters
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', SCOPES);
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    
    if (user) {
      // Store user ID in state parameter for verification
      const stateValue = JSON.stringify({ userId: user.id });
      authUrl.searchParams.append('state', btoa(stateValue));
    }
    
    console.log('Google OAuth URL:', authUrl.toString());
    
    // Redirect to Google OAuth
    window.location.href = authUrl.toString();
  };

  const disconnectGoogleCalendar = async () => {
    if (!user || !integration) return;
    
    try {
      setLoading(true);
      
      // Call revoke token endpoint if needed
      if (integration.access_token) {
        try {
          await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${integration.access_token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          });
        } catch (e) {
          console.error('Error revoking token:', e);
          // Continue anyway to remove from DB
        }
      }
      
      // Remove from database
      const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('id', integration.id);
      
      if (error) {
        throw error;
      }
      
      setIntegration(null);
      toast.success('Successfully disconnected from Google Calendar');
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error('Failed to disconnect from Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const showDebugInfo = () => {
    if (debugInfo) {
      toast.info(
        <pre className="text-xs whitespace-pre-wrap">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>,
        {
          duration: 10000,
        }
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>Google Calendar Integration</CardTitle>
        </div>
        <CardDescription>
          Integrate with Google Calendar to automatically add and update events
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {!error && !clientId && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              Google OAuth is not properly configured. Please ask your administrator to set up the integration.
            </AlertDescription>
          </Alert>
        )}
        
        {clientId && integration ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Connected</AlertTitle>
            <AlertDescription className="text-green-700">
              Your account is connected to Google Calendar. 
              Event management is enabled.
            </AlertDescription>
          </Alert>
        ) : clientId && (
          <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Not Connected</AlertTitle>
            <AlertDescription className="text-yellow-700">
              Connect your account to Google Calendar to enable automatic event creation and management.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {clientId && integration ? (
          <Button 
            variant="destructive" 
            onClick={disconnectGoogleCalendar} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Disconnect Calendar
          </Button>
        ) : clientId && (
          <Button 
            onClick={initiateGoogleAuth} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Connect to Google Calendar
          </Button>
        )}
        
        {/* Debug button - normally would remove this in production */}
        <Button
          variant="outline"
          size="sm"
          onClick={showDebugInfo}
          className="ml-auto flex items-center gap-2"
        >
          <Bug className="h-4 w-4" />
          Debug Info
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GoogleCalendarIntegration;
