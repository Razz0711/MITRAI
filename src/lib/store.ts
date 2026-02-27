// ============================================
// MitrAI - Data Store (Supabase)
// Persistent database — data survives deployments
// ============================================

import { StudentProfile, StudySession, Notification, StudyMaterial, UserAvailability, UserStatus, SessionBooking, BirthdayWish, FriendRequest, Friendship, BuddyRating, Subscription, DirectMessage, ChatThread, CalendarEvent, AttendanceRecord, Feedback } from './types';
import { supabase } from './supabase';

// ============================================
// Generic camelCase ↔ snake_case converters
// Eliminates ~500 lines of manual field-by-field mapping
// ============================================

function camelToSnakeKey(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function snakeToCamelKey(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Convert a camelCase TS object → snake_case DB row (skips undefined values) */
function toRow(obj: object): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) row[camelToSnakeKey(k)] = v;
  }
  return row;
}

/** Convert a snake_case DB row → camelCase TS object, applying optional defaults */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow<T>(row: any, defaults: Record<string, unknown> = {}): T {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    const ck = snakeToCamelKey(k);
    if (ck in defaults) {
      const d = defaults[ck];
      // Boolean defaults use ?? (preserve false); others use || (treat empty/0 as missing)
      obj[ck] = typeof d === 'boolean' ? (v ?? d) : (v || d);
    } else {
      obj[ck] = v;
    }
  }
  return obj as T;
}

// Per-type defaults (applied when DB value is null/undefined/empty)
const STUDENT_DEFAULTS: Record<string, unknown> = {
  name: '', age: 0, email: '', admissionNumber: '', city: '', country: '',
  timezone: '', preferredLanguage: '', department: '', currentStudy: '',
  institution: '', yearLevel: '', targetExam: '', targetDate: '',
  strongSubjects: [], weakSubjects: [], currentlyStudying: '', upcomingTopics: [],
  learningType: 'practical', studyMethod: [], sessionLength: '1hr',
  breakPattern: 'flexible', pace: 'medium', availableDays: [], availableTimes: '',
  sessionsPerWeek: 0, sessionType: 'both', studyStyle: 'flexible',
  communication: 'introvert', teachingAbility: 'average', accountabilityNeed: 'medium',
  videoCallComfort: false, shortTermGoal: '', longTermGoal: '', studyHoursTarget: 0,
  weeklyGoals: '', dob: '', showBirthday: true,
};

const CALENDAR_DEFAULTS: Record<string, unknown> = {
  userId: '', title: '', description: '', type: 'class', date: '',
  startTime: '', endTime: '', room: '', recurring: false, recurringDay: '',
  color: '', buddyId: '', buddyName: '', createdAt: '',
};

const ATTENDANCE_DEFAULTS: Record<string, unknown> = {
  userId: '', subject: '', totalClasses: 0, attendedClasses: 0,
  lastUpdated: '', createdAt: '',
};

// ============================================
// Student ↔ Row converters
// ============================================

function studentToRow(s: StudentProfile): Record<string, unknown> { return toRow(s); }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStudent(r: any): StudentProfile { return fromRow<StudentProfile>(r, STUDENT_DEFAULTS); }

// ============================================
// Student CRUD Operations
// ============================================

export async function getAllStudents(limit = 200, offset = 0): Promise<StudentProfile[]> {
  const { data, error } = await supabase.from('students').select('*').range(offset, offset + limit - 1);
  if (error) { console.error('getAllStudents error:', error); return []; }
  return (data || []).map(rowToStudent);
}

export async function getStudentById(id: string): Promise<StudentProfile | undefined> {
  const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return rowToStudent(data);
}

export async function createStudent(student: StudentProfile): Promise<StudentProfile> {
  const row = studentToRow(student);
  const { error } = await supabase.from('students').upsert(row);
  if (error) console.error('createStudent error:', error);
  return student;
}

