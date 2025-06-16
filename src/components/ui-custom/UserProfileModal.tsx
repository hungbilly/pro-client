
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CreditCard, User } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    subscription, 
    isInTrialPeriod, 
    trialDaysLeft, 
    trialEndDate,
    createSubscription,
    cancelSubscription,
    isCancelling
  } = useSubscription();
  
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile tab state
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // Password tab state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    setIsUpdatingProfile(true);
    setProfileError(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName }
      });
      
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile was updated successfully",
      });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setProfileError(error.message || 'Failed to update profile');
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || 'Failed to update profile',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordUpdate = async () => {
    setPasswordError(null);
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    setIsUpdatingPassword(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password was updated successfully",
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Failed to update password:', error);
      setPasswordError(error.message || 'Failed to update password');
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || 'Failed to update password',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSubscribe = async () => {
    const url = await createSubscription(true);
    if (url) {
      window.location.href = url;
    }
  };

  const handleCancelSubscription = async () => {
    const success = await cancelSubscription();
    if (success) {
      setActiveTab('profile');
    }
  };

  const getSubscriptionStatus = () => {
    if (subscription?.status === 'active') {
      return {
        label: 'Active Subscription',
        description: `Your subscription is active until ${format(new Date(subscription.currentPeriodEnd), 'MMMM d, yyyy')}`,
        className: 'bg-green-50 border-green-200',
        textClass: 'text-green-700'
      };
    } 
    
    if (isInTrialPeriod && trialDaysLeft > 0) {
      return {
        label: 'Trial Period',
        description: `Your trial ends in ${trialDaysLeft} days (${trialEndDate ? format(new Date(trialEndDate), 'MMMM d, yyyy') : 'soon'})`,
        className: 'bg-amber-50 border-amber-200',
        textClass: 'text-amber-700'
      };
    }
    
    return {
      label: 'No Active Subscription',
      description: 'Subscribe to access all premium features',
      className: 'bg-gray-50 border-gray-200',
      textClass: 'text-gray-700'
    };
  };

  const status = getSubscriptionStatus();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>
            Update your profile information or change your password.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full">
            <TabsTrigger value="profile" className="flex items-center gap-1 flex-1">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-1 flex-1">
              <CreditCard className="h-4 w-4" />
              <span>Password</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-1 flex-1">
              <Calendar className="h-4 w-4" />
              <span>Subscription</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="py-4 space-y-4">
            {profileError && (
              <Alert variant="destructive">
                <AlertDescription>{profileError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Your email cannot be changed
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                onClick={handleProfileUpdate}
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="password" className="py-4 space-y-4">
            {passwordError && (
              <Alert variant="destructive">
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                onClick={handlePasswordUpdate}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="subscription" className="py-4 space-y-4">
            <div className={`border rounded-md p-4 ${status.className}`}>
              <h3 className={`text-lg font-medium ${status.textClass}`}>{status.label}</h3>
              <p className={`text-sm ${status.textClass}`}>{status.description}</p>
            </div>
            
            <div className="space-y-4">
              {subscription?.status === 'active' ? (
                <Button
                  variant="destructive"
                  onClick={handleCancelSubscription}
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Processing...' : 'Cancel Subscription'}
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={() => {
                    onClose();
                    navigate('/subscription');
                  }}
                >
                  View Subscription Plans
                </Button>
              )}
              
              <div>
                <p className="text-sm text-muted-foreground">
                  {subscription?.status === 'active' 
                    ? 'Your subscription will continue until the end of the current billing period.'
                    : 'Upgrade to premium to access all features.'}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;
