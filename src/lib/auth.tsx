// ============================================
// MitrAI - Auth Context (localStorage-based)
// ============================================

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  admissionNumber: string;
  department: string;
  yearLevel: string;
  createdAt: string;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  admissionNumber: string;
  department: string;
  yearLevel: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (data: SignupData) => { success: boolean; error?: string };
  logout: () => void;
}

const SVNIT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?svnit\.ac\.in$/;

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
    if (!SVNIT_EMAIL_REGEX.test(email)) {
      return { success: false, error: 'Please use your SVNIT email (e.g. i22ma038@amhd.svnit.ac.in)' };
    }

    const usersRaw = localStorage.getItem('mitrai_users') || '[]';
    const users = JSON.parse(usersRaw);
    const found = users.find((u: { email: string; password: string }) => u.email === email && u.password === password);

    if (!found) {
      return { success: false, error: 'Invalid email or password' };
    }

    const userData: User = {
      id: found.id,
      name: found.name,
      email: found.email,
      admissionNumber: found.admissionNumber || '',
      department: found.department || '',
      yearLevel: found.yearLevel || '',
      createdAt: found.createdAt,
    };
    setUser(userData);
    localStorage.setItem('mitrai_session', JSON.stringify(userData));
    return { success: true };
  };

  const signup = (data: SignupData): { success: boolean; error?: string } => {
    if (!SVNIT_EMAIL_REGEX.test(data.email)) {
      return { success: false, error: 'Please use your SVNIT email (e.g. i22ma038@amhd.svnit.ac.in)' };
    }

    const usersRaw = localStorage.getItem('mitrai_users') || '[]';
    const users = JSON.parse(usersRaw);

    if (users.find((u: { email: string }) => u.email === data.email)) {
      return { success: false, error: 'An account with this email already exists' };
    }

    if (users.find((u: { admissionNumber?: string }) => u.admissionNumber === data.admissionNumber)) {
      return { success: false, error: 'This admission number is already registered' };
    }

    const newUser = {
      id: `user_${Date.now()}`,
      name: data.name,
      email: data.email,
      password: data.password,
      admissionNumber: data.admissionNumber,
      department: data.department,
      yearLevel: data.yearLevel,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem('mitrai_users', JSON.stringify(users));

    const userData: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      admissionNumber: newUser.admissionNumber,
      department: newUser.department,
      yearLevel: newUser.yearLevel,
      createdAt: newUser.createdAt,
    };
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
