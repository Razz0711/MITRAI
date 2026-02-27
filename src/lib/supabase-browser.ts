// ============================================
// MitrAI - Browser-side Supabase Client
// Uses only NEXT_PUBLIC_ env vars (safe for client)
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
