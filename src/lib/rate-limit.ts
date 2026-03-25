// ============================================
// MitrRAI - In-Memory Rate Limiter
// Lightweight rate limiting for serverless (per-container)
//
// LIMITATION: This is per-container (per-instance) only.
// On Vercel, each serverless invocation may get a fresh
// container, so a determined attacker could bypass limits.
// For production-grade distributed rate limiting, consider:
//   - Upstash Redis (@upstash/ratelimit)
//   - Vercel KV
//   - Supabase-based counters
// ============================================

import { NextResponse } from 'next/server';

const hits = new Map<string, { count: number; resetAt: number }>();

// Safety cap: prevent unbounded memory growth within a single container
const MAX_KEYS = 10_000;

// Track when we last ran eviction (lazy cleanup, no setInterval)
let lastEvictionAt = Date.now();
const EVICTION_INTERVAL_MS = 60_000;

/** Lazily evict stale entries at most once per EVICTION_INTERVAL_MS */
function lazyEvict() {
  const now = Date.now();
  if (now - lastEvictionAt < EVICTION_INTERVAL_MS) return;
  lastEvictionAt = now;
  hits.forEach((entry, key) => {
    if (now > entry.resetAt) hits.delete(key);
  });
}

/**
 * Check if a request is within rate limits.
 * @param key   Unique key (e.g. userId or IP + route)
 * @param max   Maximum requests allowed in the window
 * @param windowMs  Time window in milliseconds
 * @returns true if allowed, false if rate-limited
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  lazyEvict();

  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    // Enforce max keys to prevent memory blowout
    if (hits.size >= MAX_KEYS) {
      // Emergency eviction: clear oldest 25% of entries
      const entries = Array.from(hits.entries()).sort((a, b) => a[1].resetAt - b[1].resetAt);
      const toClear = Math.ceil(entries.length * 0.25);
      for (let i = 0; i < toClear; i++) hits.delete(entries[i][0]);
    }
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

