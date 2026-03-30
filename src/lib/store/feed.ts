// ============================================
// MitrRAI - Campus Feed Store
// CRUD for posts and reactions
// ============================================

import { supabase } from './core';

export interface CampusPost {
  id: string;
  userId: string;
  content: string;
  category: string;
  subcategory: string | null;
  location: string;
  lat: number | null;
  lng: number | null;
  isAnonymous: boolean;
  createdAt: string;
  // Joined fields
  userName?: string;
  userPhotoUrl?: string;
  reactions?: { imin: number; reply: number; connect: number };
  myReactions?: string[]; // which types current user reacted with
  isMyPost?: boolean; // true if current user is the author (set before userId is stripped)
  isReportedByMe?: boolean; // true if current user has already reported the post
}

/** Internal post type with institution field for sorting */
interface InternalPost extends CampusPost {
  _institution: string;
}

/** Haversine distance in meters */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Fetch posts with optional filters */
export async function getFeedPosts(opts: {
  category?: string;
  location?: string;
  limit?: number;
  offset?: number;
  userId?: string;
  institution?: string; // user's own college (from email)
  userLat?: number;     // user's GPS latitude
  userLng?: number;     // user's GPS longitude
}): Promise<{ posts: CampusPost[]; total: number }> {
  const { category, location, limit = 20, offset = 0, userId, institution, userLat, userLng } = opts;

  let query = supabase
    .from('campus_posts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  if (location && location !== 'anywhere') {
    query = query.eq('location', location);
  }
  // Note: we do NOT filter by institution — we fetch all and sort later

  const { data, error, count } = await query;
  if (error) { console.error('getFeedPosts error:', error); return { posts: [], total: 0 }; }

  const internalPosts: InternalPost[] = (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    content: row.content,
    category: row.category,
    subcategory: row.subcategory,
    location: row.location,
    lat: row.lat,
    lng: row.lng,
    isAnonymous: row.is_anonymous,
    createdAt: row.created_at,
    _institution: row.institution || '',
  }));

  if (internalPosts.length === 0) return { posts: [], total: count || 0 };

  // Fetch user info for non-anonymous posts
  const nonAnonUserIds = Array.from(new Set(internalPosts.filter(p => !p.isAnonymous).map(p => p.userId)));
  const userMap = new Map<string, { name: string; photoUrl: string | null }>();
  if (nonAnonUserIds.length > 0) {
    const { data: users } = await supabase
      .from('students')
      .select('id, name, photo_url')
      .in('id', nonAnonUserIds);
    (users || []).forEach(u => userMap.set(u.id, { name: u.name, photoUrl: u.photo_url }));
  }

  // Fetch reaction counts
  const postIds = internalPosts.map(p => p.id);
  const { data: reactions } = await supabase
    .from('post_reactions')
    .select('post_id, type')
    .in('post_id', postIds);

  const reactionCounts = new Map<string, { imin: number; reply: number; connect: number }>();
  (reactions || []).forEach(r => {
    if (!reactionCounts.has(r.post_id)) {
      reactionCounts.set(r.post_id, { imin: 0, reply: 0, connect: 0 });
    }
    const counts = reactionCounts.get(r.post_id)!;
    if (r.type === 'imin') counts.imin++;
    else if (r.type === 'reply') counts.reply++;
    else if (r.type === 'connect') counts.connect++;
  });

  // Fetch current user's reactions
  const myReactionsMap = new Map<string, string[]>();
  const myReportsSet = new Set<string>();
  
  if (userId) {
    const [reactionsRes, reportsRes] = await Promise.all([
      supabase
        .from('post_reactions')
        .select('post_id, type')
        .eq('user_id', userId)
        .in('post_id', postIds),
      supabase
        .from('post_reports')
        .select('post_id')
        .eq('reporter_id', userId)
        .in('post_id', postIds)
    ]);
    
    (reactionsRes.data || []).forEach(r => {
      if (!myReactionsMap.has(r.post_id)) myReactionsMap.set(r.post_id, []);
      myReactionsMap.get(r.post_id)!.push(r.type);
    });
    
    (reportsRes.data || []).forEach(r => myReportsSet.add(r.post_id));
  }

  // Enrich posts
  for (const post of internalPosts) {
    post.isMyPost = userId ? post.userId === userId : false;
    post.isReportedByMe = myReportsSet.has(post.id);
    
    if (post.isAnonymous) {
      post.userName = `Anonymous_${post.userId.substring(0, 6).toUpperCase()}`;
      // Allow userId to pass through so users can chat with the anonymous poster
    } else {
      const user = userMap.get(post.userId);
      post.userName = user?.name || 'Unknown';
      post.userPhotoUrl = user?.photoUrl || undefined;
    }
    post.reactions = reactionCounts.get(post.id) || { imin: 0, reply: 0, connect: 0 };
    post.myReactions = myReactionsMap.get(post.id) || [];
  }

  // ─── Hybrid priority sort ───
  // Priority = own institution OR within 5km of user's location
  // Priority posts sorted by recency, others by reaction count
  let sorted: InternalPost[];
  if (institution || (userLat && userLng)) {
    const NEARBY_RADIUS = 5000; // 5km
    const isPriority = (p: InternalPost): boolean => {
      // Own institution match
      if (institution && p._institution === institution) return true;
      // Nearby location match (within 5km)
      if (userLat && userLng && p.lat && p.lng) {
        return haversineDistance(userLat, userLng, p.lat, p.lng) <= NEARBY_RADIUS;
      }
      return false;
    };

    const priorityPosts = internalPosts.filter(isPriority);
    const otherPosts = internalPosts.filter(p => !isPriority(p));

    // Priority: by recency (already sorted from DB)
    // Others: by total reactions descending
    otherPosts.sort((a, b) => {
      const aTotal = (a.reactions?.imin || 0) + (a.reactions?.reply || 0) + (a.reactions?.connect || 0);
      const bTotal = (b.reactions?.imin || 0) + (b.reactions?.reply || 0) + (b.reactions?.connect || 0);
      return bTotal - aTotal;
    });

    sorted = [...priorityPosts, ...otherPosts];
  } else {
    sorted = internalPosts;
  }

  // Strip internal field and return as CampusPost[]
  const posts: CampusPost[] = sorted.map(({ _institution, ...rest }) => rest);
  return { posts, total: count || 0 };
}

