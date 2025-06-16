
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { User, CreditCard, Calendar } from 'lucide-react';
import ProfileTab from './ProfileTab';
import PasswordTab from './PasswordTab';
import SubscriptionTab from './SubscriptionTab';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('profile');

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
            <TabsTrigger value="profile" className="flex items-center justify-center gap-1 flex-1 truncate">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center justify-center gap-1 flex-1 truncate">
              <CreditCard className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Password</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center justify-center gap-1 flex-1 truncate">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Subscription</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>
          
          <TabsContent value="password">
            <PasswordTab />
          </TabsContent>
          
          <TabsContent value="subscription">
            <SubscriptionTab onClose={onClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;
