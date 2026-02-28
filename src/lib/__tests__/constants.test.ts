// ============================================
// Tests for Constants
// Ensures NOTIFICATION_TYPES values are valid
// ============================================

import { describe, it, expect } from 'vitest';
import { NOTIFICATION_TYPES, NotificationType } from '../constants';

describe('NOTIFICATION_TYPES', () => {
  it('contains all expected notification type keys', () => {
    const expectedKeys = [
      'SESSION_REMINDER', 'STREAK', 'MISSED_SESSION', 'GOAL_ACHIEVEMENT',
      'WEEKLY_REPORT', 'MATCH_FOUND', 'BIRTHDAY_WISH', 'SESSION_REQUEST',
      'SESSION_ACCEPTED', 'SESSION_DECLINED',
    ];
    for (const key of expectedKeys) {
      expect(key in NOTIFICATION_TYPES).toBe(true);
    }
  });

  it('all values are non-empty strings', () => {
    for (const [key, value] of Object.entries(NOTIFICATION_TYPES)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      // Also ensure they are lowercase snake_case
      expect(value).toBe(value.toLowerCase());
      expect(key).not.toEqual(value); // key is UPPER, value is lower
    }
  });

  it('values are unique', () => {
    const values = Object.values(NOTIFICATION_TYPES);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('type assertion works correctly', () => {
    const t: NotificationType = NOTIFICATION_TYPES.SESSION_REMINDER;
    expect(t).toBe('session_reminder');
  });
});
