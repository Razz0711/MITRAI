// ============================================
// MitrAI - Session History & Analytics API
// GET: fetch session history + analytics for a user
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET /api/analytics?userId=xxx
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId || userId !== authUser.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Fetch study sessions involving this user
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .or(`student1_id.eq.${userId},student2_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100);

    // Fetch chat activity (message count per day for last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: messages, count: totalMessages } = await supabase
      .from('messages')
      .select('created_at', { count: 'exact' })
      .eq('sender_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(1000);

    // Fetch materials uploaded
    const { count: materialsCount } = await supabase
      .from('materials')
      .select('id', { count: 'exact' })
      .eq('uploaded_by', userId);

    // Fetch friend count
    const { count: friendCount } = await supabase
      .from('friendships')
      .select('id', { count: 'exact' })
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    // Fetch attendance records
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId);

    // Calculate analytics
    const sessionList = sessions || [];
    const completedSessions = sessionList.filter(s => s.status === 'completed');
    const totalSessionHours = completedSessions.reduce((acc, s) => {
      if (s.start_time && s.end_time) {
        const start = new Date(s.start_time).getTime();
        const end = new Date(s.end_time).getTime();
        return acc + (end - start) / (1000 * 60 * 60);
      }
      return acc;
    }, 0);

    // Message frequency by day
    const messagesByDay: Record<string, number> = {};
    (messages || []).forEach(m => {
      const day = new Date(m.created_at).toISOString().split('T')[0];
      messagesByDay[day] = (messagesByDay[day] || 0) + 1;
    });

    // Attendance summary
    const attendanceRecords = attendance || [];
    const overallAttendance = attendanceRecords.length > 0
      ? attendanceRecords.reduce((acc, r) => acc + (r.attended_classes / Math.max(r.total_classes, 1)), 0) / attendanceRecords.length * 100
      : 0;

    // Calculate study streak (consecutive days with activity)
    const activityDays = new Set<string>();
    sessionList.forEach(s => {
      if (s.created_at) activityDays.add(new Date(s.created_at).toISOString().split('T')[0]);
    });
    (messages || []).forEach(m => {
      activityDays.add(new Date(m.created_at).toISOString().split('T')[0]);
    });

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (activityDays.has(key)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessionList.slice(0, 20), // Last 20 sessions
        analytics: {
          totalSessions: sessionList.length,
          completedSessions: completedSessions.length,
          totalSessionHours: Math.round(totalSessionHours * 10) / 10,
          totalMessages: totalMessages || 0,
          materialsUploaded: materialsCount || 0,
          friendCount: friendCount || 0,
          overallAttendance: Math.round(overallAttendance),
          studyStreak: streak,
          messagesByDay,
          subjectsStudied: Array.from(new Set(sessionList.map(s => s.topic).filter(Boolean))),
        },
      },
    });
  } catch (error) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load analytics' }, { status: 500 });
  }
}
