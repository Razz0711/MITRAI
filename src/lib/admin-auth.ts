// ============================================
// MitrAI - Admin Authentication Helpers
// Cookie-based admin auth with email/password login
// Env vars: ADMIN_EMAIL, ADMIN_PASSWORD
// ============================================

import crypto from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'mitrai_admin_session';
const SECRET_SALT = 'mitrai-admin-auth-2024';

/**
 * Generate a deterministic admin session token from env vars.
 * This token is the same across all serverless invocations as long as env vars don't change.
 */
export function generateAdminToken(): string {
  const email = (process.env.ADMIN_EMAIL || '').trim();
  const password = (process.env.ADMIN_PASSWORD || '').trim();
  if (!email || !password) return '';
  return crypto
    .createHash('sha256')
    .update(`${SECRET_SALT}:${email}:${password}`)
    .digest('hex');
}

/**
 * Validate admin email + password against env vars.
 */
export function validateAdminCredentials(email: string, password: string): boolean {
  const expectedEmail = (process.env.ADMIN_EMAIL || '').trim();
  const expectedPassword = (process.env.ADMIN_PASSWORD || '').trim();
  if (!expectedEmail || !expectedPassword) {
    console.error('[Admin Auth] ADMIN_EMAIL or ADMIN_PASSWORD env var not set');
    return false;
  }
  const emailMatch = email.trim().toLowerCase() === expectedEmail.toLowerCase();
  const passMatch = password.trim() === expectedPassword;
  if (!emailMatch || !passMatch) {
    console.error(`[Admin Auth] Credential mismatch - email:${emailMatch} pass:${passMatch}`);
  }
  return emailMatch && passMatch;
}

/**
 * Verify an admin session cookie value using timing-safe comparison.
 */
export function verifyAdminToken(cookieValue: string): boolean {
  const expected = generateAdminToken();
  if (!expected || expected.length !== cookieValue.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cookieValue));
  } catch {
    return false;
  }
}

/**
 * Check if the current request has a valid admin session cookie.
 * Use in server components or API routes.
 */
export function isAdminAuthenticated(): boolean {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(ADMIN_COOKIE_NAME);
    if (!session?.value) return false;
    return verifyAdminToken(session.value);
  } catch {
    return false;
  }
}

/**
 * Verify admin access via EITHER cookie OR adminKey query param.
 * Supports both old admin key approach and new cookie approach.
 */
export function verifyAdminAccess(adminKey?: string | null): boolean {
  // Check cookie first
  if (isAdminAuthenticated()) return true;
  // Fall back to admin key
  if (adminKey) {
    const expected = process.env.ADMIN_KEY || '';
    if (!expected || expected.length !== adminKey.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(adminKey));
    } catch {
      return false;
    }
  }
  return false;
}
