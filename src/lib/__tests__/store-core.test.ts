// ============================================
// Tests for Store Core Utilities
// camelCase ↔ snake_case converters, toRow, fromRow
// ============================================

import { describe, it, expect, vi } from 'vitest';

// Mock supabase client so it doesn't require env vars
vi.mock('../supabase', () => ({
  supabase: {},
}));

import { camelToSnakeKey, snakeToCamelKey, toRow, fromRow } from '../store/core';

describe('camelToSnakeKey', () => {
  it('converts camelCase to snake_case', () => {
    expect(camelToSnakeKey('userId')).toBe('user_id');
    expect(camelToSnakeKey('createdAt')).toBe('created_at');
    expect(camelToSnakeKey('strongSubjects')).toBe('strong_subjects');
  });

  it('leaves already-lower-case strings unchanged', () => {
    expect(camelToSnakeKey('name')).toBe('name');
    expect(camelToSnakeKey('id')).toBe('id');
  });

  it('handles multiple uppercase letters', () => {
    expect(camelToSnakeKey('videoCallComfort')).toBe('video_call_comfort');
    expect(camelToSnakeKey('studyHoursTarget')).toBe('study_hours_target');
  });
});

describe('snakeToCamelKey', () => {
  it('converts snake_case to camelCase', () => {
    expect(snakeToCamelKey('user_id')).toBe('userId');
    expect(snakeToCamelKey('created_at')).toBe('createdAt');
    expect(snakeToCamelKey('strong_subjects')).toBe('strongSubjects');
  });

  it('leaves already camelCase strings unchanged', () => {
    expect(snakeToCamelKey('name')).toBe('name');
    expect(snakeToCamelKey('id')).toBe('id');
  });
});

describe('toRow', () => {
  it('converts camelCase object keys to snake_case', () => {
    const row = toRow({ userId: '123', createdAt: '2024-01-01', name: 'Test' });
    expect(row).toEqual({
      user_id: '123',
      created_at: '2024-01-01',
      name: 'Test',
    });
  });

  it('skips undefined values', () => {
    const row = toRow({ userId: '123', name: undefined, age: 20 });
    expect(row).toEqual({ user_id: '123', age: 20 });
    expect('name' in row).toBe(false);
  });

  it('preserves falsy non-undefined values', () => {
    const row = toRow({ active: false, count: 0, label: '' });
    expect(row).toEqual({ active: false, count: 0, label: '' });
  });
});

describe('fromRow', () => {
  it('converts snake_case row to camelCase object', () => {
    const obj = fromRow<{ userId: string; createdAt: string }>({
      user_id: '123',
      created_at: '2024-01-01',
    });
    expect(obj).toEqual({ userId: '123', createdAt: '2024-01-01' });
  });

  it('applies defaults for missing (null/empty) values', () => {
    const defaults = { name: 'Unknown', age: 0, active: true };
    const obj = fromRow<{ name: string; age: number; active: boolean }>(
      { name: null, age: null, active: null },
      defaults,
    );
    // Boolean defaults use ??; others use ||
    expect(obj.name).toBe('Unknown');
    expect(obj.age).toBe(0);
    expect(obj.active).toBe(true);
  });

  it('preserves false for boolean defaults', () => {
    const defaults = { showBirthday: true };
    const obj = fromRow<{ showBirthday: boolean }>(
      { show_birthday: false },
      defaults,
    );
    expect(obj.showBirthday).toBe(false);
  });

  it('uses actual values when they are truthy', () => {
    const defaults = { name: 'Unknown', age: 0 };
    const obj = fromRow<{ name: string; age: number }>(
      { name: 'Alice', age: 21 },
      defaults,
    );
    expect(obj.name).toBe('Alice');
    expect(obj.age).toBe(21);
  });
});
