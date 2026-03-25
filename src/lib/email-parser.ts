// ============================================
// MitrRAI - College Email Parser
// Accepts any Indian college email (*.ac.in)
// Auto-parses SVNIT format if detected, otherwise
// users provide their details during signup.
// ============================================

/** Program type codes → display labels (for SVNIT auto-parse) */
export const TYPE_MAP: Record<string, string> = {
  i: 'Integrated M.Sc.',
  u: 'B.Tech',
  p: 'M.Tech / M.Sc.',
  d: 'Ph.D.',
};

/** Department codes → display labels (for SVNIT auto-parse) */
export const DEPT_MAP: Record<string, string> = {
  ma: 'Mathematics',
  ph: 'Physics',
  cy: 'Chemistry',
  cs: 'Computer Science',
  ce: 'Civil Engineering',
  me: 'Mechanical Engineering',
  ec: 'Electronics & Communication',
  ee: 'Electrical Engineering',
  bt: 'Biotechnology',
  ch: 'Chemical Engineering',
  mc: 'Mathematics & Computing',
};

/** Map (type + dept) → the department label used in the signup dropdown / profile */
export const DEPT_DISPLAY_MAP: Record<string, Record<string, string>> = {
  i: {
    ma: 'Integrated M.Sc. Mathematics',
    ph: 'Integrated M.Sc. Physics',
    cy: 'Integrated M.Sc. Chemistry',
  },
  u: {
    cs: 'CSE',
    ce: 'Civil',
    me: 'Mechanical',
    ec: 'Electronics',
    ee: 'Electrical',
    ch: 'Chemical',
    bt: 'AI',
    mc: 'Mathematics & Computing',
    ph: 'B.Tech Physics',
  },
  p: {
    cs: 'CSE',
    ce: 'Civil',
    me: 'Mechanical',
    ec: 'Electronics',
    ee: 'Electrical',
    ch: 'Chemical',
    ma: 'Mathematics',
    ph: 'Physics',
    cy: 'Chemistry',
  },
  d: {
    cs: 'CSE',
    ce: 'Civil',
    me: 'Mechanical',
    ec: 'Electronics',
    ee: 'Electrical',
    ch: 'Chemical',
    ma: 'Mathematics',
    ph: 'Physics',
    cy: 'Chemistry',
  },
};

export interface ParsedEmail {
  /** e.g. "i22ma" — used for batch-only matching */
  matchKey: string;
  /** i, u, p, d */
  programType: string;
  /** 2-digit batch year e.g. "22" */
  batchYear: string;
  /** 2–3 letter dept code e.g. "ma" */
  deptCode: string;
  /** 3-digit roll e.g. "038" */
  rollNo: string;
  /** Display department label e.g. "Integrated M.Sc. Mathematics" */
  department: string;
  /** Display program label e.g. "Integrated M.Sc." */
  programLabel: string;
  /** Auto-calculated year level e.g. "3rd Year" */
  yearLevel: string;
  /** Admission number e.g. "I22MA038" */
  admissionNumber: string;
  /** currentStudy e.g. "Integrated M.Sc. Mathematics" */
  currentStudy: string;
  /** Whether the department code was recognized */
  deptKnown: boolean;
}

export interface EmailValidation {
  valid: boolean;
  error?: string;
  parsed?: ParsedEmail;
  /** True if the email is a recognized SVNIT email with auto-parsed data */
  autoDetected?: boolean;
}

/**
 * Check if email is a valid Indian college email (*.ac.in).
 * If it's an SVNIT email, also auto-parses batch/dept/year.
 * Non-SVNIT .ac.in emails are valid but won't have parsed data.
 */
export function validateCollegeEmail(email: string): EmailValidation {
  const trimmed = email.trim().toLowerCase();

  // Allow demo reviewer account
  if (trimmed === 'demo@mitrai.study') {
    return {
      valid: true,
      autoDetected: true,
      parsed: {
        admissionNumber: 'DEMO001',
        department: 'Computer Science & Engineering',
        yearLevel: '3rd Year',
        matchKey: 'demo-reviewer',
        programType: 'B.Tech',
        batchYear: '2024',
        deptCode: 'cs',
        rollNo: '001',
        deptKnown: true,
      } as ParsedEmail,
    };
  }

  // Check domain: must end with .ac.in
  if (!/@.+\.ac\.in$/.test(trimmed)) {
    return { valid: false, error: 'Only Indian college email addresses are allowed (must end with .ac.in)' };
  }

  // If it's an SVNIT email, try to auto-parse
  if (/@([a-z0-9-]+\.)?svnit\.ac\.in$/.test(trimmed)) {
    return parseSVNITEmail(trimmed);
  }

  // Any other .ac.in email — valid, but no auto-parse
  return { valid: true, autoDetected: false };
}

