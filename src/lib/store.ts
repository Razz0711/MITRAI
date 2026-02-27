// ============================================
// MitrAI - Data Store (Supabase)
// Persistent database — data survives deployments
// ============================================

import { StudentProfile, StudySession, Notification, StudyMaterial, UserAvailability, UserStatus, SessionBooking, BirthdayWish, FriendRequest, Friendship, BuddyRating, Subscription, DirectMessage, ChatThread, CalendarEvent, AttendanceRecord } from './types';
import { supabase } from './supabase';

// ============================================
// Helper: Convert between camelCase ↔ snake_case
// ============================================

function studentToRow(s: StudentProfile): Record<string, unknown> {
  return {
    id: s.id,
    created_at: s.createdAt,
    name: s.name,
    age: s.age,
    email: s.email,
    admission_number: s.admissionNumber,
    city: s.city,
    country: s.country,
    timezone: s.timezone,
    preferred_language: s.preferredLanguage,
    department: s.department,
    current_study: s.currentStudy,
    institution: s.institution,
    year_level: s.yearLevel,
    target_exam: s.targetExam,
    target_date: s.targetDate,
    strong_subjects: s.strongSubjects || [],
    weak_subjects: s.weakSubjects || [],
    currently_studying: s.currentlyStudying,
    upcoming_topics: s.upcomingTopics || [],
    learning_type: s.learningType,
    study_method: s.studyMethod || [],
    session_length: s.sessionLength,
    break_pattern: s.breakPattern,
    pace: s.pace,
    available_days: s.availableDays || [],
    available_times: s.availableTimes,
    sessions_per_week: s.sessionsPerWeek,
    session_type: s.sessionType,
    study_style: s.studyStyle,
    communication: s.communication,
    teaching_ability: s.teachingAbility,
    accountability_need: s.accountabilityNeed,
    video_call_comfort: s.videoCallComfort,
    short_term_goal: s.shortTermGoal,
    long_term_goal: s.longTermGoal,
    study_hours_target: s.studyHoursTarget,
    weekly_goals: s.weeklyGoals,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStudent(r: any): StudentProfile {
  return {
    id: r.id,
    createdAt: r.created_at,
    name: r.name || '',
    age: r.age || 0,
    email: r.email || '',
    admissionNumber: r.admission_number || '',
    city: r.city || '',
    country: r.country || '',
    timezone: r.timezone || '',
    preferredLanguage: r.preferred_language || '',
    department: r.department || '',
    currentStudy: r.current_study || '',
    institution: r.institution || '',
    yearLevel: r.year_level || '',
    targetExam: r.target_exam || '',
    targetDate: r.target_date || '',
    strongSubjects: r.strong_subjects || [],
    weakSubjects: r.weak_subjects || [],
    currentlyStudying: r.currently_studying || '',
    upcomingTopics: r.upcoming_topics || [],
    learningType: r.learning_type || 'practical',
    studyMethod: r.study_method || [],
    sessionLength: r.session_length || '1hr',
    breakPattern: r.break_pattern || 'flexible',
    pace: r.pace || 'medium',
    availableDays: r.available_days || [],
    availableTimes: r.available_times || '',
    sessionsPerWeek: r.sessions_per_week || 0,
    sessionType: r.session_type || 'both',
    studyStyle: r.study_style || 'flexible',
    communication: r.communication || 'introvert',
    teachingAbility: r.teaching_ability || 'average',
    accountabilityNeed: r.accountability_need || 'medium',
    videoCallComfort: r.video_call_comfort || false,
    shortTermGoal: r.short_term_goal || '',
    longTermGoal: r.long_term_goal || '',
    studyHoursTarget: r.study_hours_target || 0,
    weeklyGoals: r.weekly_goals || '',
  };
}

// ============================================
// Student CRUD Operations
// ============================================

export async function getAllStudents(): Promise<StudentProfile[]> {
  const { data, error } = await supabase.from('students').select('*');
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
function rowToSession(r: any): StudySession {
  return {
    id: r.id,
    student1Id: r.student1_id,
    student2Id: r.student2_id,
    topic: r.topic,
    goal: r.goal,
    startTime: r.start_time,
    endTime: r.end_time,
    status: r.status,
    summary: r.summary,
  };
}

export async function getAllSessions(): Promise<StudySession[]> {
  const { data, error } = await supabase.from('sessions').select('*');
  if (error) { console.error('getAllSessions error:', error); return []; }
  return (data || []).map(rowToSession);
}

export async function getSessionsByStudent(studentId: string): Promise<StudySession[]> {
  const { data, error } = await supabase.from('sessions').select('*').or(`student1_id.eq.${studentId},student2_id.eq.${studentId}`);
  if (error) { console.error('getSessionsByStudent error:', error); return []; }
  return (data || []).map(rowToSession);
}

export async function createSession(session: StudySession): Promise<StudySession> {
  const { error } = await supabase.from('sessions').upsert({
    id: session.id,
    student1_id: session.student1Id,
    student2_id: session.student2Id,
    topic: session.topic,
    goal: session.goal,
    start_time: session.startTime,
    end_time: session.endTime,
    status: session.status,
    summary: session.summary || null,
  });
  if (error) console.error('createSession error:', error);
  return session;
}

export async function updateSession(id: string, updates: Partial<StudySession>): Promise<StudySession | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = {};
  if (updates.topic !== undefined) row.topic = updates.topic;
  if (updates.goal !== undefined) row.goal = updates.goal;
  if (updates.startTime !== undefined) row.start_time = updates.startTime;
  if (updates.endTime !== undefined) row.end_time = updates.endTime;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.summary !== undefined) row.summary = updates.summary;
  const { error } = await supabase.from('sessions').update(row).eq('id', id);
  if (error) { console.error('updateSession error:', error); return null; }
  return { id, ...updates } as StudySession;
}

// ============================================
// Notification Operations
// ============================================

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { console.error('getNotifications error:', error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    message: r.message,
    read: r.read,
    createdAt: r.created_at,
  }));
}

