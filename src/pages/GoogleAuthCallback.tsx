
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code and error from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const stateParam = urlParams.get('state');
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        // Collect details for debugging
        const callbackDetails = {
          hasCode: Boolean(code),
          hasState: Boolean(stateParam),
          hasError: Boolean(errorParam),
          errorParam,
          errorDescription,
          redirectUri: `${window.location.origin}/auth/google/callback`,
          currentUrl: window.location.href,
        };
        setDetails(callbackDetails);
        
        // If there's an error in the URL, display it
        if (errorParam) {
          const errorMessage = errorDescription || errorParam;
          console.error('Google OAuth error:', errorMessage);
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
        
        // Check for missing user
        if (!user) {
          setError('You must be logged in to connect Google Calendar');
          toast.error('Authentication required');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }
        
        // Call our exchange token edge function
        const response = await supabase.functions.invoke('google-auth-exchange', {
          body: { 
            code, 
            redirectUri: `${window.location.origin}/auth/google/callback` 
          }
        });
        
        if (response.error) {
          console.error('Token exchange error:', response.error);
          setError(`Token exchange error: ${response.error.message}`);
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
                <p className="text-sm font-bold mb-1">Debug information:</p>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(details, null, 2)}
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
