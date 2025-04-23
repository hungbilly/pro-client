import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedBackground } from '@/components/ui-custom/AnimatedBackground';
import PageTransition from '@/components/ui-custom/PageTransition';
import { useAuth } from '@/context/AuthContext';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Auth = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const appCallbackUrl = `${window.location.origin}/auth/callback`;

  useEffect(() => {
    const checkForLogoutRedirect = async () => {
      if (window.location.search.includes('logout')) {
        try {
          console.log('Detected logout parameter, clearing local storage and session storage');
          window.localStorage.clear();
          window.sessionStorage.clear();
          try {
            await supabase.auth.signOut({
              scope: 'global'
            });
            console.log('Successfully signed out of Supabase');
          } catch (error) {
            console.log('Already signed out or error signing out:', error);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
    };
    checkForLogoutRedirect();
  }, []);

  useEffect(() => {
    if (user) {
      console.log('Auth page: User already logged in, redirecting to home');
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    if (errorParam || errorDescription) {
      const errorMsg = errorDescription || errorParam || 'Authentication error occurred';
      setErrorMessage(errorMsg);
      console.error('Auth error from URL params:', {
        errorParam,
        errorDescription
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      if (isForgotPassword) {
        const {
          error
        } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`
        });
        if (error) throw error;
        toast.success('Password reset instructions sent to your email');
        setIsForgotPassword(false);
      } else if (isLogin) {
        console.log('Attempting to sign in with email:', email);
        const {
          error,
          data
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid username/password combination');
          }
          throw error;
        }
        console.log('Sign in successful:', data);
        toast.success('Successfully signed in!');
        navigate('/');
      } else {
        console.log('Attempting to sign up with email:', email);
        const {
          error,
          data
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              is_admin: false
            },
            emailRedirectTo: appCallbackUrl
          }
        });
        if (error) throw error;
        console.log('Sign up successful:', data);
        if (data?.user?.identities?.length === 0) {
          toast.error('This email is already registered. Please sign in instead.');
          setIsLogin(true);
        } else {
          toast.success('Registration successful! Please check your email for confirmation.');
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setErrorMessage(error.message || 'Authentication failed');
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      console.log('Starting Google sign-in process...');
      console.log('Using callback URL:', appCallbackUrl);
      const {
        data,
        error
      } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: appCallbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      console.log('Google sign-in response:', {
        data,
        error
      });
      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }
      if (data && data.url) {
        console.log('Redirecting to Google auth URL:', data.url);
        window.location.href = data.url;
      } else {
        console.error('No redirect URL received from Supabase');
        setErrorMessage('Failed to initiate Google sign-in. No redirect URL received.');
      }
    } catch (error: any) {
      console.error('Google auth error:', error);
      setErrorMessage(error.message || 'Google authentication failed');
      toast.error(error.message || 'Google authentication failed');
      setLoading(false);
    }
  };

  return <PageTransition>
      <AnimatedBackground className="flex items-center justify-center min-h-screen bg-sky-100">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 md:p-8">
          <div className="flex flex-col justify-center space-y-6 my-0">
            <img alt="ProClient Logo" src="/lovable-uploads/9fd4660b-36e4-4596-9ee9-60b3c52c8c69.png" className="h-19 mb-4 self-start object-contain" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight py-0">
              ProClient
              <span className="text-primary"> Management System</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Simply define your services and manage your clients. Track jobs, create professional invoices, and get paid faster.
            </p>
            <div className="flex flex-col space-y-4">
              <p className="text-lg">
                ✓ Easy client management
                <br />
                ✓ Professional invoicing
                <br />
                ✓ Job tracking & scheduling
                <br />
                ✓ Payment processing
              </p>
              <p className="text-sm text-muted-foreground italic">No credit card is required for a 7-day trial. After that, your first registration with a credit card will grant you 30 days free!</p>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </PageTransition>;
};

export default Auth;