export async function addNotification(notification: Notification): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    id: notification.id,
    user_id: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    created_at: notification.createdAt,
  });
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
function rowToMaterial(r: any): StudyMaterial {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    department: r.department,
    yearLevel: r.year_level,
    subject: r.subject,
    type: r.type,
    uploadedBy: r.uploaded_by,
    uploadedByEmail: r.uploaded_by_email,
    fileName: r.file_name,
    fileSize: r.file_size,
    storedFileName: r.stored_file_name,
    createdAt: r.created_at,
  };
}

export async function getAllMaterials(): Promise<StudyMaterial[]> {
  const { data, error } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
  if (error) { console.error('getAllMaterials error:', error); return []; }
  return (data || []).map(rowToMaterial);
}

export async function getMaterialById(id: string): Promise<StudyMaterial | undefined> {
  const { data, error } = await supabase.from('materials').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return rowToMaterial(data);
}

export async function getMaterialsByDepartment(department: string): Promise<StudyMaterial[]> {
  const all = await getAllMaterials();
  return all.filter(m => m.department === department);
}

export async function createMaterial(material: StudyMaterial): Promise<StudyMaterial> {
  const { error } = await supabase.from('materials').insert({
    id: material.id,
    title: material.title,
    description: material.description,
    department: material.department,
    year_level: material.yearLevel,
    subject: material.subject,
    type: material.type,
    uploaded_by: material.uploadedBy,
    uploaded_by_email: material.uploadedByEmail,
    file_name: material.fileName,
    file_size: material.fileSize,
    stored_file_name: material.storedFileName,
    created_at: material.createdAt,
  });
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
  const { error } = await supabase.from('availability').upsert({
    user_id: avail.userId,
    slots: avail.slots,
    updated_at: avail.updatedAt,
  });
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

export async function getAllUserStatuses(): Promise<UserStatus[]> {
  const { data, error } = await supabase.from('user_statuses').select('*');
  if (error) { console.error('getAllUserStatuses error:', error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    userId: r.user_id,
    status: r.status,
    lastSeen: r.last_seen,
    currentSubject: r.current_subject || undefined,
    sessionStartedAt: r.session_started_at || undefined,
    hideStatus: r.hide_status,
    hideSubject: r.hide_subject,
  }));
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
  const { error } = await supabase.from('user_statuses').upsert({
    user_id: merged.userId,
    status: merged.status,
    last_seen: merged.lastSeen,
    current_subject: merged.currentSubject || '',
    session_started_at: merged.sessionStartedAt || null,
    hide_status: merged.hideStatus,
    hide_subject: merged.hideSubject,
  });
  if (error) console.error('updateUserStatus error:', error);
  return merged;
}

