
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleGoogleCallback = async () => {
      // Check if there are error params in the URL
      const url = new URL(window.location.href);
      const errorParam = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      if (errorParam) {
        console.error('Google auth callback error:', { errorParam, errorDescription });
        setError(errorDescription || errorParam);
        toast.error(errorDescription || 'Authentication failed');
        setTimeout(() => navigate('/settings'), 3000);
        setProcessing(false);
        return;
      }

      try {
        // Get the session to verify if authentication was successful
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (data?.session) {
          // Store the Google integration
          const { error: integrationError } = await supabase
            .from('user_integrations')
            .upsert({
              user_id: data.session.user.id,
              provider: 'google_calendar',
              provider_user_id: data.session.user.email,
              access_token: 'stored_securely_by_supabase',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (integrationError) {
            throw integrationError;
          }

          toast.success('Google Calendar connected successfully!');
          navigate('/settings');
        } else {
          throw new Error('No session found after Google authentication');
        }
      } catch (err: any) {
        console.error('Google auth callback processing error:', err);
        setError(err.message || 'An unexpected error occurred');
        toast.error(err.message || 'Google Calendar integration failed');
        setTimeout(() => navigate('/settings'), 3000);
      } finally {
        setProcessing(false);
      }
    };

    handleGoogleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">
          {error ? 'Google Calendar Integration Error' : 'Connecting Google Calendar...'}
        </h1>
        {error ? (
          <div className="mb-4 text-red-500">{error}</div>
        ) : (
          <div className="mb-4">
            {processing ? 'Please wait while we complete the integration...' : 'Redirecting to settings...'}
          </div>
        )}
        <div className="animate-pulse h-2 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
