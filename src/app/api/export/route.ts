// ============================================
// MitrAI - GDPR Data Export API
// GET: Export all user data as JSON
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/export?userId=xxx
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId || userId !== authUser.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // Rate limit: 2 exports per hour
  if (!rateLimit(`export:${userId}`, 2, 3600_000)) return rateLimitExceeded();

  try {
    // Collect all user data from all tables in parallel
    const [
      profileResult,
      messagesResult,
      materialsResult,
      sessionsResult,
      friendsResult,
      friendRequestsResult,
      calendarResult,
      attendanceResult,
      notificationsResult,
      subscriptionResult,
      feedbackResult,
      ratingsGivenResult,
      ratingsReceivedResult,
      availabilityResult,
    ] = await Promise.all([
      supabase.from('students').select('*').eq('id', userId).single(),
      supabase.from('messages').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }).limit(5000),
      supabase.from('materials').select('*').eq('uploaded_by', userId),
      supabase.from('sessions').select('*').or(`student1_id.eq.${userId},student2_id.eq.${userId}`).order('created_at', { ascending: false }),
      supabase.from('friendships').select('*').or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
      supabase.from('friend_requests').select('*').or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`),
      supabase.from('calendar_events').select('*').eq('user_id', userId),
      supabase.from('attendance').select('*').eq('user_id', userId),
      supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
      supabase.from('subscriptions').select('*').eq('user_id', userId).single(),
      supabase.from('feedback').select('*').eq('user_id', userId),
      supabase.from('ratings').select('*').eq('from_user_id', userId),
      supabase.from('ratings').select('*').eq('to_user_id', userId),
      supabase.from('availability').select('*').eq('user_id', userId).single(),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      profile: profileResult.data || null,
      messages: messagesResult.data || [],
      materials: materialsResult.data || [],
      sessions: sessionsResult.data || [],
      friendships: friendsResult.data || [],
      friendRequests: friendRequestsResult.data || [],
      calendarEvents: calendarResult.data || [],
      attendance: attendanceResult.data || [],
      notifications: notificationsResult.data || [],
      subscription: subscriptionResult.data || null,
      feedback: feedbackResult.data || [],
      ratingsGiven: ratingsGivenResult.data || [],
      ratingsReceived: ratingsReceivedResult.data || [],
      availability: availabilityResult.data || null,
    };

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mitrai-data-export-${userId}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('[Export] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to export data' }, { status: 500 });
  }
}
