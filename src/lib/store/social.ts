// ============================================
// MitrAI - Social Operations
// Birthday Wishes, Friend Requests, Friendships, Buddy Ratings
// ============================================

import { BirthdayWish, FriendRequest, Friendship, BuddyRating } from '../types';
import { supabase, toRow, fromRow } from './core';

// ─── Birthday Wishes ───

export async function getBirthdayWishesForUser(userId: string): Promise<BirthdayWish[]> {
  const { data, error } = await supabase.from('birthday_wishes').select('*').eq('to_user_id', userId);
  if (error) { console.error('getBirthdayWishesForUser error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<BirthdayWish>(r));
}

export async function hasWishedToday(fromUserId: string, toUserId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('birthday_wishes').select('id').eq('from_user_id', fromUserId).eq('to_user_id', toUserId).gte('created_at', today);
  return (data || []).length > 0;
}

export async function addBirthdayWish(wish: BirthdayWish): Promise<void> {
  const { error } = await supabase.from('birthday_wishes').insert(toRow(wish));
  if (error) console.error('addBirthdayWish error:', error);
}

// ─── Friend Requests ───

export async function getFriendRequestsForUser(userId: string, limit = 100): Promise<FriendRequest[]> {
  const { data, error } = await supabase.from('friend_requests').select('*').or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`).order('created_at', { ascending: false }).limit(limit);
  if (error) { console.error('getFriendRequestsForUser error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<FriendRequest>(r));
}

export async function getPendingFriendRequests(userId: string, limit = 50): Promise<FriendRequest[]> {
  const { data, error } = await supabase.from('friend_requests').select('*').eq('to_user_id', userId).eq('status', 'pending').limit(limit);
  if (error) { console.error('getPendingFriendRequests error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<FriendRequest>(r));
}

export async function createFriendRequest(req: FriendRequest): Promise<FriendRequest> {
  // Check if request already exists
  const { data: existing } = await supabase.from('friend_requests').select('*')
    .or(`and(from_user_id.eq.${req.fromUserId},to_user_id.eq.${req.toUserId}),and(from_user_id.eq.${req.toUserId},to_user_id.eq.${req.fromUserId})`);
  if (existing && existing.length > 0) {
    return fromRow<FriendRequest>(existing[0]);
  }
  const { error } = await supabase.from('friend_requests').insert(toRow(req));
  if (error) console.error('createFriendRequest error:', error);
  return req;
}

export async function updateFriendRequestStatus(requestId: string, status: 'accepted' | 'declined'): Promise<FriendRequest | null> {
  const { data, error } = await supabase.from('friend_requests').update({ status }).eq('id', requestId).select().single();
  if (error || !data) { console.error('updateFriendRequestStatus error:', error); return null; }
  return fromRow<FriendRequest>(data);
}

export async function getFriendRequestById(requestId: string): Promise<FriendRequest | null> {
  const { data, error } = await supabase.from('friend_requests').select('*').eq('id', requestId).single();
  if (error || !data) return null;
  return fromRow<FriendRequest>(data);
}

// ─── Friendships ───

export async function getFriendsForUser(userId: string, limit = 200): Promise<Friendship[]> {
  const { data, error } = await supabase.from('friendships').select('*').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).limit(limit);
  if (error) { console.error('getFriendsForUser error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<Friendship>(r));
}

export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const { data } = await supabase.from('friendships').select('id')
    .or(`and(user1_id.eq.${userId1},user2_id.eq.${userId2}),and(user1_id.eq.${userId2},user2_id.eq.${userId1})`);
  return (data || []).length > 0;
}

export async function addFriendship(friendship: Friendship): Promise<Friendship> {
  const alreadyFriends = await areFriends(friendship.user1Id, friendship.user2Id);
  if (alreadyFriends) {
    const friends = await getFriendsForUser(friendship.user1Id);
    return friends.find(f =>
      (f.user1Id === friendship.user1Id && f.user2Id === friendship.user2Id) ||
      (f.user1Id === friendship.user2Id && f.user2Id === friendship.user1Id)
    ) || friendship;
  }
  const { error } = await supabase.from('friendships').insert(toRow(friendship));
  if (error) console.error('addFriendship error:', error);
  return friendship;
}

export async function removeFriendship(userId1: string, userId2: string): Promise<boolean> {
  const { error } = await supabase.from('friendships').delete()
    .or(`and(user1_id.eq.${userId1},user2_id.eq.${userId2}),and(user1_id.eq.${userId2},user2_id.eq.${userId1})`);
  if (error) { console.error('removeFriendship error:', error); return false; }
  return true;
}

// ─── Buddy Ratings ───

export async function getRatingsForUser(userId: string, limit = 100): Promise<BuddyRating[]> {
  const { data, error } = await supabase.from('ratings').select('*').eq('to_user_id', userId).limit(limit);
  if (error) { console.error('getRatingsForUser error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<BuddyRating>(r));
}

export async function getRatingsByUser(userId: string, limit = 100): Promise<BuddyRating[]> {
  const { data, error } = await supabase.from('ratings').select('*').eq('from_user_id', userId).limit(limit);
  if (error) { console.error('getRatingsByUser error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<BuddyRating>(r));
}

export async function getAverageRating(userId: string): Promise<number> {
  // Use SQL AVG() instead of fetching all ratings and computing in JS
  const { data, error } = await supabase.rpc('get_average_rating', { target_user_id: userId }).single();
  if (error || !data) {
    // Fallback to JS computation if RPC doesn't exist yet
    const userRatings = await getRatingsForUser(userId);
    if (userRatings.length === 0) return 0;
    const sum = userRatings.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / userRatings.length) * 10) / 10;
  }
  return Math.round((data as number) * 10) / 10;
}

export async function addRating(rating: BuddyRating): Promise<BuddyRating> {
  const { error } = await supabase.from('ratings').insert(toRow(rating));
  if (error) console.error('addRating error:', error);
  return rating;
}
