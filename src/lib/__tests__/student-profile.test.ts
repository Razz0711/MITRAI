// ============================================
// Tests for Student Profile Builder
// (Extracted helper in students/route.ts - Q4 fix)
// ============================================

import { describe, it, expect } from 'vitest';
import { STUDENT_PROFILE_DEFAULTS } from '../constants';

describe('STUDENT_PROFILE_DEFAULTS', () => {
  it('has all required default fields', () => {
    expect(STUDENT_PROFILE_DEFAULTS.age).toBe(17);
    expect(STUDENT_PROFILE_DEFAULTS.country).toBe('India');
    expect(STUDENT_PROFILE_DEFAULTS.institution).toBe('SVNIT Surat');
    expect(STUDENT_PROFILE_DEFAULTS.timezone).toBe('IST');
    expect(STUDENT_PROFILE_DEFAULTS.preferredLanguage).toBe('English');
    expect(STUDENT_PROFILE_DEFAULTS.learningType).toBe('practical');
    expect(STUDENT_PROFILE_DEFAULTS.sessionLength).toBe('1hr');
    expect(STUDENT_PROFILE_DEFAULTS.sessionsPerWeek).toBe(3);
    expect(STUDENT_PROFILE_DEFAULTS.videoCallComfort).toBe(true);
    expect(STUDENT_PROFILE_DEFAULTS.showBirthday).toBe(true);
  });

  it('has correct array defaults', () => {
    expect(STUDENT_PROFILE_DEFAULTS.studyMethod).toEqual(['problems']);
    expect(STUDENT_PROFILE_DEFAULTS.availableDays).toEqual(['Monday', 'Wednesday', 'Friday']);
  });

  it('studyHoursTarget is a positive number', () => {
    expect(STUDENT_PROFILE_DEFAULTS.studyHoursTarget).toBe(4);
    expect(STUDENT_PROFILE_DEFAULTS.studyHoursTarget).toBeGreaterThan(0);
  });
});
