// ============================================
// MitrAI - Health Check Endpoint
// GET /api/health — returns service status
// Used for monitoring, uptime checks, and CI/CD
// ============================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();

  const checks: Record<string, { status: 'ok' | 'error'; latency?: number; error?: string }> = {};

  // Check Supabase connectivity
  try {
    const dbStart = Date.now();
    const { error } = await supabase.from('students').select('id').limit(1);
    checks.database = {
      status: error ? 'error' : 'ok',
      latency: Date.now() - dbStart,
      ...(error && { error: error.message }),
    };
  } catch (err) {
    checks.database = {
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  // Check Supabase Auth
  try {
    const authStart = Date.now();
    const { error } = await supabase.auth.getSession();
    checks.auth = {
      status: error ? 'error' : 'ok',
      latency: Date.now() - authStart,
      ...(error && { error: error.message }),
    };
  } catch (err) {
    checks.auth = {
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  // Check environment variables
  const envVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missingEnvVars = envVars.filter(v => !process.env[v]);
  checks.environment = {
    status: missingEnvVars.length === 0 ? 'ok' : 'error',
    ...(missingEnvVars.length > 0 && { error: `Missing: ${missingEnvVars.join(', ')}` }),
  };

  const allOk = Object.values(checks).every(c => c.status === 'ok');
  const totalLatency = Date.now() - startTime;

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    version: process.env.npm_package_version || '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? Math.round(process.uptime()) : undefined,
    latency: totalLatency,
    checks,
  }, {
    status: allOk ? 200 : 503,
  });
}
