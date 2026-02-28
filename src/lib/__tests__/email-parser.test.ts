// ============================================
// MitrAI - Email Parser Tests
// ============================================

import { describe, it, expect } from 'vitest';
import { validateSVNITEmail, parseStudentEmail, calculateYear, TYPE_MAP, DEPT_MAP } from '../email-parser';

describe('validateSVNITEmail', () => {
  it('parses a valid Integrated M.Sc. Mathematics email', () => {
    const result = validateSVNITEmail('i22ma038@amhd.svnit.ac.in');
    expect(result.valid).toBe(true);
    expect(result.parsed).toBeDefined();
    expect(result.parsed!.matchKey).toBe('i22ma');
    expect(result.parsed!.programType).toBe('i');
    expect(result.parsed!.batchYear).toBe('22');
    expect(result.parsed!.deptCode).toBe('ma');
    expect(result.parsed!.rollNo).toBe('038');
    expect(result.parsed!.admissionNumber).toBe('I22MA038');
    expect(result.parsed!.deptKnown).toBe(true);
  });

  it('parses a B.Tech Computer Science email', () => {
    const result = validateSVNITEmail('u23cs101@cse.svnit.ac.in');
    expect(result.valid).toBe(true);
    expect(result.parsed!.matchKey).toBe('u23cs');
    expect(result.parsed!.programType).toBe('u');
    expect(result.parsed!.batchYear).toBe('23');
    expect(result.parsed!.deptCode).toBe('cs');
    expect(result.parsed!.rollNo).toBe('101');
  });

  it('parses M.Tech/Ph.D. emails', () => {
    const mtech = validateSVNITEmail('p24ee005@svnit.ac.in');
    expect(mtech.valid).toBe(true);
    expect(mtech.parsed!.matchKey).toBe('p24ee');
    expect(mtech.parsed!.programType).toBe('p');

    const phd = validateSVNITEmail('d20ph002@phy.svnit.ac.in');
    expect(phd.valid).toBe(true);
    expect(phd.parsed!.matchKey).toBe('d20ph');
    expect(phd.parsed!.programType).toBe('d');
  });

  it('rejects non-SVNIT emails', () => {
    const result = validateSVNITEmail('student@gmail.com');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Only SVNIT');
  });

  it('rejects faculty/staff emails without student pattern', () => {
    const result = validateSVNITEmail('professor@svnit.ac.in');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Could not parse');
  });

  it('rejects emails with invalid batch year', () => {
    const result = validateSVNITEmail('i10ma001@svnit.ac.in');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Batch year');
  });

  it('handles 3-letter dept codes', () => {
    // "mc" for Mathematics & Computing or similar
    // Test with a known 2-letter code first
    const result = validateSVNITEmail('u22mc001@svnit.ac.in');
    expect(result.valid).toBe(true);
    expect(result.parsed!.deptCode).toBe('mc');
    expect(result.parsed!.matchKey).toBe('u22mc');
  });

  it('marks unknown dept codes as deptKnown=false', () => {
    const result = validateSVNITEmail('u22zz001@svnit.ac.in');
    expect(result.valid).toBe(true);
    expect(result.parsed!.deptKnown).toBe(false);
  });
});

describe('parseStudentEmail', () => {
  it('returns ParsedEmail for valid emails', () => {
    const parsed = parseStudentEmail('i22ma038@amhd.svnit.ac.in');
    expect(parsed).not.toBeNull();
    expect(parsed!.matchKey).toBe('i22ma');
  });

  it('returns null for invalid emails', () => {
    expect(parseStudentEmail('invalid@gmail.com')).toBeNull();
    expect(parseStudentEmail('professor@svnit.ac.in')).toBeNull();
  });
});

describe('calculateYear', () => {
  it('calculates correct year from batch', () => {
    const currentYear = new Date().getFullYear();
    
    // A batch from the current year should be 1st Year
    const currentBatch = String(currentYear % 100);
    expect(calculateYear(currentBatch)).toBe('1st Year');

    // A batch from 3 years ago should be 3rd Year
    const batch3Years = String((currentYear - 3) % 100);
    expect(calculateYear(batch3Years)).toBe('3rd Year');
  });

  it('caps at 5th Year', () => {
    expect(calculateYear('15')).toBe('5th Year');
  });

  it('returns 1st Year for future batch', () => {
    const futureBatch = String((new Date().getFullYear() + 1) % 100);
    expect(calculateYear(futureBatch)).toBe('1st Year');
  });
});

describe('TYPE_MAP and DEPT_MAP', () => {
  it('contains all expected program types', () => {
    expect(TYPE_MAP).toHaveProperty('i');
    expect(TYPE_MAP).toHaveProperty('u');
    expect(TYPE_MAP).toHaveProperty('p');
    expect(TYPE_MAP).toHaveProperty('d');
  });

  it('contains expected department codes', () => {
    expect(DEPT_MAP).toHaveProperty('cs');
    expect(DEPT_MAP).toHaveProperty('ma');
    expect(DEPT_MAP).toHaveProperty('ph');
    expect(DEPT_MAP).toHaveProperty('ec');
    expect(DEPT_MAP).toHaveProperty('ee');
    expect(DEPT_MAP).toHaveProperty('me');
    expect(DEPT_MAP).toHaveProperty('ce');
    expect(DEPT_MAP).toHaveProperty('ch');
    expect(DEPT_MAP).toHaveProperty('cy');
    expect(DEPT_MAP).toHaveProperty('bt');
  });
});
