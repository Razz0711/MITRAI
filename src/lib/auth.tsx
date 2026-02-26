// ============================================
// MitrAI - Auth Context (localStorage-based)
// ============================================

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (name: string, email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const session = localStorage.getItem('mitrai_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setUser(parsed);
      } catch {
        localStorage.removeItem('mitrai_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, password: string): { success: boolean; error?: string } => {
    const usersRaw = localStorage.getItem('mitrai_users') || '[]';
    const users = JSON.parse(usersRaw);
    const found = users.find((u: { email: string; password: string }) => u.email === email && u.password === password);

    if (!found) {
      return { success: false, error: 'Invalid email or password' };
    }

    const userData: User = { id: found.id, name: found.name, email: found.email, createdAt: found.createdAt };
    setUser(userData);
    localStorage.setItem('mitrai_session', JSON.stringify(userData));
    return { success: true };
  };

  const signup = (name: string, email: string, password: string): { success: boolean; error?: string } => {
    const usersRaw = localStorage.getItem('mitrai_users') || '[]';
    const users = JSON.parse(usersRaw);

    if (users.find((u: { email: string }) => u.email === email)) {
      return { success: false, error: 'An account with this email already exists' };
    }

    const newUser = {
      id: `user_${Date.now()}`,
      name,
      email,
      password,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem('mitrai_users', JSON.stringify(users));

    const userData: User = { id: newUser.id, name: newUser.name, email: newUser.email, createdAt: newUser.createdAt };
    setUser(userData);
    localStorage.setItem('mitrai_session', JSON.stringify(userData));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mitrai_session');
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
