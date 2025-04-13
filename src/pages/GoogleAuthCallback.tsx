
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [exchangeResponse, setExchangeResponse] = useState<any>(null);
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code, state and error from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const stateParam = urlParams.get('state');
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        // Default Supabase redirect URI
        const supabaseRedirectUri = `https://htjvyzmuqsrjpesdurni.supabase.co/auth/v1/callback`;
        
        // Collect details for debugging
        const callbackDetails = {
          hasCode: Boolean(code),
          codeLength: code ? code.length : 0,
          hasState: Boolean(stateParam),
          stateValue: stateParam ? stateParam.substring(0, 8) + '...' : null,
          hasError: Boolean(errorParam),
          errorParam,
          errorDescription,
          redirectUri: supabaseRedirectUri,
          currentUrl: window.location.href,
          timestamp: new Date().toISOString()
        };
        setDetails(callbackDetails);
        console.log("Google Auth callback details:", callbackDetails);
        
        // If there's an error in the URL, display it
        if (errorParam) {
          const errorMessage = errorDescription || errorParam;
          console.error('Google OAuth error from URL:', errorMessage);
          setError(`Google OAuth error: ${errorMessage}`);
          return;
        }
        
        // Check for missing code
        if (!code) {
          setError('No authorization code received from Google');
          toast.error('Failed to connect Google Calendar');
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }
        
        // Check for missing state
        if (!stateParam) {
          setError('OAuth state parameter missing');
          toast.error('Authentication error: missing state parameter');
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }
        
        // Check for missing user
        if (!user) {
          setError('You must be logged in to connect Google Calendar');
          toast.error('Authentication required');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }
        
        // Call our exchange token edge function
        console.log("Calling token exchange function with code length:", code.length);
        const response = await supabase.functions.invoke('google-auth-exchange', {
          body: { 
            code, 
            redirectUri: supabaseRedirectUri,
            state: stateParam
          }
        });
        
        // Store the response for debugging
        setExchangeResponse(response);
        console.log("Token exchange response:", response);
        
        if (response.error) {
          console.error('Token exchange error:', response.error);
          setError(`Token exchange error: ${response.error.message || JSON.stringify(response.error)}`);
          return;
        }
        
        const { access_token, refresh_token, expires_in, token_type } = response.data;
        
        if (!access_token) {
          setError('No access token received from Google');
          return;
        }
        
        // Calculate when the token expires
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);
        
        // Store the tokens in the database
        const { error: upsertError } = await supabase
          .from('user_integrations')
          .upsert({
            user_id: user.id,
            provider: 'google_calendar',
            access_token,
            refresh_token,
            token_type,
            expires_at: expiresAt.toISOString()
          }, { onConflict: 'user_id,provider' });
          
        if (upsertError) {
          console.error('Database error storing tokens:', upsertError);
          throw upsertError;
        }
        
        toast.success('Successfully connected to Google Calendar');
        navigate('/settings');
      } catch (err: any) {
        console.error('Error in Google auth callback:', err);
        setError(err.message || 'An error occurred during authentication');
        toast.error('Failed to connect Google Calendar');
      }
    };
    
    handleCallback();
  }, [navigate, user]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(JSON.stringify(text, null, 2));
    toast.success('Copied to clipboard');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">
          {error ? 'Connection Error' : 'Connecting to Google Calendar...'}
        </h1>
        
        {error ? (
          <div className="mb-4">
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="whitespace-pre-wrap text-left">
                {error}
              </AlertDescription>
            </Alert>
            
            {details && (
              <div className="mt-4 text-left">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold">Callback Details:</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => copyToClipboard(details)}
                    className="h-6 gap-1"
                  >
                    <Copy size={12} /> Copy
                  </Button>
                </div>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(details, null, 2)}
                </pre>
              </div>
            )}
            
            {exchangeResponse && (
              <div className="mt-4 text-left">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold">API Response:</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => copyToClipboard(exchangeResponse)}
                    className="h-6 gap-1"
                  >
                    <Copy size={12} /> Copy
                  </Button>
                </div>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(exchangeResponse, null, 2)}
                </pre>
              </div>
            )}
            
            <Button 
              onClick={() => navigate('/settings')} 
              className="mt-4"
            >
              Return to Settings
            </Button>
          </div>
        ) : (
          <div className="mb-4">
            <div className="mb-4">Please wait while we complete the integration...</div>
            <div className="animate-pulse h-2 bg-gray-200 rounded"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
