import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: Database['public']['Tables']['profiles']['Row'] | null;
  loading: boolean;
  onboardingCompleted: boolean;
  signUp: (email: string, password: string, role: AppRole, fullName: string, suburb: string, phone?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);

  const onboardingCompleted = profile?.onboarding_completed ?? false;

  const fetchUserData = useCallback(async (userId: string) => {
    const [{ data: roleData }, { data: profileData }] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    ]);
    if (roleData) setRole(roleData.role); else setRole(null);
    if (profileData) setProfile(profileData);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchUserData(user.id);
  }, [user, fetchUserData]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setRole(null);
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signUp = async (email: string, password: string, role: AppRole, fullName: string, suburb: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    if (data.user) {
      // Use secure DB function to set the chosen role (trigger defaults to 'customer')
      const { error: roleError } = await supabase.rpc('set_signup_role', {
        _user_id: data.user.id,
        _role: role,
      });
      if (roleError) throw roleError;
      const { error: profileError } = await supabase.from('profiles').update({ full_name: fullName, suburb, phone }).eq('user_id', data.user.id);
      if (profileError) throw profileError;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, onboardingCompleted, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
