// ============================================
// MitrAI - Auth Context (Supabase Auth)
// Cookie-based sessions via @supabase/ssr
// ============================================

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabaseBrowser } from './supabase-browser';

interface User {
  id: string;
  name: string;
  email: string;
  admissionNumber: string;
  department: string;
  yearLevel: string;
  dob: string;            // YYYY-MM-DD
  showBirthday: boolean;  // privacy toggle
  createdAt: string;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  admissionNumber: string;
  department: string;
  yearLevel: string;
  dob: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseUser(supabaseUser: any): User {
  const meta = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    name: meta.name || '',
    email: supabaseUser.email || '',
    admissionNumber: meta.admissionNumber || '',
    department: meta.department || '',
    yearLevel: meta.yearLevel || '',
    dob: meta.dob || '',
    showBirthday: meta.showBirthday !== false,
    createdAt: supabaseUser.created_at || '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = mapSupabaseUser(session.user);
        setUser(u);
        // Set localStorage for backward-compat with pages that read it directly
        localStorage.setItem('mitrai_student_id', u.id);
        localStorage.setItem('mitrai_student_name', u.name);
        localStorage.setItem('mitrai_session', JSON.stringify(u));
      }
      setIsLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const u = mapSupabaseUser(session.user);
          setUser(u);
          localStorage.setItem('mitrai_student_id', u.id);
          localStorage.setItem('mitrai_student_name', u.name);
          localStorage.setItem('mitrai_session', JSON.stringify(u));
        } else {
          setUser(null);
          localStorage.removeItem('mitrai_student_id');
          localStorage.removeItem('mitrai_student_name');
          localStorage.removeItem('mitrai_session');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('login:', err);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const signup = async (data: SignupData): Promise<{ success: boolean; error?: string }> => {
    try {
      // Step 1: Create the user on the server (uses admin API for auto-confirmation)
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', ...data }),
      });
      const result = await res.json();

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to create account' };
      }

      // Step 2: Sign in to establish the session
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      if (error) {
        return { success: false, error: 'Account created but login failed. Please try signing in.' };
      }

      return { success: true };
    } catch (err) {
      console.error('signup:', err);
      return { success: false, error: 'Signup failed. Please try again.' };
    }
  };

  const logout = () => {
    supabaseBrowser.auth.signOut();
    setUser(null);
    localStorage.removeItem('mitrai_session');
    localStorage.removeItem('mitrai_student_id');
    localStorage.removeItem('mitrai_student_name');
    // Clean up old localStorage auth data
    localStorage.removeItem('mitrai_users');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
