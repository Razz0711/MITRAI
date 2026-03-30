// ============================================
// MitrRAI - Supabase Client (Service Role)
// ============================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const missingEnvMessage =
  'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
  'Set these in .env.local. Never fall back to the anon key for server-side operations.';

let cachedClient: SupabaseClient | null = null;

export function isServiceRoleSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function createServerSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(missingEnvMessage);
  }

  return createClient(supabaseUrl, supabaseKey);
}

export function getSupabase(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createServerSupabaseClient();
  }

  return cachedClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
