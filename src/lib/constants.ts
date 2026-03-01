// ============================================
// MitrAI - Shared Constants
// Single source of truth for notification types,
// event types, and other magic strings.
// ============================================

/** All valid notification type values */
export const NOTIFICATION_TYPES = {
  SESSION_REMINDER: 'session_reminder',
  STREAK: 'streak',
  MISSED_SESSION: 'missed_session',
  GOAL_ACHIEVEMENT: 'goal_achievement',
  WEEKLY_REPORT: 'weekly_report',
  MATCH_FOUND: 'match_found',
  BIRTHDAY_WISH: 'birthday_wish',
  SESSION_REQUEST: 'session_request',
  SESSION_ACCEPTED: 'session_accepted',
  SESSION_DECLINED: 'session_declined',
  // Engagement notifications
  ROOM_JOIN: 'room_join',
  ROOM_MESSAGE: 'room_message',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  ANON_WAITING: 'anon_waiting',
  DOUBT_POSTED: 'doubt_posted',
  MATERIAL_UPLOADED: 'material_uploaded',
} as const;

/** Union type derived from the constants object */
export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/** Default student profile field values (for builder) */
export const STUDENT_PROFILE_DEFAULTS = {
  age: 17,
  city: '',
  country: 'India',
  timezone: 'IST',
  preferredLanguage: 'English',
  institution: 'SVNIT Surat',
  learningType: 'practical' as const,
  studyMethod: ['problems'] as string[],
  sessionLength: '1hr',
  breakPattern: 'flexible',
  pace: 'medium',
  availableDays: ['Monday', 'Wednesday', 'Friday'] as string[],
  availableTimes: '7PM-10PM IST',
  sessionsPerWeek: 3,
  sessionType: 'both',
  studyStyle: 'flexible',
  communication: 'extrovert',
  teachingAbility: 'average',
  accountabilityNeed: 'medium',
  videoCallComfort: true,
  studyHoursTarget: 4,
  showBirthday: true,
} as const;
