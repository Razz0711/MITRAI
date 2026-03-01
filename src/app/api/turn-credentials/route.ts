import { NextResponse } from 'next/server';

const METERED_API_KEY = '85heS8uebI0d0CNV_IGQwtoskEUR0MYeKIP5AcI8kgS_sp0T';
const METERED_DOMAIN = 'mitrai.metered.live';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`,
      { signal: controller.signal, cache: 'no-store' },
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[TURN] Metered API error:', res.status, body);
      return NextResponse.json({ servers: [] }, { status: 200 });
    }

    const servers = await res.json();
    if (Array.isArray(servers) && servers.length > 0) {
      console.log('[TURN] Fetched', servers.length, 'TURN servers from Metered');
      return NextResponse.json({ servers }, {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=300' }, // cache 5 min
      });
    }

    return NextResponse.json({ servers: [] }, { status: 200 });
  } catch (e) {
    console.error('[TURN] Failed to fetch credentials:', e);
    return NextResponse.json({ servers: [] }, { status: 200 });
  }
}
