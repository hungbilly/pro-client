
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, LogOut, AlertTriangle, CheckCircle2, Bug, Copy } from 'lucide-react';
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
  const [apiCallsHistory, setApiCallsHistory] = useState<any[]>([]);

  // Utility function to add to API call history
  const addToApiHistory = (callType: string, data: any) => {
    setApiCallsHistory(prev => [...prev, { 
      type: callType, 
      timestamp: new Date().toISOString(), 
      data
    }]);
  };

  // Fetch the client ID from server
  useEffect(() => {
    const fetchClientId = async () => {
      try {
        setLoading(true);
        console.log("Fetching Google client ID from edge function");
        const response = await supabase.functions.invoke('get-google-client-id');
        addToApiHistory('get-google-client-id', response);
        
        if (response.error) {
          console.error('Error fetching Google client ID:', response.error);
          setError(`Error fetching Google client ID: ${response.error.message}`);
        } else if (response.data) {
          console.log('Google Auth config:', response.data);
          setDebugInfo(response.data);
          
          if (response.data.clientId) {
            setClientId(response.data.clientId);
            console.log("Retrieved client ID successfully, length:", response.data.clientId.length);
          } else {
            console.error("Missing client ID in response:", response.data);
            setError('Google OAuth is not properly configured: Missing client ID');
          }
        }
      } catch (error) {
        console.error('Exception when fetching Google client ID:', error);
        setError(`Exception when fetching Google client ID: ${error instanceof Error ? error.message : String(error)}`);
        addToApiHistory('get-google-client-id-error', { error });
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
        console.log("Fetching user's Google Calendar integration");
        const { data, error } = await supabase
          .from('user_integrations')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'google_calendar')
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching integration:', error);
          toast.error('Failed to fetch integration status');
          addToApiHistory('fetch-integration-error', { error });
        } else {
          setIntegration(data as CalendarIntegration || null);
          if (data) {
            console.log("User has Google Calendar integration", {
              hasAccessToken: Boolean(data.access_token),
              hasRefreshToken: Boolean(data.refresh_token),
              tokenExpiry: data.expires_at
            });
          } else {
            console.log("User does not have Google Calendar integration");
          }
          addToApiHistory('fetch-integration', { success: true, hasIntegration: Boolean(data) });
        }
      } catch (error) {
        console.error('Exception when fetching integration:', error);
        toast.error('An error occurred while checking integration status');
        addToApiHistory('fetch-integration-exception', { error });
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
    
    // Log the auth initiation event
    addToApiHistory('initiate-auth', { 
      redirectUri: REDIRECT_URI,
      clientIdLength: clientId.length,
      fullAuthUrl: authUrl.toString()
    });
    
    // Redirect to Google OAuth
    window.location.href = authUrl.toString();
  };

  const disconnectGoogleCalendar = async () => {
    if (!user || !integration) return;
    
    try {
      setLoading(true);
      addToApiHistory('disconnect-start', { integrationId: integration.id });
      
      // Call revoke token endpoint if needed
      if (integration.access_token) {
        try {
          await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${integration.access_token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          });
          addToApiHistory('revoke-token', { success: true });
        } catch (e) {
          console.error('Error revoking token:', e);
          addToApiHistory('revoke-token-error', { error: e });
          // Continue anyway to remove from DB
        }
      }
      
      // Remove from database
      const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('id', integration.id);
      
      if (error) {
        addToApiHistory('db-delete-error', { error });
        throw error;
      }
      
      addToApiHistory('disconnect-success', {});
      setIntegration(null);
      toast.success('Successfully disconnected from Google Calendar');
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error('Failed to disconnect from Google Calendar');
      addToApiHistory('disconnect-error', { error });
    } finally {
      setLoading(false);
    }
  };

  const showDebugInfo = () => {
    toast.info(
      <div className="max-h-96 overflow-y-auto">
        <h3 className="font-bold mb-2">Debug Information</h3>
        <pre className="text-xs whitespace-pre-wrap">
          {JSON.stringify({
            clientId: clientId ? `${clientId.substring(0, 6)}...` : null,
            clientIdLength: clientId?.length || 0,
            debugInfo,
            integration: integration ? {
              ...integration,
              access_token: integration.access_token ? "***" : null,
              refresh_token: integration.refresh_token ? "***" : null,
            } : null,
            redirectUri: REDIRECT_URI,
            apiCalls: apiCallsHistory,
            origin: window.location.origin,
            currentUrl: window.location.href,
          }, null, 2)}
        </pre>
        <Button 
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() => {
            const debugData = {
              clientId: clientId ? `${clientId.substring(0, 6)}...` : null,
              clientIdLength: clientId?.length || 0,
              debugInfo,
              integration: integration ? {
                ...integration,
                access_token: integration.access_token ? "***" : null,
                refresh_token: integration.refresh_token ? "***" : null,
              } : null,
              redirectUri: REDIRECT_URI,
              apiCalls: apiCallsHistory,
              origin: window.location.origin,
              currentUrl: window.location.href,
            };
            navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
            toast.success("Debug info copied to clipboard");
          }}
        >
          <Copy className="h-4 w-4 mr-2" /> Copy All Debug Data
        </Button>
      </div>,
      {
        duration: 15000,
      }
    );
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
              <div className="text-xs mt-2">
                Redirect URI: <code className="bg-gray-100 px-1">{REDIRECT_URI}</code>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {!error && !clientId && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              Google OAuth is not properly configured. Please ask your administrator to set up the integration.
              <div className="text-xs mt-2">
                Redirect URI: <code className="bg-gray-100 px-1">{REDIRECT_URI}</code>
              </div>
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
              <div className="text-xs mt-2">
                Remember to configure your Google OAuth settings to use this redirect URI: <code className="bg-gray-100 px-1">{REDIRECT_URI}</code>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mt-4 border border-dashed border-gray-300 p-3 rounded-md bg-gray-50">
          <h3 className="text-sm font-medium mb-2">Setup Requirements:</h3>
          <ul className="text-xs space-y-1 text-gray-700">
            <li>• Set <code className="bg-gray-100 px-1">GOOGLE_CLIENT_ID</code> and <code className="bg-gray-100 px-1">GOOGLE_CLIENT_SECRET</code> secrets in Supabase</li>
            <li>• Add <code className="bg-gray-100 px-1">{window.location.origin}</code> to Authorized JavaScript origins</li>
            <li>• Add <code className="bg-gray-100 px-1">{REDIRECT_URI}</code> to Authorized redirect URIs</li>
          </ul>
        </div>
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
        
        {/* Debug button */}
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
