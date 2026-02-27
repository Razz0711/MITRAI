// ============================================
// MitrAI - Environment Variable Validation
// Validates required env vars at import time
// ============================================

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

function optionalEnv(name: string, fallback = ''): string {
  return process.env[name] || fallback;
}

// --- Supabase ---
export const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

// --- SMTP ---
export const SMTP_EMAIL = optionalEnv('SMTP_EMAIL');
export const SMTP_APP_PASSWORD = optionalEnv('SMTP_APP_PASSWORD');

// --- Gemini AI ---
export const GEMINI_API_KEY = optionalEnv('GEMINI_API_KEY');

// --- Admin ---
export const ADMIN_KEY = optionalEnv('ADMIN_KEY');
