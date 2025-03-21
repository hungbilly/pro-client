
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
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
      
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setProfileError(error.message || 'Failed to update profile');
      toast.error(error.message || 'Failed to update profile');
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
      
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Failed to update password:', error);
      setPasswordError(error.message || 'Failed to update password');
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;
