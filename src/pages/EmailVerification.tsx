
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedBackground } from '@/components/ui-custom/AnimatedBackground';
import PageTransition from '@/components/ui-custom/PageTransition';
import { CheckCircle, Mail, RefreshCw } from 'lucide-react';

const EmailVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email } = location.state || {};
  const [resending, setResending] = useState(false);

  if (!email) {
    navigate('/auth');
    return null;
  }

  const handleResendVerification = async () => {
    try {
      setResending(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (error) throw error;
      
      toast.success('Verification email resent successfully!');
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  return (
    <PageTransition>
      <AnimatedBackground className="flex items-center justify-center min-h-screen bg-sky-100">
        <div className="w-full max-w-md p-4">
          <Card className="w-full backdrop-blur-sm bg-white/80 border-transparent shadow-soft">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-2">
                <CheckCircle className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl text-center">Verify Your Email</CardTitle>
              <CardDescription className="text-center">
                We've sent a verification email to:
              </CardDescription>
              <div className="flex items-center justify-center gap-2 font-medium text-lg">
                <Mail className="h-5 w-5" />
                <span className="text-primary">{email}</span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4 text-center">
              <p>Please check your inbox and click the verification link to activate your account.</p>
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <p className="text-sm text-blue-600">
                  If you don't see the email, please check your spam folder or request a new verification email.
                </p>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleResendVerification}
                disabled={resending}
              >
                {resending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </Button>
              
              <Button 
                variant="link" 
                className="w-full" 
                onClick={() => navigate('/auth')}
              >
                Back to Login
              </Button>
            </CardFooter>
          </Card>
        </div>
      </AnimatedBackground>
    </PageTransition>
  );
};

export default EmailVerification;