// ============================================
// Session Bookings Operations
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBooking(r: any): SessionBooking {
  return {
    id: r.id,
    requesterId: r.requester_id,
    requesterName: r.requester_name,
    targetId: r.target_id,
    targetName: r.target_name,
    day: r.day,
    hour: r.hour,
    topic: r.topic,
    status: r.status,
    createdAt: r.created_at,
  };
}

export async function getAllBookings(): Promise<SessionBooking[]> {
  const { data, error } = await supabase.from('bookings').select('*');
  if (error) { console.error('getAllBookings error:', error); return []; }
  return (data || []).map(rowToBooking);
}

export async function getBookingsForUser(userId: string): Promise<SessionBooking[]> {
  const { data, error } = await supabase.from('bookings').select('*').or(`requester_id.eq.${userId},target_id.eq.${userId}`);
  if (error) { console.error('getBookingsForUser error:', error); return []; }
  return (data || []).map(rowToBooking);
}

export async function getBookingById(id: string): Promise<SessionBooking | undefined> {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return rowToBooking(data);
}

export async function createBooking(booking: SessionBooking): Promise<SessionBooking> {
  const { error } = await supabase.from('bookings').insert({
    id: booking.id,
    requester_id: booking.requesterId,
    requester_name: booking.requesterName,
    target_id: booking.targetId,
    target_name: booking.targetName,
    day: booking.day,
    hour: booking.hour,
    topic: booking.topic,
    status: booking.status,
    created_at: booking.createdAt,
  });
  if (error) console.error('createBooking error:', error);
  return booking;
}

export async function updateBooking(id: string, updates: Partial<SessionBooking>): Promise<SessionBooking | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.day !== undefined) row.day = updates.day;
  if (updates.hour !== undefined) row.hour = updates.hour;
  if (updates.topic !== undefined) row.topic = updates.topic;
  const { error } = await supabase.from('bookings').update(row).eq('id', id);
  if (error) { console.error('updateBooking error:', error); return null; }
  return { id, ...updates } as SessionBooking;
}

// ============================================
// Birthday Wishes Operations
// ============================================

export async function getBirthdayWishesForUser(userId: string): Promise<BirthdayWish[]> {
  const { data, error } = await supabase.from('birthday_wishes').select('*').eq('to_user_id', userId);
  if (error) { console.error('getBirthdayWishesForUser error:', error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    fromUserId: r.from_user_id,
    fromUserName: r.from_user_name,
    toUserId: r.to_user_id,
    createdAt: r.created_at,
  }));
}

export async function hasWishedToday(fromUserId: string, toUserId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('birthday_wishes').select('id').eq('from_user_id', fromUserId).eq('to_user_id', toUserId).gte('created_at', today);
  return (data || []).length > 0;
}

export async function addBirthdayWish(wish: BirthdayWish): Promise<void> {
  const { error } = await supabase.from('birthday_wishes').insert({
    id: wish.id,
    from_user_id: wish.fromUserId,
    from_user_name: wish.fromUserName,
    to_user_id: wish.toUserId,
    created_at: wish.createdAt,
  });
  if (error) console.error('addBirthdayWish error:', error);
}

// ============================================
// Friend Requests Operations
// ============================================

