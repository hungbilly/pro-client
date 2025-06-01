import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, LogOut, AlertTriangle, CheckCircle2, Bug, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import CalendarSelector from './CalendarSelector';

interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  token_type: string | null;
  expires_at: string | null;
  calendar_id?: string | null;
  calendar_name?: string | null;
  company_id?: string | null;
}

const GoogleCalendarIntegration: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [apiCallsHistory, setApiCallsHistory] = useState<any[]>([]);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const [updatingCalendar, setUpdatingCalendar] = useState(false);

  const origin = window.location.origin;
  const appRedirectUrl = `${origin}/settings`;

  const addToApiHistory = (callType: string, data: any) => {
    setApiCallsHistory(prev => [
      ...prev, 
      { 
        type: callType, 
        timestamp: new Date().toISOString(), 
        data 
      }
    ]);
  };

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
      }
    };
    
    fetchClientId();
  }, []);

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
              tokenExpiry: data.expires_at,
              userId: data.user_id,
              calendarId: data.calendar_id,
              calendarName: data.calendar_name
            });
          } else {
            console.log("User does not have Google Calendar integration");
          }
          addToApiHistory('fetch-integration', { 
            success: true, 
            hasIntegration: Boolean(data),
            userId: user.id
          });
        }
      } catch (error) {
        console.error('Exception when fetching integration:', error);
        toast.error('An error occurred while checking integration status');
        addToApiHistory('fetch-integration-exception', { error });
      } finally {
        setLoading(false);
        setInitialCheckComplete(true);
      }
    };

    fetchIntegration();
  }, [user]);

  const handleCalendarSelect = async (calendarId: string, calendarName: string) => {
    if (!user || !integration) return;
    
    setUpdatingCalendar(true);
    try {
      console.log('Updating calendar selection:', { calendarId, calendarName });
      
      const { error } = await supabase
        .from('user_integrations')
        .update({
          calendar_id: calendarId,
          calendar_name: calendarName,
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id);
      
      if (error) {
        throw error;
      }
      
      setIntegration(prev => prev ? {
        ...prev,
        calendar_id: calendarId,
        calendar_name: calendarName
      } : null);
      
      toast.success('Calendar selection updated successfully!');
    } catch (error) {
      console.error('Error updating calendar selection:', error);
      toast.error('Failed to update calendar selection');
    } finally {
      setUpdatingCalendar(false);
    }
  };

  const initiateGoogleAuth = async () => {
    if (!clientId || !user) {
      toast.error('Google OAuth is not properly configured or you\'re not logged in');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Starting Google Calendar integration process...');
      console.log('Application redirect URL:', appRedirectUrl);
      console.log('Current user ID:', user.id);
      
      const stateParam = JSON.stringify({
        userId: user.id,
        purpose: 'calendar_integration',
        redirectTo: appRedirectUrl,
        timestamp: new Date().getTime()
      });
      
      const { data, error } = await supabase.functions.invoke('create-google-calendar-auth-url', {
        body: {
          redirectUrl: appRedirectUrl,
          state: stateParam
        }
      });
      
      addToApiHistory('initiate-calendar-oauth', {
        success: !error,
        error: error?.message,
        hasRedirectUrl: Boolean(data?.url),
        requestOrigin: origin,
        redirectUrl: appRedirectUrl,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      
      if (error) {
        console.error('OAuth error:', error);
        toast.error(`Authentication failed: ${error.message}`);
        setError(error.message);
        return;
      }
      
      if (data && data.url) {
        console.log('Redirecting to Google auth URL:', data.url);
        window.location.href = data.url;
      } else {
        console.error('No redirect URL received');
        setError('Failed to initiate Google Calendar integration. No redirect URL received.');
        toast.error('Failed to initiate authentication');
      }
    } catch (error: any) {
      console.error('Google auth error:', error);
      setError(error.message || 'Google authentication failed');
      toast.error(error.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!user || !integration) return;
    
    try {
      setLoading(true);
      addToApiHistory('disconnect-start', { 
        integrationId: integration.id,
        userId: user.id 
      });
      
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
        }
      }
      
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

  const testCalendarIntegration = async () => {
    try {
      if (!user || !integration) {
        toast.error("No active integration to test");
        return;
      }
      
      const testEvent = {
        title: "Test Integration Event",
        description: "This is a test event to verify the integration is working properly.",
        date: new Date().toISOString().split('T')[0],
        isFullDay: false,
        startTime: "10:00",
        endTime: "10:30",
        location: "Integration Test"
      };

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      addToApiHistory('test-integration-start', { 
        userId: user.id,
        event: testEvent,
        hasIntegration: Boolean(integration),
        calendarId: integration.calendar_id
      });
      
      const { data, error } = await supabase.functions.invoke('add-to-calendar', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          testMode: true,
          testData: {
            event: testEvent,
            client: {
              id: "test-client-id",
              name: "Test Client",
              email: "test@example.com",
              phone: "555-1234",
              address: "Test Address"
            }
          },
          userId: user.id
        }
      });
      
      addToApiHistory('test-integration-response', { data, error });
      
      if (error) {
        toast.error(`Test failed: ${error.message}`);
        return;
      }
      
      if (data.error) {
        toast.error(`Test failed: ${data.message || data.error}`);
        return;
      }
      
      if (data.success) {
        toast.success('Test successful! Event created in your Google Calendar.');
      } else {
        toast.error('Test failed: No event was created');
      }
    } catch (error) {
      console.error('Error testing integration:', error);
      toast.error(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const showDebugInfo = () => {
    const debugData = {
      clientId: clientId ? `${clientId.substring(0, 6)}...` : null,
      clientIdLength: clientId?.length || 0,
      debugInfo,
      integration: integration ? {
        ...integration,
        access_token: integration.access_token ? "***" : null,
        refresh_token: integration.refresh_token ? "***" : null,
      } : null,
      apiCalls: apiCallsHistory,
      origin: origin,
      currentUrl: window.location.href,
      redirectUrl: appRedirectUrl,
      userId: user?.id,
      initialCheckComplete
    };
    
    toast(
      <div className="max-h-96 overflow-y-auto">
        <pre className="text-xs whitespace-pre-wrap bg-gray-100 p-2 rounded">
          {JSON.stringify(debugData, null, 2)}
        </pre>
        <Button 
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
            toast.success("Debug info copied to clipboard");
          }}
        >
          <Copy className="h-4 w-4 mr-2" /> Copy Debug Data
        </Button>
      </div>,
      {
        duration: 15000,
      }
    );
  };

  if (loading && !initialCheckComplete) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-3/4 bg-muted rounded mb-2"></div>
          <div className="h-4 w-1/2 bg-muted rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded mb-4"></div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="h-9 w-40 bg-muted rounded"></div>
          <div className="h-9 w-20 bg-muted rounded"></div>
        </CardFooter>
      </Card>
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
        {error && isAdmin && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              {error}
              <div className="text-xs mt-2">
                Redirect after auth: <code className="bg-gray-100 px-1">{appRedirectUrl}</code>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {!error && !clientId && isAdmin && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              Google OAuth is not properly configured. Please ask your administrator to set up the integration.
            </AlertDescription>
          </Alert>
        )}
        
        {clientId && integration ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Connected</AlertTitle>
              <AlertDescription className="text-green-700">
                Your account is connected to Google Calendar. 
                {integration.calendar_name ? (
                  <div className="mt-2">
                    Currently using: <span className="font-medium">{integration.calendar_name}</span>
                  </div>
                ) : (
                  <div className="mt-2 text-yellow-700">
                    Please select a calendar below to start creating events.
                  </div>
                )}
                {isAdmin && (
                  <div className="text-xs mt-2 text-green-600">
                    User ID: <code className="bg-green-100 px-1">{integration.user_id}</code>
                  </div>
                )}
              </AlertDescription>
            </Alert>
            
            <CalendarSelector
              selectedCalendarId={integration.calendar_id || undefined}
              onCalendarSelect={handleCalendarSelect}
            />
          </div>
        ) : clientId && (
          <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Not Connected</AlertTitle>
            <AlertDescription className="text-yellow-700">
              Connect your account to Google Calendar to enable automatic event creation and management.
              {isAdmin && (
                <div className="text-xs mt-2">
                  You'll be redirected back to: <code className="bg-gray-100 px-1">{appRedirectUrl}</code>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {isAdmin && (
          <div className="mt-4 border border-dashed border-gray-300 p-3 rounded-md">
            <h3 className="text-sm font-medium mb-2">Setup Requirements:</h3>
            <ul className="text-xs space-y-1 text-gray-700">
              <li>• Set <code className="bg-gray-100 px-1">GOOGLE_CLIENT_ID</code> and <code className="bg-gray-100 px-1">GOOGLE_CLIENT_SECRET</code> secrets in Supabase</li>
              <li>• Add <code className="bg-gray-100 px-1">{origin}</code> to Authorized JavaScript origins</li>
              <li>• Add <code className="bg-gray-100 px-1">{`${origin}/functions/v1/handle-google-calendar-callback`}</code> to Authorized redirect URIs</li>
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {clientId && integration ? (
          <>
            <Button 
              variant="destructive" 
              onClick={disconnectGoogleCalendar} 
              disabled={loading || updatingCalendar}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Disconnect Calendar
            </Button>
            {isAdmin && (
              <Button 
                variant="secondary" 
                onClick={testCalendarIntegration} 
                disabled={loading || updatingCalendar || !integration.calendar_id}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Test Integration
              </Button>
            )}
            {isAdmin && (
              <Link to="/calendar-test" className="ml-auto">
                <Button 
                  variant="outline"
                  size="sm" 
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Calendar Test Page
                </Button>
              </Link>
            )}
          </>
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
        
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={showDebugInfo}
            className={clientId && integration ? "" : "ml-auto"}
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug Info
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default GoogleCalendarIntegration;
