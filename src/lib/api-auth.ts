// ============================================
// MitrAI - API Auth Helper
// Verifies the authenticated user from Supabase session cookies
// ============================================

import { createSupabaseServerClient } from './supabase-server';
import { NextResponse } from 'next/server';

/**
 * Get the currently authenticated user from session cookies.
 * Returns the Supabase Auth user or null if not authenticated.
 */
export async function getAuthUser() {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.error('getAuthUser:', err);
    return null;
  }
}

/**
 * Standard 401 Unauthorized response
 */
export function unauthorized() {
  return NextResponse.json(
    { success: false, error: 'Unauthorized. Please log in.' },
    { status: 401 }
  );
}

/**
 * Standard 403 Forbidden response
 */
export function forbidden() {
  return NextResponse.json(
    { success: false, error: 'Forbidden. You do not have access to this resource.' },
    { status: 403 }
  );
}
