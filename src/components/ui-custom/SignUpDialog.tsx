
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SignUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const appCallbackUrl = `${window.location.origin}/auth/callback`;

const SignUpDialog: React.FC<SignUpDialogProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
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
        navigate('/auth/verify-email', { state: { email }});
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">Create Your Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSignUp}>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                required
                disabled={loading}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                required
                disabled={loading}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm-password">Confirm Password</Label>
              <Input
                id="signup-confirm-password"
                type="password"
                value={confirmPassword}
                required
                disabled={loading}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
              />
            </div>
            {errorMsg && (
              <div className="text-destructive text-sm text-center">{errorMsg}</div>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-4 pt-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
            >
              Continue with Google
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SignUpDialog;
