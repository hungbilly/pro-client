
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check if there are error params in the URL
      const url = new URL(window.location.href);
      const errorParam = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      if (errorParam) {
        console.error('Auth callback error:', { errorParam, errorDescription });
        setError(errorDescription || errorParam);
        toast.error(errorDescription || 'Authentication failed');
        // Redirect to login page after a short delay
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      try {
        console.log('AuthCallback: Processing authentication callback...');
        
        // Process the URL fragment if needed for some auth providers
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        // Clear the hash fragment from the URL to prevent issues with subsequent navigation
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        
        if (accessToken) {
          console.log('AuthCallback: Found access token in URL hash, attempting to set session...');
          try {
            // Try to set session from hash params if present
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            if (error) {
              console.error('Session setting error:', error);
              throw error;
            }
            
            // Successfully set session, check if it's valid
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) {
              throw userError;
            }
            
            console.log('Successfully set session from URL params for user:', userData.user?.email);
            toast.success('Successfully signed in!');
            navigate('/');
            return;
          } catch (err) {
            console.error('Error setting session from URL params:', err);
            // Continue to try getting session as fallback
          }
        }
        
        // Try to get the session - this should work if the URL parameters were already processed by Supabase
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setError('Failed to verify authentication. Please try again.');
          toast.error('Authentication verification failed');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        if (data?.session) {
          console.log('Authentication successful, session found:', data.session.user.email);
          toast.success('Successfully signed in!');
          navigate('/');
        } else {
          // If no session and no error, it could be that the session is still being established
          console.log('No session detected yet, waiting...');
          // Check again after a short delay
          setTimeout(async () => {
            try {
              const { data: retryData, error: retryError } = await supabase.auth.getSession();
              
              if (retryError) {
                throw retryError;
              }
              
              if (retryData?.session) {
                toast.success('Successfully signed in!');
                navigate('/');
              } else {
                setError('Could not establish a session. Please try logging in again.');
                toast.error('Authentication failed');
                navigate('/auth');
              }
            } catch (retryErr: any) {
              console.error('Retry session check error:', retryErr);
              setError(retryErr.message || 'Authentication failed');
              toast.error(retryErr.message || 'Authentication failed');
              navigate('/auth');
            } finally {
              setIsProcessing(false);
            }
          }, 2000);
        }
      } catch (err: any) {
        console.error('Auth callback processing error:', err);
        setError(err.message || 'An unexpected error occurred');
        toast.error(err.message || 'Authentication failed');
        setTimeout(() => navigate('/auth'), 3000);
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">
          {error ? 'Authentication Error' : 'Finishing Authentication...'}
        </h1>
        {error ? (
          <div className="mb-4 text-red-500">{error}</div>
        ) : (
          <div className="mb-4">Please wait while we complete your sign in...</div>
        )}
        {isProcessing && (
          <div className="animate-pulse h-2 bg-gray-200 rounded"></div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
