// ============================================
// MitrAI - Browser-side Supabase Client
// Uses @supabase/ssr for cookie-based auth sessions
// ============================================

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseBrowser = createBrowserClient(supabaseUrl, supabaseAnonKey);