export async function updateStudent(id: string, updates: Partial<StudentProfile>): Promise<StudentProfile | null> {
  const existing = await getStudentById(id);
  if (!existing) return null;
  const merged = { ...existing, ...updates };
  const row = studentToRow(merged);
  const { error } = await supabase.from('students').upsert(row);
  if (error) { console.error('updateStudent error:', error); return null; }
  return merged;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) { console.error('deleteStudent error:', error); return false; }
  return true;
}

// ============================================
// Session Operations
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSession(r: any): StudySession { return fromRow<StudySession>(r); }

export async function getAllSessions(limit = 100): Promise<StudySession[]> {
  const { data, error } = await supabase.from('sessions').select('*').limit(limit);
  if (error) { console.error('getAllSessions error:', error); return []; }
  return (data || []).map(rowToSession);
}

export async function getSessionsByStudent(studentId: string): Promise<StudySession[]> {
  const { data, error } = await supabase.from('sessions').select('*').or(`student1_id.eq.${studentId},student2_id.eq.${studentId}`);
  if (error) { console.error('getSessionsByStudent error:', error); return []; }
  return (data || []).map(rowToSession);
}

export async function createSession(session: StudySession): Promise<StudySession> {
  const { error } = await supabase.from('sessions').upsert(toRow(session));
  if (error) console.error('createSession error:', error);
  return session;
}

export async function updateSession(id: string, updates: Partial<StudySession>): Promise<StudySession | null> {
  const { error } = await supabase.from('sessions').update(toRow(updates)).eq('id', id);
  if (error) { console.error('updateSession error:', error); return null; }
  return { id, ...updates } as StudySession;
}

// ============================================
// Notification Operations
// ============================================

export async function getNotifications(userId: string, limit = 100, offset = 0): Promise<Notification[]> {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) { console.error('getNotifications error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<Notification>(r));
}

export async function addNotification(notification: Notification): Promise<void> {
  const { error } = await supabase.from('notifications').insert(toRow(notification));
  if (error) console.error('addNotification error:', error);
}

export async function markNotificationRead(userId: string, notifId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notifId).eq('user_id', userId);
  if (error) console.error('markNotificationRead error:', error);
}

// ============================================
// Study Materials Operations
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMaterial(r: any): StudyMaterial { return fromRow<StudyMaterial>(r); }

