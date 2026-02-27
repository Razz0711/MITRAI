// ============================================
// MitrAI - In-Memory Rate Limiter
// Lightweight rate limiting for serverless (per-container)
// ============================================

import { NextResponse } from 'next/server';

const hits = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries every 60s to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  hits.forEach((entry, key) => {
    if (now > entry.resetAt) hits.delete(key);
  });
}, 60_000);

/**
 * Check if a request is within rate limits.
 * @param key   Unique key (e.g. userId or IP + route)
 * @param max   Maximum requests allowed in the window
 * @param windowMs  Time window in milliseconds
 * @returns true if allowed, false if rate-limited
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

/**
 * Helper to return a 429 response
 */
export function rateLimitExceeded() {
  return NextResponse.json(
    { success: false, error: 'Too many requests. Please try again later.' },
    { status: 429 }
  );
}