export async function getFriendRequestsForUser(userId: string): Promise<FriendRequest[]> {
  const { data, error } = await supabase.from('friend_requests').select('*').or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
  if (error) { console.error('getFriendRequestsForUser error:', error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    fromUserId: r.from_user_id,
    fromUserName: r.from_user_name,
    toUserId: r.to_user_id,
    toUserName: r.to_user_name,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function getPendingFriendRequests(userId: string): Promise<FriendRequest[]> {
  const { data, error } = await supabase.from('friend_requests').select('*').eq('to_user_id', userId).eq('status', 'pending');
  if (error) { console.error('getPendingFriendRequests error:', error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    fromUserId: r.from_user_id,
    fromUserName: r.from_user_name,
    toUserId: r.to_user_id,
    toUserName: r.to_user_name,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function createFriendRequest(req: FriendRequest): Promise<FriendRequest> {
  // Check if request already exists
  const { data: existing } = await supabase.from('friend_requests').select('*')
    .or(`and(from_user_id.eq.${req.fromUserId},to_user_id.eq.${req.toUserId}),and(from_user_id.eq.${req.toUserId},to_user_id.eq.${req.fromUserId})`);
  if (existing && existing.length > 0) {
    const r = existing[0];
    return { id: r.id, fromUserId: r.from_user_id, fromUserName: r.from_user_name, toUserId: r.to_user_id, toUserName: r.to_user_name, status: r.status, createdAt: r.created_at };
  }
  const { error } = await supabase.from('friend_requests').insert({
    id: req.id,
    from_user_id: req.fromUserId,
    from_user_name: req.fromUserName,
    to_user_id: req.toUserId,
    to_user_name: req.toUserName,
    status: req.status,
    created_at: req.createdAt,
  });
  if (error) console.error('createFriendRequest error:', error);
  return req;
}

export async function updateFriendRequestStatus(requestId: string, status: 'accepted' | 'declined'): Promise<FriendRequest | null> {
  const { data, error } = await supabase.from('friend_requests').update({ status }).eq('id', requestId).select().single();
  if (error || !data) { console.error('updateFriendRequestStatus error:', error); return null; }
  return { id: data.id, fromUserId: data.from_user_id, fromUserName: data.from_user_name, toUserId: data.to_user_id, toUserName: data.to_user_name, status: data.status, createdAt: data.created_at };
}

// ============================================
// Friendships Operations
// ============================================

export async function getFriendsForUser(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase.from('friendships').select('*').or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
  if (error) { console.error('getFriendsForUser error:', error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    user1Id: r.user1_id,
    user1Name: r.user1_name,
    user2Id: r.user2_id,
    user2Name: r.user2_name,
    createdAt: r.created_at,
  }));
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
  const { error } = await supabase.from('friendships').insert({
    id: friendship.id,
    user1_id: friendship.user1Id,
    user1_name: friendship.user1Name,
    user2_id: friendship.user2Id,
    user2_name: friendship.user2Name,
    created_at: friendship.createdAt,
  });
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

export async function getRatingsForUser(userId: string): Promise<BuddyRating[]> {
  const { data, error } = await supabase.from('ratings').select('*').eq('to_user_id', userId);
  if (error) { console.error('getRatingsForUser error:', error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    fromUserId: r.from_user_id,
    fromUserName: r.from_user_name,
    toUserId: r.to_user_id,
    toUserName: r.to_user_name,
    rating: r.rating,
    review: r.review,
    createdAt: r.created_at,
  }));
}

export async function getRatingsByUser(userId: string): Promise<BuddyRating[]> {
  const { data, error } = await supabase.from('ratings').select('*').eq('from_user_id', userId);
  if (error) { console.error('getRatingsByUser error:', error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    fromUserId: r.from_user_id,
    fromUserName: r.from_user_name,
    toUserId: r.to_user_id,
    toUserName: r.to_user_name,
    rating: r.rating,
    review: r.review,
    createdAt: r.created_at,
  }));
}

export async function getAverageRating(userId: string): Promise<number> {
  const userRatings = await getRatingsForUser(userId);
  if (userRatings.length === 0) return 0;
  const sum = userRatings.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / userRatings.length) * 10) / 10;
}

export async function addRating(rating: BuddyRating): Promise<BuddyRating> {
  const { error } = await supabase.from('ratings').insert({
    id: rating.id,
    from_user_id: rating.fromUserId,
    from_user_name: rating.fromUserName,
    to_user_id: rating.toUserId,
    to_user_name: rating.toUserName,
    rating: rating.rating,
    review: rating.review,
    created_at: rating.createdAt,
  });
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
  const { error } = await supabase.from('subscriptions').upsert({
    user_id: sub.userId,
    plan: sub.plan,
    start_date: sub.startDate,
    end_date: sub.endDate,
    status: sub.status,
    transaction_id: sub.transactionId || '',
    created_at: sub.createdAt,
  });
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    chatId: r.chat_id,
    senderId: r.sender_id,
    senderName: r.sender_name,
    receiverId: r.receiver_id,
    text: r.text,
    read: r.read,
    createdAt: r.created_at,
  }));
}

