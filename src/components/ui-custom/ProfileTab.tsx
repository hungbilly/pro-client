
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const ProfileTab: React.FC = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

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

  return (
    <div className="py-4 space-y-4">
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
    </div>
  );
};

export default ProfileTab;
