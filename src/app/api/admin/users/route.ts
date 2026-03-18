import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAccess, isAdminAuthenticated } from '@/lib/admin-auth';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

// GET /api/admin/users?adminKey=xxx
export async function GET(req: NextRequest) {
  const adminCookie = isAdminAuthenticated();
  if (!adminCookie) {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
  }

  const adminKey = req.nextUrl.searchParams.get('adminKey');
  if (!verifyAdminAccess(adminKey)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Admin Users] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load users' }, { status: 500 });
  }
}
