// ============================================
// MitrAI - Gamification Store (XP, Badges, Streaks)
// ============================================

import { supabase, fromRow } from './core';

// ── Types ──
export interface UserXP {
  userId: string;
  totalXp: number;
  level: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  badgeName: string;
  badgeEmoji: string;
  badgeDescription: string;
  earnedAt: string;
}

// ── Levels & XP config ──
const LEVELS = [
  { name: 'Beginner', minXp: 0 },
  { name: 'Scholar', minXp: 100 },
  { name: 'Mentor', minXp: 500 },
  { name: 'Legend', minXp: 1500 },
];

export function getLevelForXP(xp: number): string {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) return LEVELS[i].name;
  }
  return 'Beginner';
}

export function getNextLevel(xp: number): { name: string; xpNeeded: number } | null {
  for (const level of LEVELS) {
    if (xp < level.minXp) return { name: level.name, xpNeeded: level.minXp - xp };
  }
  return null;
}

// ── Badge definitions ──
export const BADGE_DEFS = [
  { id: 'first_session', name: 'First Steps', emoji: '👣', description: 'Complete your first study session' },
  { id: 'streak_5', name: '5-Day Streak', emoji: '🔥', description: 'Study 5 days in a row' },
  { id: 'streak_30', name: 'Monthly Master', emoji: '📅', description: '30-day study streak' },
  { id: 'top_contributor', name: 'Top Contributor', emoji: '⭐', description: 'Upload 10+ materials' },
  { id: 'social_butterfly', name: 'Social Butterfly', emoji: '🦋', description: 'Make 10+ friends' },
  { id: 'night_owl', name: 'Night Owl', emoji: '🦉', description: 'Study after midnight' },
  { id: 'early_bird', name: 'Early Bird', emoji: '🌅', description: 'Study before 6 AM' },
  { id: 'helper', name: 'Helpful Hero', emoji: '🦸', description: 'Answer 5 doubts' },
  { id: 'founding_member', name: 'Founding Member', emoji: '🏛️', description: 'Among first 100 users' },
  { id: 'room_creator', name: 'Room Host', emoji: '🏠', description: 'Create 3 study rooms' },
];

// ── XP Operations ──
export async function getUserXP(userId: string): Promise<UserXP | null> {
  const { data, error } = await supabase
    .from('user_xp')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return fromRow<UserXP>(data);
}

export async function awardXP(userId: string, amount: number, reason: string): Promise<UserXP | null> {
  // Get or init XP record
  let xpRecord = await getUserXP(userId);
  const today = new Date().toISOString().slice(0, 10);

  if (!xpRecord) {
    // Create new XP record
    await supabase.from('user_xp').insert({
      user_id: userId,
      total_xp: 0,
      level: 'Beginner',
      current_streak: 1,
      longest_streak: 1,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    });
    xpRecord = { userId, totalXp: 0, level: 'Beginner', currentStreak: 1, longestStreak: 1, lastActiveDate: today };
  }

  const newXp = xpRecord.totalXp + amount;
  const newLevel = getLevelForXP(newXp);

  // Update streak
  let { currentStreak, longestStreak } = xpRecord;
  if (xpRecord.lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (xpRecord.lastActiveDate === yesterday) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  // Update XP record
  await supabase.from('user_xp').upsert({
    user_id: userId,
    total_xp: newXp,
    level: newLevel,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_active_date: today,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  // Log transaction
  await supabase.from('xp_transactions').insert({
    user_id: userId,
    amount,
    reason,
    created_at: new Date().toISOString(),
  });

  return { userId, totalXp: newXp, level: newLevel, currentStreak, longestStreak, lastActiveDate: today };
}

// ── Badge Operations ──
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  if (error) { console.error('getUserBadges error:', error); return []; }
  return (data || []).map((r) => fromRow<UserBadge>(r));
}

export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
  const def = BADGE_DEFS.find(b => b.id === badgeId);
  if (!def) return false;

  const { error } = await supabase.from('user_badges').upsert({
    user_id: userId,
    badge_id: badgeId,
    badge_name: def.name,
    badge_emoji: def.emoji,
    badge_description: def.description,
    earned_at: new Date().toISOString(),
  }, { onConflict: 'user_id,badge_id' });

  if (error) { console.error('awardBadge error:', error); return false; }
  return true;
}

// ── Leaderboard ──
export async function getLeaderboard(limit = 20): Promise<UserXP[]> {
  const { data, error } = await supabase
    .from('user_xp')
    .select('*')
    .order('total_xp', { ascending: false })
    .limit(limit);
  if (error) { console.error('getLeaderboard error:', error); return []; }
  return (data || []).map((r) => fromRow<UserXP>(r));
}
