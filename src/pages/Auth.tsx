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
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Application home page URL - where we want users to land after authentication
  const appCallbackUrl = `${window.location.origin}/auth/callback`;
  useEffect(() => {
    // Check if we're returning after a logout
    const checkForLogoutRedirect = async () => {
      if (window.location.search.includes('logout')) {
        try {
          console.log('Detected logout parameter, clearing local storage and session storage');
          window.localStorage.clear();
          window.sessionStorage.clear();
          try {
            // Attempt to explicitly sign out from Supabase - this will clear any remaining session tokens
            await supabase.auth.signOut({
              scope: 'global'
            });
            console.log('Successfully signed out of Supabase');
          } catch (error) {
            console.log('Already signed out or error signing out:', error);
          }

          // Remove the logout parameter from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
    };
    checkForLogoutRedirect();
  }, []);
  useEffect(() => {
    // If user is already logged in, redirect to home page
    if (user) {
      console.log('Auth page: User already logged in, redirecting to home');
      navigate('/');
    }
  }, [user, navigate]);
  useEffect(() => {
    // Check for authentication errors in URL
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

      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      if (isLogin) {
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
          // User already exists
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
        // We use location.href to do a full page navigation rather than React Router
        // This ensures cookies and tokens are properly handled
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
      <AnimatedBackground className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
          <CardHeader className="space-y-1 flex flex-col items-center">
            <img src="/lovable-uploads/e91c3f9d-6553-4f7c-be95-21b5d283dd83.png" alt="ProClient Logo" className="h-48 w-auto mb-4" />
            <CardTitle className="text-2xl text-center">
              {isLogin ? 'Sign In' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to {isLogin ? 'sign in to' : 'create'} your account
            </CardDescription>
          </CardHeader>
          
          {errorMessage && <div className="px-6">
              <Alert variant="destructive">
                <AlertDescription>
                  {errorMessage}
                </AlertDescription>
              </Alert>
            </div>}
          
          <form onSubmit={handleAuth}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              
              <div className="flex items-center gap-4 py-2">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>
              
              <Button type="button" variant="outline" className="w-full flex gap-2 items-center justify-center" onClick={handleGoogleSignIn} disabled={loading}>
                <svg viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                </svg>
                Continue with Google
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? isLogin ? 'Signing in...' : 'Creating account...' : isLogin ? 'Sign in' : 'Create account'}
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </AnimatedBackground>
    </PageTransition>;
};
export default Auth;