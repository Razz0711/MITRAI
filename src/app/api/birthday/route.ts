// ============================================
// MitrAI - Birthday API
// GET: upcoming birthdays & today's birthday
// POST: send birthday wish
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllStudents, addNotification, hasWishedToday, addBirthdayWish, getBirthdayWishesForUser } from '@/lib/store';
import { BirthdayInfo } from '@/lib/types';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';

function getDayMonth(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}`;
}

function getDaysUntilBirthday(dobStr: string): number {
  const now = new Date();
  const dob = new Date(dobStr);
  const thisYear = now.getFullYear();

  // Birthday this year
  let birthday = new Date(thisYear, dob.getMonth(), dob.getDate());
  if (birthday < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    // Birthday already passed this year, look at next year
    birthday = new Date(thisYear + 1, dob.getMonth(), dob.getDate());
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

// GET /api/birthday?days=7 — get upcoming birthdays
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const userId = searchParams.get('userId');

    // Get all users from localStorage (passed via query) or from students store
    // We check both registered users and student profiles
    const students = await getAllStudents();

    // Parse users from query if provided (from localStorage on client)
    const usersParam = searchParams.get('users');
    let allUsers: Array<{ id: string; name: string; department: string; dob: string; showBirthday: boolean }> = [];

    if (usersParam) {
      try {
        allUsers = JSON.parse(decodeURIComponent(usersParam));
      } catch { /* ignore parsing errors */ }
    }

    // Also include students that have DOBs
    students.forEach(s => {
      if (!allUsers.find(u => u.id === s.id)) {
        // Students don't have DOB in profile currently, skip
      }
    });

    const birthdays: BirthdayInfo[] = [];

    for (const user of allUsers) {
      if (!user.dob || !user.showBirthday) continue;

      const daysUntil = getDaysUntilBirthday(user.dob);

      if (daysUntil <= days) {
        birthdays.push({
          userId: user.id,
          userName: user.name,
          department: user.department || '',
          dayMonth: getDayMonth(user.dob),
          isToday: daysUntil === 0,
          daysUntil,
        });
      }
    }

    // Sort: today first, then closest upcoming
    birthdays.sort((a, b) => a.daysUntil - b.daysUntil);

    // Get wishes count for today's birthday persons
    const todayBirthdays = birthdays.filter(b => b.isToday);

    // Check if current user already wished each birthday person
    const wishedMap: Record<string, boolean> = {};
    if (userId) {
      for (const b of todayBirthdays) {
        wishedMap[b.userId] = await hasWishedToday(userId, b.userId);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        birthdays,
        todayBirthdays,
        wishedMap,
      }
    });
  } catch (error) {
    console.error('Birthday GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch birthdays' }, { status: 500 });
  }
}

// POST /api/birthday — send a birthday wish
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await request.json();
    const { fromUserId, fromUserName, toUserId } = body;

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ success: false, error: 'Missing user IDs' }, { status: 400 });
    }
    // Ownership: can only send wishes from yourself
    if (fromUserId !== authUser.id) return forbidden();

    // Check if already wished today
    if (await hasWishedToday(fromUserId, toUserId)) {
      return NextResponse.json({ success: false, error: 'You already wished them today!' }, { status: 400 });
    }

    // Add wish
    await addBirthdayWish({
      id: uuidv4(),
      fromUserId,
      fromUserName: fromUserName || 'Someone',
      toUserId,
      createdAt: new Date().toISOString(),
    });

    // Send notification to birthday person
    await addNotification({
      id: uuidv4(),
      userId: toUserId,
      type: 'birthday_wish',
      title: '🎂 Birthday Wish!',
      message: `${fromUserName || 'Someone'} wished you Happy Birthday! 🎉`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    // Count total wishes
    const wishes = await getBirthdayWishesForUser(toUserId);
    const todayWishes = wishes.filter(w => w.createdAt.startsWith(new Date().toISOString().split('T')[0]));

    return NextResponse.json({
      success: true,
      data: { wishCount: todayWishes.length }
    });
  } catch (error) {
    console.error('Birthday POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send wish' }, { status: 500 });
  }
}
