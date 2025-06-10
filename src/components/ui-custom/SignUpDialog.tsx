import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface SignUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const appCallbackUrl = `${window.location.origin}/auth/callback`;

const signUpSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine(val => val === true, { 
    message: "You must agree to the Terms of Service and Privacy Policy"
  })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

const SignUpDialog: React.FC<SignUpDialogProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false
    }
  });

  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { is_admin: false },
          emailRedirectTo: appCallbackUrl
        }
      });
      
      if (error) throw error;
      
      if (data?.user?.identities?.length === 0) {
        setErrorMsg("This email is already registered. Please sign in instead.");
      } else {
        // Close the dialog and redirect to verification page
        onOpenChange(false);
        navigate('/auth/verify-email', { state: { email: values.email }});
      }
    } catch (error: any) {
      setErrorMsg(error?.message || "Authentication failed");
      toast.error(error?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: appCallbackUrl
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error?.message || "Google sign in failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-enhanced border-white/40 backdrop-blur-xl bg-white/25 shadow-glass-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-gray-900 font-bold text-xl">Create Your Account</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSignUp)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <Label htmlFor="signup-email" className="text-gray-800 font-medium">Email</Label>
                  <FormControl>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      autoFocus
                      disabled={loading}
                      className="glass-input-enhanced bg-white/30 border-white/50 text-gray-900 placeholder:text-gray-600 backdrop-blur-md focus:bg-white/40 focus:border-white/70 shadow-glass"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-600 font-medium" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <Label htmlFor="signup-password" className="text-gray-800 font-medium">Password</Label>
                  <FormControl>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Password"
                      disabled={loading}
                      className="glass-input-enhanced bg-white/30 border-white/50 text-gray-900 placeholder:text-gray-600 backdrop-blur-md focus:bg-white/40 focus:border-white/70 shadow-glass"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-600 font-medium" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="text-gray-800 font-medium">Confirm Password</Label>
                  <FormControl>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Confirm Password"
                      disabled={loading}
                      className="glass-input-enhanced bg-white/30 border-white/50 text-gray-900 placeholder:text-gray-600 backdrop-blur-md focus:bg-white/40 focus:border-white/70 shadow-glass"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-600 font-medium" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agreeToTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                  <FormControl>
                    <Checkbox 
                      id="terms" 
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={loading}
                      className="glass-input-enhanced border-white/50 data-[state=checked]:bg-blue-600/80 data-[state=checked]:border-blue-400/70 shadow-glass"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="terms" className="text-sm font-medium text-gray-800">
                      I agree to the <Link to="/terms" className="text-blue-700 hover:text-blue-900 hover:underline font-medium" target="_blank">Terms of Service</Link> and <Link to="/privacy" className="text-blue-700 hover:text-blue-900 hover:underline font-medium" target="_blank">Privacy Policy</Link>
                    </Label>
                    <FormMessage className="text-red-600 font-medium" />
                  </div>
                </FormItem>
              )}
            />

            {errorMsg && (
              <div className="glass-alert bg-red-500/20 border border-red-300/50 backdrop-blur-md rounded-lg p-3">
                <div className="text-red-800 text-sm text-center font-medium">{errorMsg}</div>
              </div>
            )}

            <DialogFooter className="flex flex-col gap-4 pt-4">
              <Button 
                type="submit" 
                className="w-full glass-button-primary-enhanced bg-blue-600/80 hover:bg-blue-700/80 text-white border border-blue-400/50 backdrop-blur-md transition-all duration-300 hover:scale-105 shadow-glass-lg font-medium" 
                disabled={loading}
              >
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
              
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-400/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white/20 px-2 text-gray-600 font-medium backdrop-blur-sm rounded">Or continue with</span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full glass-button-enhanced bg-white/25 border-white/50 text-gray-800 hover:bg-white/35 hover:border-white/70 backdrop-blur-md transition-all duration-300 shadow-glass font-medium"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                Continue with Google
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SignUpDialog;
