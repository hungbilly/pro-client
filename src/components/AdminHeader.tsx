
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';

const AdminHeader: React.FC = () => {
  const { signOut, user } = useAuth();

  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="container px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Admin Portal</span>
          {user && (
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </header>
  );
};

export default AdminHeader;
