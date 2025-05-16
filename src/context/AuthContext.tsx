
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
    // Set up auth state change listener FIRST (critical for proper initialization)
    console.log('Setting up auth state change listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state changed:', event, newSession?.user?.email);
        
        // Avoid making additional Supabase calls inside this callback to prevent recursion issues
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsAdmin(newSession?.user?.user_metadata?.is_admin || false);
        
        // Log detailed session info for debugging
        if (newSession) {
          console.log('Session established. User ID:', newSession.user.id);
          console.log('Session expiry:', new Date(newSession.expires_at * 1000).toISOString());
          console.log('Access token:', newSession.access_token ? `${newSession.access_token.substring(0, 10)}...` : 'missing');
          console.log('Refresh token:', newSession.refresh_token ? 'present' : 'missing');

          // Store session in localStorage as a backup (but not the sensitive parts)
          try {
            localStorage.setItem('auth_user_id', newSession.user.id);
            localStorage.setItem('auth_session_active', 'true');
            localStorage.setItem('auth_session_expiry', String(newSession.expires_at));
          } catch (e) {
            console.error('Failed to store auth backup data:', e);
          }
        } else {
          console.log('No active session');
          // Clear backup data
          try {
            localStorage.removeItem('auth_user_id');
            localStorage.removeItem('auth_session_active');
            localStorage.removeItem('auth_session_expiry');
          } catch (e) {
            console.error('Failed to clear auth backup data:', e);
          }
        }
      }
    );

    // Only AFTER setting up the listener, check for an existing session
    const initAuth = async () => {
      try {
        console.log('Initializing auth, checking for session...');
        
        // Check for active session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Clear any potentially corrupted session data
          try {
            await supabase.auth.signOut({ scope: 'local' });
            console.log('Cleared potentially corrupted session data');
          } catch (clearError) {
            console.error('Error clearing session:', clearError);
          }
        } else if (currentSession) {
          console.log('Session found for user:', currentSession.user.email);
          console.log('Session expires at:', new Date(currentSession.expires_at * 1000).toISOString());
          console.log('Access token:', currentSession.access_token ? `${currentSession.access_token.substring(0, 10)}...` : 'missing');
          console.log('Refresh token:', currentSession.refresh_token ? 'present' : 'missing');

          // Store session in localStorage as a backup (but not the sensitive parts)
          try {
            localStorage.setItem('auth_user_id', currentSession.user.id);
            localStorage.setItem('auth_session_active', 'true');
            localStorage.setItem('auth_session_expiry', String(currentSession.expires_at));
          } catch (e) {
            console.error('Failed to store auth backup data:', e);
          }

          // Check if the session is expired or will expire soon (within 5 minutes)
          const nowInSeconds = Math.floor(Date.now() / 1000);
          const expiresInSeconds = currentSession.expires_at - nowInSeconds;
          
          if (expiresInSeconds < 300) { // Less than 5 minutes until expiry
            console.log('Session expires soon or is expired, refreshing...');
            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                console.error('Failed to refresh session:', refreshError);
              } else if (refreshData.session) {
                console.log('Session refreshed successfully. New expiry:', 
                  new Date(refreshData.session.expires_at * 1000).toISOString());
                
                // Update the session with the refreshed one
                setSession(refreshData.session);
                setUser(refreshData.session.user);
                setIsAdmin(refreshData.session.user.user_metadata?.is_admin || false);
                
                // Update backup data
                try {
                  localStorage.setItem('auth_user_id', refreshData.session.user.id);
                  localStorage.setItem('auth_session_active', 'true');
                  localStorage.setItem('auth_session_expiry', String(refreshData.session.expires_at));
                } catch (e) {
                  console.error('Failed to store refreshed auth backup data:', e);
                }
                
                return; // Skip the setSession calls below since we've already set them
              }
            } catch (refreshError) {
              console.error('Error during session refresh:', refreshError);
            }
          }

          // Additional validate to confirm session is working
          try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) {
              console.error('Failed to validate user with current session:', userError);
              throw userError;
            }
            console.log('User validation successful:', userData.user?.email);
          } catch (validationError) {
            console.error('Session validation failed, clearing session:', validationError);
            await supabase.auth.signOut({ scope: 'local' });
            return;
          }
          
          // Set the session and user state with the current session
          setSession(currentSession);
          setUser(currentSession.user);
          setIsAdmin(currentSession.user.user_metadata?.is_admin || false);
        } else {
          console.log('No current session found');
          // Check for backup data
          try {
            const hasBackupSession = localStorage.getItem('auth_session_active') === 'true';
            const backupUserId = localStorage.getItem('auth_user_id');
            const backupExpiry = localStorage.getItem('auth_session_expiry');
            
            if (hasBackupSession && backupUserId && backupExpiry) {
              const expiryTime = Number(backupExpiry) * 1000;
              const now = Date.now();
              
              if (expiryTime > now) {
                console.log('Found valid backup session data, attempting refresh...');
                // We have backup data that's not expired, attempt a refresh
                try {
                  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                  if (!refreshError && refreshData.session) {
                    console.log('Session refresh successful');
                    setSession(refreshData.session);
                    setUser(refreshData.session.user);
                    setIsAdmin(refreshData.session.user.user_metadata?.is_admin || false);
                  } else {
                    console.error('Failed to refresh session:', refreshError);
                  }
                } catch (refreshError) {
                  console.error('Failed to refresh session:', refreshError);
                }
              } else {
                console.log('Backup session data found but expired');
                // Clear expired backup data
                localStorage.removeItem('auth_user_id');
                localStorage.removeItem('auth_session_active');
                localStorage.removeItem('auth_session_expiry');
              }
            }
          } catch (e) {
            console.error('Error checking backup auth data:', e);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      // Clean up subscription when component unmounts
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('Signing out...');
    try {
      // First clear local session state to prevent UI flashing
      setSession(null);
      setUser(null);
      
      // Clear all supabase related items from local storage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('supabase.auth.')) {
          localStorage.removeItem(key);
        }
      }
      
      // Clear backup auth data
      localStorage.removeItem('auth_user_id');
      localStorage.removeItem('auth_session_active');
      localStorage.removeItem('auth_session_expiry');
      
      // Attempt to sign out via Supabase API with global scope to ensure all devices are signed out
      try {
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        if (error) {
          console.error('Error during signout:', error);
        } else {
          console.log('Successfully called supabase.auth.signOut()');
        }
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
