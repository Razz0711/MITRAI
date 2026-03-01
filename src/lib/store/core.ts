// ============================================
// MitrAI - Store Core Utilities
// Generic camelCase ↔ snake_case converters
// ============================================

import { supabase } from '../supabase';

// Re-export supabase so domain modules can import from core
export { supabase };

export function camelToSnakeKey(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function snakeToCamelKey(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Convert a camelCase TS object → snake_case DB row (skips undefined values) */
export function toRow(obj: object): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) row[camelToSnakeKey(k)] = v;
  }
  return row;
}

/** Convert a snake_case DB row → camelCase TS object, applying optional defaults */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromRow<T>(row: any, defaults: Record<string, unknown> = {}): T {
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
export const STUDENT_DEFAULTS: Record<string, unknown> = {
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
  matchKey: '', programType: '', batchYear: '', deptCode: '', rollNo: '',
  deptKnown: true, profileAutoFilled: false,
};

export const CALENDAR_DEFAULTS: Record<string, unknown> = {
  userId: '', title: '', description: '', type: 'class', date: '',
  startTime: '', endTime: '', room: '', recurring: false, recurringDay: '',
  color: '', buddyId: '', buddyName: '', createdAt: '',
};

export const ATTENDANCE_DEFAULTS: Record<string, unknown> = {
  userId: '', subject: '', totalClasses: 0, attendedClasses: 0,
  lastUpdated: '', createdAt: '',
};

export const ATTENDANCE_LOG_DEFAULTS: Record<string, unknown> = {
  userId: '', subject: '', date: '', status: 'present', createdAt: '',
};
