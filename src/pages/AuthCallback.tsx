
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

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
        // Get the session to verify if authentication was successful
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setError('Failed to verify authentication. Please try again.');
          toast.error('Authentication verification failed');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        if (data?.session) {
          console.log('Authentication successful, redirecting to home');
          toast.success('Successfully signed in!');
          navigate('/');
        } else {
          // If no session and no error, it could be that the session is still being established
          console.log('No session detected yet, waiting...');
          // Check again after a short delay
          setTimeout(async () => {
            const { data: retryData } = await supabase.auth.getSession();
            if (retryData?.session) {
              toast.success('Successfully signed in!');
              navigate('/');
            } else {
              setError('Could not establish a session. Please try logging in again.');
              toast.error('Authentication failed');
              navigate('/auth');
            }
          }, 2000);
        }
      } catch (err: any) {
        console.error('Auth callback processing error:', err);
        setError(err.message || 'An unexpected error occurred');
        toast.error(err.message || 'Authentication failed');
        setTimeout(() => navigate('/auth'), 3000);
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
        <div className="animate-pulse h-2 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

export default AuthCallback;