/** Keep backward compatibility */
export function validateSVNITEmail(email: string): EmailValidation {
  return validateCollegeEmail(email);
}

/**
 * Auto-parse SVNIT-specific email format.
 */
function parseSVNITEmail(trimmed: string): EmailValidation {
  const localPart = trimmed.split('@')[0];

  // Match student email pattern: [type][batch][dept][roll]
  const pattern = /^([iupd])(\d{2})([a-z]{2,3})(\d{3})$/;
  const match = localPart.match(pattern);

  if (!match) {
    // Could be faculty/staff — still valid .ac.in email but no parsed data
    return { valid: true, autoDetected: false };
  }

  const [, typeCode, batchYear, deptCode, rollNo] = match;

  // Validate batch year range
  const currentYY = new Date().getFullYear() % 100;
  const batchNum = parseInt(batchYear, 10);

  if (batchNum < 15 || batchNum > currentYY) {
    return { valid: true, autoDetected: false }; // Still valid email, just can't auto-parse
  }

  if (!TYPE_MAP[typeCode]) {
    return { valid: true, autoDetected: false };
  }

  const deptKnown = !!DEPT_MAP[deptCode];
  const matchKey = `${typeCode}${batchYear}${deptCode}`;
  const programLabel = TYPE_MAP[typeCode];
  const department = getDeptDisplayName(typeCode, deptCode);
  const yearLevel = calculateYear(batchYear);
  const admissionNumber = `${typeCode.toUpperCase()}${batchYear}${deptCode.toUpperCase()}${rollNo}`;
  const currentStudy = buildCurrentStudy(typeCode, deptCode);

  return {
    valid: true,
    autoDetected: true,
    parsed: {
      matchKey,
      programType: typeCode,
      batchYear,
      deptCode,
      rollNo,
      department,
      programLabel,
      yearLevel,
      admissionNumber,
      currentStudy,
      deptKnown,
    },
  };
}

/**
 * Parse a student email and return the parsed result.
 * Returns null if the email cannot be parsed.
 */
export function parseStudentEmail(email: string): ParsedEmail | null {
  const result = validateCollegeEmail(email);
  return result.parsed || null;
}

/**
 * Calculate year level from batch year.
 */
export function calculateYear(batchYear: string): string {
  const currentYear = new Date().getFullYear();
  const admissionYear = 2000 + parseInt(batchYear, 10);
  const diff = currentYear - admissionYear;

  if (diff <= 0) return '1st Year';
  if (diff === 1) return '1st Year';
  if (diff === 2) return '2nd Year';
  if (diff === 3) return '3rd Year';
  if (diff === 4) return '4th Year';
  if (diff === 5) return '5th Year';
  return '5th Year';
}

/**
 * Get the display department name for signup/profile.
 */
function getDeptDisplayName(typeCode: string, deptCode: string): string {
  const typeMap = DEPT_DISPLAY_MAP[typeCode];
  if (typeMap && typeMap[deptCode]) return typeMap[deptCode];

  if (DEPT_MAP[deptCode]) {
    const base = DEPT_MAP[deptCode];
    if (typeCode === 'i') return `Integrated M.Sc. ${base}`;
    return base;
  }

  return `Department (${deptCode.toUpperCase()})`;
}

/**
 * Build the currentStudy field from type + dept codes.
 */
function buildCurrentStudy(typeCode: string, deptCode: string): string {
  const deptName = DEPT_MAP[deptCode] || deptCode.toUpperCase();

  switch (typeCode) {
    case 'i': return `Integrated M.Sc. ${deptName}`;
    case 'u': return `B.Tech ${deptName}`;
    case 'p': return `M.Tech ${deptName}`;
    case 'd': return `Ph.D. ${deptName}`;
    default: return deptName;
  }
}
