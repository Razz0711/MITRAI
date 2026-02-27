// ============================================
// MitrAI - Supabase Client (Service Role)
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
    'Set these in .env.local. Never fall back to the anon key for server-side operations.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