export async function getAllMaterials(filters?: {
  department?: string; type?: string; year?: string; search?: string;
}, limit = 50, offset = 0): Promise<StudyMaterial[]> {
  let query = supabase.from('materials').select('*');
  if (filters?.department && filters.department !== 'all') query = query.eq('department', filters.department);
  if (filters?.type && filters.type !== 'all') query = query.eq('type', filters.type);
  if (filters?.year && filters.year !== 'all') query = query.eq('year_level', filters.year);
  if (filters?.search) {
    // Sanitize search input to prevent PostgREST filter injection
    const safe = filters.search.replace(/[,().%\\]/g, '');
    if (safe) query = query.or(`title.ilike.%${safe}%,subject.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  const { data, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) { console.error('getAllMaterials error:', error); return []; }
  return (data || []).map(rowToMaterial);
}

export async function getMaterialById(id: string): Promise<StudyMaterial | undefined> {
  const { data, error } = await supabase.from('materials').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return rowToMaterial(data);
}

export async function getMaterialsByDepartment(department: string): Promise<StudyMaterial[]> {
  return getAllMaterials({ department });
}

export async function createMaterial(material: StudyMaterial): Promise<StudyMaterial> {
  const { error } = await supabase.from('materials').insert(toRow(material));
  if (error) console.error('createMaterial error:', error);
  return material;
}

export async function deleteMaterial(id: string): Promise<boolean> {
  const mat = await getMaterialById(id);
  if (!mat) return false;
  try {
    await supabase.storage.from('materials').remove([mat.storedFileName]);
  } catch (e) { console.error('Failed to delete uploaded file:', e); }
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) { console.error('deleteMaterial error:', error); return false; }
  return true;
}

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  zip: 'application/zip',
};

let bucketChecked = false;

async function ensureBucketExists() {
  if (bucketChecked) return;
  try {
    const { data, error: getErr } = await supabase.storage.getBucket('materials');
    console.log('[Storage] getBucket result:', data ? 'exists' : 'not found', getErr?.message || '');
    if (!data) {
      const { error: createError } = await supabase.storage.createBucket('materials', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      if (createError) {
        if (createError.message?.includes('already exists')) {
          console.log('[Storage] Bucket already exists (race condition)');
        } else {
          console.error('[Storage] Failed to create bucket:', createError.message);
          throw new Error('Cannot create storage bucket: ' + createError.message);
        }
      } else {
        console.log('[Storage] Created materials bucket successfully');
      }
    }
    bucketChecked = true;
  } catch (err) {
    console.error('[Storage] ensureBucketExists error:', err);
    throw err;
  }
}

export async function saveUploadedFile(fileName: string, buffer: Buffer): Promise<string> {
  await ensureBucketExists();
  const ext = (fileName.split('.').pop() || 'bin').toLowerCase();
  const storedName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  console.log(`[Storage] Uploading ${storedName} (${contentType}, ${buffer.length} bytes)`);
  
  const uint8 = new Uint8Array(buffer);
  const { error } = await supabase.storage.from('materials').upload(storedName, uint8, {
    contentType,
    upsert: false,
  });
  if (error) {
    console.error('[Storage] Upload error:', error.message, JSON.stringify(error));
    throw new Error('Storage upload failed: ' + error.message);
  }
  console.log(`[Storage] Upload success: ${storedName}`);
  return storedName;
}

export function getUploadedFileUrl(storedFileName: string): string {
  const { data } = supabase.storage.from('materials').getPublicUrl(storedFileName);
  return data.publicUrl;
}

// ============================================
// User Availability Operations
// ============================================

export async function getUserAvailability(userId: string): Promise<UserAvailability | undefined> {
  const { data, error } = await supabase.from('availability').select('*').eq('user_id', userId).single();
  if (error || !data) return undefined;
  return { userId: data.user_id, slots: data.slots || [], updatedAt: data.updated_at };
}

export async function setUserAvailability(avail: UserAvailability): Promise<void> {
  const { error } = await supabase.from('availability').upsert(toRow(avail));
  if (error) console.error('setUserAvailability error:', error);
}

export async function markSlotEngaged(userId: string, day: string, hour: number, sessionId: string, buddyName: string): Promise<void> {
  const ua = await getUserAvailability(userId);
  if (ua) {
    const slot = ua.slots.find(s => s.day === day && s.hour === hour);
    if (slot) {
      slot.status = 'engaged';
      slot.sessionId = sessionId;
      slot.buddyName = buddyName;
    }
    await setUserAvailability(ua);
  }
}

// ============================================
// User Status Operations
// ============================================

export async function getUserStatus(userId: string): Promise<UserStatus | undefined> {
  const { data, error } = await supabase.from('user_statuses').select('*').eq('user_id', userId).single();
  if (error || !data) return undefined;
  return {
    userId: data.user_id,
    status: data.status,
    lastSeen: data.last_seen,
    currentSubject: data.current_subject || undefined,
    sessionStartedAt: data.session_started_at || undefined,
    hideStatus: data.hide_status,
    hideSubject: data.hide_subject,
  };
}

export async function getAllUserStatuses(limit = 500): Promise<UserStatus[]> {
  const { data, error } = await supabase.from('user_statuses').select('*').limit(limit);
  if (error) { console.error('getAllUserStatuses error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<UserStatus>(r));
}

export async function updateUserStatus(userId: string, updates: Partial<UserStatus>): Promise<UserStatus> {
  const existing = await getUserStatus(userId);
  const merged: UserStatus = {
    userId,
    status: updates.status ?? existing?.status ?? 'offline',
    lastSeen: updates.lastSeen ?? existing?.lastSeen ?? new Date().toISOString(),
    currentSubject: updates.currentSubject ?? existing?.currentSubject,
    sessionStartedAt: updates.sessionStartedAt ?? existing?.sessionStartedAt,
    hideStatus: updates.hideStatus ?? existing?.hideStatus ?? false,
    hideSubject: updates.hideSubject ?? existing?.hideSubject ?? false,
  };
  const { error } = await supabase.from('user_statuses').upsert(toRow(merged));
  if (error) console.error('updateUserStatus error:', error);
  return merged;
}

// ============================================
// Session Bookings Operations
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBooking(r: any): SessionBooking { return fromRow<SessionBooking>(r); }

export async function getAllBookings(limit = 100, offset = 0): Promise<SessionBooking[]> {
  const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) { console.error('getAllBookings error:', error); return []; }
  return (data || []).map(rowToBooking);
}

export async function getBookingsForUser(userId: string, limit = 100, offset = 0): Promise<SessionBooking[]> {
  const { data, error } = await supabase.from('bookings').select('*').or(`requester_id.eq.${userId},target_id.eq.${userId}`).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) { console.error('getBookingsForUser error:', error); return []; }
  return (data || []).map(rowToBooking);
}

export async function getBookingById(id: string): Promise<SessionBooking | undefined> {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return rowToBooking(data);
}

export async function createBooking(booking: SessionBooking): Promise<SessionBooking> {
  const { error } = await supabase.from('bookings').insert(toRow(booking));
  if (error) console.error('createBooking error:', error);
  return booking;
}

export async function updateBooking(id: string, updates: Partial<SessionBooking>): Promise<SessionBooking | null> {
  const { error } = await supabase.from('bookings').update(toRow(updates)).eq('id', id);
  if (error) { console.error('updateBooking error:', error); return null; }
  return { id, ...updates } as SessionBooking;
}

// ============================================
// Birthday Wishes Operations
// ============================================

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

// ============================================
// Friend Requests Operations
// ============================================

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

// ============================================
// Friendships Operations
// ============================================

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

// ============================================
// Buddy Ratings Operations
// ============================================

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

// ============================================
// Subscriptions Operations
// ============================================

export async function getUserSubscription(userId: string): Promise<Subscription | undefined> {
  const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single();
  if (error || !data) return undefined;
  return { userId: data.user_id, plan: data.plan, startDate: data.start_date, endDate: data.end_date, status: data.status, transactionId: data.transaction_id || '', createdAt: data.created_at };
}

export async function setUserSubscription(sub: Subscription): Promise<Subscription> {
  const { error } = await supabase.from('subscriptions').upsert(toRow(sub));
  if (error) console.error('setUserSubscription error:', error);
  return sub;
}

export async function getAllPendingSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase.from('subscriptions').select('*').eq('status', 'pending');
  if (error || !data) return [];
  return data.map((d: Record<string, string>) => ({ userId: d.user_id, plan: d.plan as Subscription['plan'], startDate: d.start_date, endDate: d.end_date, status: d.status as Subscription['status'], transactionId: d.transaction_id || '', createdAt: d.created_at }));
}

export async function approveSubscription(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  if (!sub || sub.status !== 'pending') return false;
  const now = new Date();
  let endDate = '';
  if (sub.plan === 'monthly') { const end = new Date(now); end.setMonth(end.getMonth() + 1); endDate = end.toISOString(); }
  else if (sub.plan === 'yearly') { const end = new Date(now); end.setFullYear(end.getFullYear() + 1); endDate = end.toISOString(); }
  const { error } = await supabase.from('subscriptions').update({ status: 'active', start_date: now.toISOString(), end_date: endDate }).eq('user_id', userId);
  if (error) { console.error('approveSubscription error:', error); return false; }
  return true;
}

export async function rejectSubscription(userId: string): Promise<boolean> {
  const { error } = await supabase.from('subscriptions').update({ status: 'cancelled', plan: 'free' }).eq('user_id', userId);
  if (error) { console.error('rejectSubscription error:', error); return false; }
  return true;
}

// ============================================
// Chat / Messaging Operations
// ============================================

export function getChatId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('__');
}

export async function getMessagesForChat(chatId: string, limit = 50, before?: string): Promise<DirectMessage[]> {
  let query = supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
  if (before) query = query.lt('created_at', before);
  query = query.limit(limit);
  const { data, error } = await query;
  if (error) { console.error('getMessagesForChat error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<DirectMessage>(r));
}

export async function addMessage(msg: DirectMessage): Promise<DirectMessage> {
  const { error } = await supabase.from('messages').insert(toRow(msg));
  if (error) console.error('addMessage error:', error);

  // Update or create chat thread
  const { data: threadData } = await supabase.from('chat_threads').select('*').eq('chat_id', msg.chatId).single();
  if (threadData) {
    const updates: Record<string, unknown> = { last_message: msg.text, last_message_at: msg.createdAt };
    if (threadData.user1_id === msg.receiverId) {
      updates.unread_count1 = (threadData.unread_count1 || 0) + 1;
    } else {
      updates.unread_count2 = (threadData.unread_count2 || 0) + 1;
    }
    await supabase.from('chat_threads').update(updates).eq('chat_id', msg.chatId);
  } else {
    await supabase.from('chat_threads').insert({
      chat_id: msg.chatId,
      user1_id: msg.senderId,
      user1_name: msg.senderName,
      user2_id: msg.receiverId,
      user2_name: '',
      last_message: msg.text,
      last_message_at: msg.createdAt,
      unread_count1: 0,
      unread_count2: 1,
    });
  }
  return msg;
}

export async function deleteMessage(messageId: string, userId: string): Promise<boolean> {
  // Only allow sender to delete their own message
  const { data: msg } = await supabase.from('messages').select('*').eq('id', messageId).single();
  if (!msg || msg.sender_id !== userId) return false;

  const { error } = await supabase.from('messages').delete().eq('id', messageId);
  if (error) { console.error('deleteMessage error:', error); return false; }

  // Update thread's last message if this was the latest
  const chatId = msg.chat_id;
  const { data: latest } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (latest) {
    await supabase.from('chat_threads').update({
      last_message: latest.text,
      last_message_at: latest.created_at,
    }).eq('chat_id', chatId);
  } else {
    // No messages left — update thread to show empty
    await supabase.from('chat_threads').update({
      last_message: '',
      last_message_at: new Date().toISOString(),
    }).eq('chat_id', chatId);
  }

  return true;
}

export async function markMessagesRead(chatId: string, userId: string): Promise<void> {
  await supabase.from('messages').update({ read: true }).eq('chat_id', chatId).eq('receiver_id', userId).eq('read', false);
  const { data: thread } = await supabase.from('chat_threads').select('*').eq('chat_id', chatId).single();
  if (thread) {
    if (thread.user1_id === userId) {
      await supabase.from('chat_threads').update({ unread_count1: 0 }).eq('chat_id', chatId);
    } else {
      await supabase.from('chat_threads').update({ unread_count2: 0 }).eq('chat_id', chatId);
    }
  }
}

export async function getThreadsForUser(userId: string, limit = 50): Promise<ChatThread[]> {
  const { data, error } = await supabase.from('chat_threads').select('*').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).order('last_message_at', { ascending: false }).limit(limit);
  if (error) { console.error('getThreadsForUser error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<ChatThread>(r));
}

export async function getUnreadCountForUser(userId: string): Promise<number> {
  const threads = await getThreadsForUser(userId);
  let count = 0;
  threads.forEach(t => {
    if (t.user1Id === userId) count += t.unreadCount1;
    else if (t.user2Id === userId) count += t.unreadCount2;
  });
  return count;
}

export async function updateThreadUserName(chatId: string, userId: string, userName: string): Promise<void> {
  const { data: thread } = await supabase.from('chat_threads').select('*').eq('chat_id', chatId).single();
  if (thread) {
    if (thread.user1_id === userId) {
      await supabase.from('chat_threads').update({ user1_name: userName }).eq('chat_id', chatId);
    } else if (thread.user2_id === userId) {
      await supabase.from('chat_threads').update({ user2_name: userName }).eq('chat_id', chatId);
    }
  }
}

// ============================================
// Calendar Events
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCalendarEvent(r: any): CalendarEvent { return fromRow<CalendarEvent>(r, CALENDAR_DEFAULTS); }
function calendarEventToRow(e: CalendarEvent): Record<string, unknown> { return toRow(e); }

export async function getCalendarEventsForUser(userId: string, limit = 200): Promise<CalendarEvent[]> {
  const { data, error } = await supabase.from('calendar_events').select('*').eq('user_id', userId).order('date', { ascending: true }).limit(limit);
  if (error) { console.error('getCalendarEventsForUser error:', error); return []; }
  return (data || []).map(rowToCalendarEvent);
}

export async function getCalendarEventsByDateRange(userId: string, startDate: string, endDate: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase.from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .or(`and(date.gte.${startDate},date.lte.${endDate}),recurring.eq.true`)
    .order('date', { ascending: true });
  if (error) { console.error('getCalendarEventsByDateRange error:', error); return []; }
  return (data || []).map(rowToCalendarEvent);
}

export async function createCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
  const row = calendarEventToRow(event);
  const { error } = await supabase.from('calendar_events').insert(row);
  if (error) console.error('createCalendarEvent error:', error);
  return event;
}

export async function getCalendarEventById(id: string): Promise<CalendarEvent | null> {
  const { data, error } = await supabase.from('calendar_events').select().eq('id', id).single();
  if (error || !data) return null;
  return rowToCalendarEvent(data);
}

export async function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
  const partial = toRow(updates);
  const { data, error } = await supabase.from('calendar_events').update(partial).eq('id', id).select().single();
  if (error) { console.error('updateCalendarEvent error:', error); return null; }
  return rowToCalendarEvent(data);
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) { console.error('deleteCalendarEvent error:', error); return false; }
  return true;
}

// ============================================
// Attendance Functions
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAttendance(r: any): AttendanceRecord { return fromRow<AttendanceRecord>(r, ATTENDANCE_DEFAULTS); }
function attendanceToRow(a: AttendanceRecord): Record<string, unknown> { return toRow(a); }

export async function getAttendanceForUser(userId: string, limit = 100): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase.from('attendance').select('*').eq('user_id', userId).order('subject').limit(limit);
  if (error) { console.error('getAttendanceForUser error:', error); return []; }
  return (data || []).map(rowToAttendance);
}

export async function upsertAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
  const row = attendanceToRow(record);
  const { error } = await supabase.from('attendance').upsert(row, { onConflict: 'id' });
  if (error) console.error('upsertAttendance error:', error);
  return record;
}

export async function upsertBulkAttendance(records: AttendanceRecord[]): Promise<AttendanceRecord[]> {
  if (records.length === 0) return [];
  const rows = records.map(attendanceToRow);
  const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'id' });
  if (error) console.error('upsertBulkAttendance error:', error);
  return records;
}

export async function deleteAttendance(id: string): Promise<boolean> {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) { console.error('deleteAttendance error:', error); return false; }
  return true;
}

export async function getAttendanceRecordById(id: string): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase.from('attendance').select('*').eq('id', id).single();
  if (error || !data) return null;
  return rowToAttendance(data);
}

// ============================================
// Feedback Operations
// ============================================

export async function createFeedback(fb: Feedback): Promise<Feedback> {
  const { error } = await supabase.from('feedback').insert(toRow(fb));
  if (error) { console.error('createFeedback error:', error); }
  return fb;
}

export async function getAllFeedback(limit = 100): Promise<Feedback[]> {
  const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) { console.error('getAllFeedback error:', error); return []; }
  return (data || []).map((r: any) => fromRow<Feedback>(r));
}
