
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const stateParam = urlParams.get('state');
        
        if (!code) {
          setError('No authorization code received from Google');
          toast.error('Failed to connect Google Calendar');
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }
        
        if (!user) {
          setError('You must be logged in to connect Google Calendar');
          toast.error('Authentication required');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }
        
        // Call our exchange token edge function
        const response = await supabase.functions.invoke('google-auth-exchange', {
          body: { code, redirectUri: `${window.location.origin}/auth/google/callback` }
        });
        
        if (response.error) {
          throw new Error(response.error.message || 'Failed to exchange token');
        }
        
        const { access_token, refresh_token, expires_in, token_type } = response.data;
        
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
        setTimeout(() => navigate('/settings'), 3000);
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
          <div className="mb-4 text-red-500">{error}</div>
        ) : (
          <div className="mb-4">Please wait while we complete the integration...</div>
        )}
        <div className="animate-pulse h-2 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
