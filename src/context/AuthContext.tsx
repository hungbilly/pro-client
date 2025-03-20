
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

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

  // Function to create default company for new users
  const createDefaultCompany = async (userId: string, userData: any) => {
    try {
      console.log('Creating default company for new user', userId);
      
      // Check if user already has a company
      const { data: existingCompanies, error: checkError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      
      if (checkError) {
        console.error('Error checking for existing companies:', checkError);
        return;
      }
      
      // If user already has a company, don't create another one
      if (existingCompanies && existingCompanies.length > 0) {
        console.log('User already has a company, skipping creation');
        return;
      }
      
      // Create default company using user metadata
      const companyName = userData.company_name || 'My Company';
      const { data, error } = await supabase
        .from('companies')
        .insert([
          {
            name: companyName,
            user_id: userId,
            is_default: true,
            industry: userData.industry || null,
          }
        ])
        .select();
      
      if (error) {
        console.error('Error creating default company:', error);
      } else {
        console.log('Default company created successfully:', data);
        
        // Also create default user settings with the preferred currency
        try {
          const { error: settingsError } = await supabase
            .from('user_settings')
            .insert([
              {
                user_id: userId,
                default_currency: userData.currency || 'USD',
                invoice_number_format: 'numeric',
                use_custom_format: false
              }
            ]);
            
          if (settingsError) {
            console.error('Error creating user settings:', settingsError);
          } else {
            console.log('User settings created successfully');
          }
        } catch (err) {
          console.error('Exception creating user settings:', err);
        }
      }
    } catch (error) {
      console.error('Exception in createDefaultCompany:', error);
    }
  };

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
        
        // For new users, create default company and settings
        if (session?.user && !session.user.app_metadata.provider) {
          // Check if this is the first login (we'll assume this for new signups)
          const { data: authEvents } = await supabase.auth.getAuthEvents();
          
          if (authEvents?.events?.some(event => 
              event.type === 'SIGNED_IN' && 
              event.created_at === session.user.created_at)) {
            console.log('Appears to be first login, initializing user data');
            await createDefaultCompany(session.user.id, session.user.user_metadata);
          }
        }
        
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
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setIsAdmin(session?.user?.user_metadata?.is_admin || false);
        
        // When a user signs up or signs in for the first time with Google
        if (event === 'SIGNED_IN' && session?.user) {
          // For Google users, we need to check if they have user data and create it if not
          if (session.user.app_metadata.provider === 'google') {
            // Check if user has a company, if not, create one
            const { data: companies } = await supabase
              .from('companies')
              .select('id')
              .eq('user_id', session.user.id)
              .limit(1);
              
            if (!companies || companies.length === 0) {
              console.log('New Google user, creating default company');
              // For Google users, get name from identity data
              let userData = {
                ...session.user.user_metadata,
                company_name: session.user.user_metadata.company_name || 
                              `${session.user.user_metadata.name || session.user.user_metadata.full_name || 'My'} Company`,
                industry: session.user.user_metadata.industry || 'Photography',
                currency: session.user.user_metadata.currency || 'USD'
              };
              
              // Create default company
              await createDefaultCompany(session.user.id, userData);
              
              // Update user metadata with default values if not present
              if (!session.user.user_metadata.location || 
                  !session.user.user_metadata.currency ||
                  !session.user.user_metadata.company_name ||
                  !session.user.user_metadata.industry) {
                    
                try {
                  await supabase.auth.updateUser({
                    data: userData
                  });
                  
                  // Show welcome toast for new users
                  toast.success('Welcome! We\'ve set up your account with default settings.');
                } catch (error) {
                  console.error('Error updating Google user metadata:', error);
                }
              }
            }
          }
        }
        
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
