// ============================================
// MitrAI - App Providers (Client-side)
// Wraps heartbeat and other client hooks
// ============================================

'use client';

import { useStatusHeartbeat } from '@/hooks/useStatusHeartbeat';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  // Send online status heartbeat every 30s
  useStatusHeartbeat();

  return <>{children}</>;
}
