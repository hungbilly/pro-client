
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        console.log('Initializing auth, checking for session...');
        // Check for active session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        } else {
          console.log('Session check result:', session ? 'Session found' : 'No session');
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsAdmin(session?.user?.user_metadata?.is_admin || false);
        
        // For Google auth, make sure we have the is_admin field set
        if (session?.user && session.user.app_metadata.provider === 'google' && 
            !session.user.user_metadata.hasOwnProperty('is_admin')) {
          console.log('Adding is_admin metadata for Google auth user');
          // Set default admin status for Google auth users if not already set
          try {
            await supabase.auth.updateUser({
              data: { is_admin: false }
            });
          } catch (error) {
            console.error('Error updating user metadata:', error);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setIsAdmin(session?.user?.user_metadata?.is_admin || false);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('Signing out...');
    try {
      // First clear local session state
      setSession(null);
      setUser(null);
      
      // Clear all supabase related items from local storage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('supabase.auth.')) {
          localStorage.removeItem(key);
        }
      }
      
      // Attempt to sign out via Supabase API
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log('Successfully called supabase.auth.signOut()');
      } catch (error: any) {
        if (error.name === 'AuthSessionMissingError') {
          console.log('No active session to sign out from (already signed out)');
        } else {
          console.error('Error during supabase.auth.signOut():', error);
        }
      }

      // Reset IndexedDB storage which might contain session data
      try {
        window.indexedDB.deleteDatabase('supabase.auth.token');
      } catch (error) {
        console.error('Error clearing IndexedDB:', error);
      }
      
      console.log('Successfully signed out');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value = {
    session,
    user,
    loading,
    signOut,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
