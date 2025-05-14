
import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserSelectorProps {
  onUserSelect: (userId: string) => void;
}

interface UserOption {
  id: string;
  email: string;
}

const UserSelector = ({ onUserSelect }: UserSelectorProps) => {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No active session');
        }

        const { data, error } = await supabase.functions.invoke('admin-get-users', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          throw error;
        }

        if (data && data.users) {
          // Sort users by email
          const sortedUsers = data.users.map((user: any) => ({
            id: user.id,
            email: user.email
          })).sort((a: UserOption, b: UserOption) => 
            a.email.localeCompare(b.email)
          );
          
          setUsers(sortedUsers);
        }
      } catch (error: any) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="flex items-center space-x-2">
      <User className="h-5 w-5 text-gray-500" />
      <Select onValueChange={onUserSelect} disabled={loading}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder={loading ? "Loading users..." : "Select a user to view their data"} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Users</SelectLabel>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.email}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default UserSelector;
