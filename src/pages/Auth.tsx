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
import AuthFeaturesGrid from "@/components/ui-custom/AuthFeaturesGrid";

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
            <div className="flex flex-col items-start">
              <img 
                alt="ProClient Logo" 
                src="/lovable-uploads/9fd4660b-36e4-4596-9ee9-60b3c52c8c69.png" 
                className="h-19 mb-4 self-start object-contain" 
              />
              <p className="text-xl text-muted-foreground mb-6">
                Simply define your services and manage your clients. Track jobs, create professional invoices, and get paid faster.
              </p>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight py-0">
              ProClient
              <span className="text-primary"> Management System</span>
            </h1>
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

          <div className="space-y-8">
            <Card className="w-full backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">
                  {isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Start Your Free Trial'}
                </CardTitle>
                <CardDescription className="text-center">
                  {isForgotPassword ? 'Enter your email to receive password reset instructions' : isLogin ? 'Sign in to access your account' : 'Create your account and start managing clients today'}
                </CardDescription>
              </CardHeader>
              
              {errorMessage && <div className="px-6">
                  <Alert variant="destructive">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                </div>}
              
              <form onSubmit={handleAuth}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  
                  {!isForgotPassword && <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>}
                  
                  {!isForgotPassword && <>
                      <div className="flex items-center gap-4 py-2">
                        <Separator className="flex-1" />
                        <span className="text-sm text-muted-foreground">or</span>
                        <Separator className="flex-1" />
                      </div>
                      
                      <Button type="button" variant="outline" className="w-full flex gap-2 items-center justify-center" onClick={handleGoogleSignIn} disabled={loading}>
                        <svg viewBox="0 0 48 48" className="w-5 h-5">
                          <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                          <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                          <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                          <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                        </svg>
                        Continue with Google
                      </Button>
                    </>}
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? isForgotPassword ? 'Sending reset instructions...' : isLogin ? 'Signing in...' : 'Creating account...' : isForgotPassword ? 'Send reset instructions' : isLogin ? 'Sign in' : 'Start Free Trial'}
                  </Button>
                  
                  {!isForgotPassword && <Button type="button" variant="link" className="w-full" onClick={() => setIsLogin(!isLogin)}>
                      {isLogin ? "Not a member yet? Start your free trial" : "Already have an account? Sign in"}
                    </Button>}
                  
                  <Button type="button" variant="link" className="w-full text-sm" onClick={() => {
                  setIsForgotPassword(!isForgotPassword);
                  setErrorMessage(null);
                }}>
                    {isForgotPassword ? 'Back to login' : 'Forgot password?'}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/5 border-2 border-dashed border-gray-200 flex items-center justify-center">
              <p className="text-muted-foreground text-center p-4">
                Tutorial video placeholder
                <br />
                <span className="text-sm">Coming soon</span>
              </p>
            </div>
          </div>
        </div>
      </AnimatedBackground>
      <AuthFeaturesGrid />
    </PageTransition>;
};

export default Auth;