export async function addMessage(msg: DirectMessage): Promise<DirectMessage> {
  const { error } = await supabase.from('messages').insert({
    id: msg.id,
    chat_id: msg.chatId,
    sender_id: msg.senderId,
    sender_name: msg.senderName,
    receiver_id: msg.receiverId,
    text: msg.text,
    read: msg.read,
    created_at: msg.createdAt,
  });
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

export async function getThreadsForUser(userId: string): Promise<ChatThread[]> {
  const { data, error } = await supabase.from('chat_threads').select('*').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).order('last_message_at', { ascending: false });
  if (error) { console.error('getThreadsForUser error:', error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    chatId: r.chat_id,
    user1Id: r.user1_id,
    user1Name: r.user1_name,
    user2Id: r.user2_id,
    user2Name: r.user2_name,
    lastMessage: r.last_message,
    lastMessageAt: r.last_message_at,
    unreadCount1: r.unread_count1,
    unreadCount2: r.unread_count2,
  }));
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
function rowToCalendarEvent(r: any): CalendarEvent {
  return {
    id: r.id,
    userId: r.user_id || '',
    title: r.title || '',
    description: r.description || '',
    type: r.type || 'class',
    date: r.date || '',
    startTime: r.start_time || '',
    endTime: r.end_time || '',
    room: r.room || '',
    recurring: r.recurring || false,
    recurringDay: r.recurring_day || '',
    color: r.color || '',
    buddyId: r.buddy_id || '',
    buddyName: r.buddy_name || '',
    createdAt: r.created_at || '',
  };
}

function calendarEventToRow(e: CalendarEvent): Record<string, unknown> {
  return {
    id: e.id,
    user_id: e.userId,
    title: e.title,
    description: e.description,
    type: e.type,
    date: e.date,
    start_time: e.startTime,
    end_time: e.endTime,
    room: e.room,
    recurring: e.recurring,
    recurring_day: e.recurringDay,
    color: e.color,
    buddy_id: e.buddyId,
    buddy_name: e.buddyName,
    created_at: e.createdAt,
  };
}

export async function getCalendarEventsForUser(userId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase.from('calendar_events').select('*').eq('user_id', userId).order('date', { ascending: true });
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

export async function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
  const partial: Record<string, unknown> = {};
  if (updates.title !== undefined) partial.title = updates.title;
  if (updates.description !== undefined) partial.description = updates.description;
  if (updates.type !== undefined) partial.type = updates.type;
  if (updates.date !== undefined) partial.date = updates.date;
  if (updates.startTime !== undefined) partial.start_time = updates.startTime;
  if (updates.endTime !== undefined) partial.end_time = updates.endTime;
  if (updates.room !== undefined) partial.room = updates.room;
  if (updates.recurring !== undefined) partial.recurring = updates.recurring;
  if (updates.recurringDay !== undefined) partial.recurring_day = updates.recurringDay;
  if (updates.color !== undefined) partial.color = updates.color;
  if (updates.buddyId !== undefined) partial.buddy_id = updates.buddyId;
  if (updates.buddyName !== undefined) partial.buddy_name = updates.buddyName;

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
function rowToAttendance(r: any): AttendanceRecord {
  return {
    id: r.id,
    userId: r.user_id || '',
    subject: r.subject || '',
    totalClasses: r.total_classes || 0,
    attendedClasses: r.attended_classes || 0,
    lastUpdated: r.last_updated || '',
    createdAt: r.created_at || '',
  };
}

function attendanceToRow(a: AttendanceRecord): Record<string, unknown> {
  return {
    id: a.id,
    user_id: a.userId,
    subject: a.subject,
    total_classes: a.totalClasses,
    attended_classes: a.attendedClasses,
    last_updated: a.lastUpdated,
    created_at: a.createdAt,
  };
}

export async function getAttendanceForUser(userId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase.from('attendance').select('*').eq('user_id', userId).order('subject');
  if (error) { console.error('getAttendanceForUser error:', error); return []; }
  return (data || []).map(rowToAttendance);
}

export async function upsertAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
  const row = attendanceToRow(record);
  const { error } = await supabase.from('attendance').upsert(row, { onConflict: 'id' });
  if (error) console.error('upsertAttendance error:', error);
  return record;
}

export async function deleteAttendance(id: string): Promise<boolean> {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) { console.error('deleteAttendance error:', error); return false; }
  return true;
}