/** Create a new post */
export async function createPost(opts: {
  userId: string;
  content: string;
  category: string;
  subcategory?: string;
  location?: string;
  lat?: number;
  lng?: number;
  isAnonymous?: boolean;
  institution?: string;
}): Promise<{ success: boolean; post?: CampusPost; error?: string }> {
  if (!opts.content.trim()) return { success: false, error: 'Content required' };
  if (opts.content.length > 280) return { success: false, error: 'Max 280 characters' };

  const { data, error } = await supabase
    .from('campus_posts')
    .insert({
      user_id: opts.userId,
      content: opts.content.trim(),
      category: opts.category,
      subcategory: opts.subcategory || null,
      location: opts.location || 'Campus',
      lat: opts.lat || null,
      lng: opts.lng || null,
      is_anonymous: opts.isAnonymous || false,
      institution: opts.institution || null,
    })
    .select()
    .single();

  if (error) { console.error('createPost error:', error); return { success: false, error: 'Failed to create post' }; }
  return {
    success: true,
    post: {
      id: data.id,
      userId: opts.isAnonymous ? '' : data.user_id,
      content: data.content,
      category: data.category,
      subcategory: data.subcategory,
      location: data.location,
      lat: data.lat,
      lng: data.lng,
      isAnonymous: data.is_anonymous,
      createdAt: data.created_at,
    },
  };
}

/** Delete own post */
export async function deletePost(postId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  // Verify ownership
  const { data: post } = await supabase.from('campus_posts').select('user_id').eq('id', postId).single();
  if (!post) return { success: false, error: 'Post not found' };
  if (post.user_id !== userId) return { success: false, error: 'Not your post' };

  // Delete reactions first, then post
  await supabase.from('post_reactions').delete().eq('post_id', postId);
  const { error } = await supabase.from('campus_posts').delete().eq('id', postId);
  if (error) return { success: false, error: 'Failed to delete post' };
  return { success: true };
}

/** Toggle a reaction on a post */
export async function toggleReaction(postId: string, userId: string, type: string): Promise<{ success: boolean; active: boolean; counts: { imin: number; reply: number; connect: number }; error?: string }> {
  if (!['imin', 'reply', 'connect'].includes(type)) {
    return { success: false, active: false, counts: { imin: 0, reply: 0, connect: 0 }, error: 'Invalid reaction type' };
  }

  // Check if already reacted
  const { data: existing } = await supabase
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('type', type)
    .limit(1);

  let active: boolean;
  if (existing && existing.length > 0) {
    // Remove reaction
    await supabase.from('post_reactions').delete().eq('id', existing[0].id);
    active = false;
  } else {
    // Add reaction
    await supabase.from('post_reactions').insert({
      post_id: postId,
      user_id: userId,
      type,
    });
    active = true;
  }

  // Get updated counts
  const { data: allReactions } = await supabase
    .from('post_reactions')
    .select('type')
    .eq('post_id', postId);

  const counts = { imin: 0, reply: 0, connect: 0 };
  (allReactions || []).forEach(r => {
    if (r.type === 'imin') counts.imin++;
    else if (r.type === 'reply') counts.reply++;
    else if (r.type === 'connect') counts.connect++;
  });

  return { success: true, active, counts };
}
