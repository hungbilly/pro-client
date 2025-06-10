import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import AuthPricingGrid from "@/components/ui-custom/AuthPricingGrid";
import SignUpDialog from "@/components/ui-custom/SignUpDialog";
import Footer from "@/components/Footer";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user
  } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signUpDialogOpen, setSignUpDialogOpen] = useState(false);
  const appCallbackUrl = `${window.location.origin}/auth/callback`;

  useEffect(() => {
    if (location.state && location.state.signUp === true) {
      setIsLogin(false);
      setIsForgotPassword(false);
    }
  }, [location.state]);

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
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
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
          // Instead of showing a toast, redirect to the email verification page
          navigate('/auth/verify-email', { state: { email } });
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
      <div className="min-h-screen relative overflow-hidden">
        {/* Enhanced Glassmorphism Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400/30 via-blue-500/20 to-purple-600/40"></div>
          <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse-soft"></div>
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-400/15 rounded-full blur-3xl animate-pulse-soft"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 md:p-8">
            <div className="flex flex-col justify-center space-y-6 my-0">
              <div className="flex flex-col items-start">
                <div className="glass-panel p-4 rounded-2xl mb-4">
                  <img 
                    alt="ProClient Logo" 
                    src="/lovable-uploads/9fd4660b-36e4-4596-9ee9-60b3c52c8c69.png" 
                    className="h-19 object-contain" 
                  />
                </div>
                <p className="text-xl text-white/90 mb-6 backdrop-blur-sm bg-white/10 p-4 rounded-xl border border-white/20">
                  Simply define your services and manage your clients. Track jobs, create professional invoices, and get paid faster.
                </p>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight py-0 text-white drop-shadow-lg">
                ProClient
                <span className="text-white/90 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent"> Management System</span>
              </h1>
              <div className="flex flex-col space-y-4">
                <div className="glass-panel p-6 rounded-2xl">
                  <p className="text-lg text-white/95">
                    ✓ Easy client management
                    <br />
                    ✓ Professional invoicing
                    <br />
                    ✓ Job tracking & scheduling
                    <br />
                    ✓ Payment processing
                  </p>
                </div>
                <p className="text-sm text-white/80 italic backdrop-blur-sm bg-white/5 p-3 rounded-lg border border-white/10">No credit card is required for a 7-day trial. After that, your first registration with a credit card will grant you 30 days free!</p>
              </div>
            </div>

            <div className="space-y-8">
              <Card className="w-full glass-card border-white/30 shadow-2xl">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl text-center text-white">
                    {isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Start Your Free Trial'}
                  </CardTitle>
                  <CardDescription className="text-center text-white/80">
                    {isForgotPassword ? 'Enter your email to receive password reset instructions' : isLogin ? 'Sign in to access your account' : 'Create your account and start managing clients today'}
                  </CardDescription>
                </CardHeader>
                
                {errorMessage && <div className="px-6">
                    <Alert variant="destructive" className="glass-alert border-red-300/50 bg-red-500/20 backdrop-blur-md">
                      <AlertDescription className="text-white">{errorMessage}</AlertDescription>
                    </Alert>
                  </div>}
                
                <form onSubmit={handleAuth}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/90">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="email@example.com" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                        className="glass-input bg-white/10 border-white/30 text-white placeholder:text-white/60 backdrop-blur-md focus:bg-white/20 focus:border-white/50"
                      />
                    </div>
                    
                    {!isForgotPassword && <div className="space-y-2">
                        <Label htmlFor="password" className="text-white/90">Password</Label>
                        <Input 
                          id="password" 
                          type="password" 
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          required 
                          className="glass-input bg-white/10 border-white/30 text-white placeholder:text-white/60 backdrop-blur-md focus:bg-white/20 focus:border-white/50"
                        />
                      </div>}
                    
                    {!isForgotPassword && !isLogin && (
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-white/90">Confirm Password</Label>
                        <Input 
                          id="confirm-password" 
                          type="password" 
                          value={confirmPassword} 
                          onChange={e => setConfirmPassword(e.target.value)} 
                          required 
                          className="glass-input bg-white/10 border-white/30 text-white placeholder:text-white/60 backdrop-blur-md focus:bg-white/20 focus:border-white/50"
                        />
                      </div>
                    )}
                    
                    {!isForgotPassword && <>
                        <div className="flex items-center gap-4 py-2">
                          <Separator className="flex-1 bg-white/30" />
                          <span className="text-sm text-white/70">or</span>
                          <Separator className="flex-1 bg-white/30" />
                        </div>
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full flex gap-2 items-center justify-center glass-button bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 backdrop-blur-md transition-all duration-300" 
                          onClick={handleGoogleSignIn} 
                          disabled={loading}
                        >
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
                    <Button 
                      type="submit" 
                      className="w-full glass-button-primary bg-white/20 hover:bg-white/30 text-white border border-white/40 backdrop-blur-md transition-all duration-300 hover:scale-105" 
                      disabled={loading}
                    >
                      {loading ? isForgotPassword ? 'Sending reset instructions...' : isLogin ? 'Signing in...' : 'Creating account...' : isForgotPassword ? 'Send reset instructions' : isLogin ? 'Sign in' : 'Start Free Trial'}
                    </Button>
                    
                    {!isForgotPassword && <Button 
                      type="button" 
                      variant="link" 
                      className="w-full text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm rounded-lg transition-all duration-300" 
                      onClick={() => {
                        if (isLogin) {
                          // Open the SignUpDialog instead of toggling isLogin
                          setSignUpDialogOpen(true);
                        } else {
                          setIsLogin(true);
                        }
                      }}
                    >
                      {isLogin ? "Not a member yet? Start your free trial" : "Already have an account? Sign in"}
                    </Button>}
                    
                    <Button 
                      type="button" 
                      variant="link" 
                      className="w-full text-sm text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm rounded-lg transition-all duration-300" 
                      onClick={() => {
                        setIsForgotPassword(!isForgotPassword);
                        setErrorMessage(null);
                      }}
                    >
                      {isForgotPassword ? 'Back to login' : 'Forgot password?'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              <div className="glass-panel p-8 rounded-2xl border-white/20 flex items-center justify-center">
                <p className="text-white/80 text-center">
                  Tutorial video placeholder
                  <br />
                  <span className="text-sm">Coming soon</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AuthFeaturesGrid />
      <AuthPricingGrid />
      <Footer />
      
      {/* Add the SignUpDialog component */}
      <SignUpDialog open={signUpDialogOpen} onOpenChange={setSignUpDialogOpen} />
    </PageTransition>;
};

export default Auth;
