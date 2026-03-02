// ============================================
// MitrAI - SVNIT Email Parser
// Extracts batch, department, year, program type
// from SVNIT email addresses automatically.
//
// Email format: [type][batch][dept][roll]@[subdomain].svnit.ac.in
// Example:      i22ma038@amhd.svnit.ac.in
//   type  = i (Integrated M.Sc.)
//   batch = 22
//   dept  = ma (Mathematics)
//   roll  = 038
//   match_key = i22ma
// ============================================

/** Program type codes → display labels */
export const TYPE_MAP: Record<string, string> = {
  i: 'Integrated M.Sc.',
  u: 'B.Tech',
  p: 'M.Tech / M.Sc.',
  d: 'Ph.D.',
};

/** Department codes → display labels */
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
  sv: 'SVNIT General',
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
    bt: 'AI',         // note: adjust if needed
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
}

/**
 * Validate an SVNIT email address and parse its components.
 * Domain can be any subdomain of svnit.ac.in (e.g. @amhd.svnit.ac.in, @phy.svnit.ac.in).
 */
export function validateSVNITEmail(email: string): EmailValidation {
  const trimmed = email.trim().toLowerCase();

  // Allow demo reviewer account
  if (trimmed === 'demo@mitrai.study') {
    return { valid: true, parsed: { admissionNumber: 'DEMO001', department: 'Computer Science & Engineering', yearLevel: '3rd Year', matchKey: 'demo-reviewer', programType: 'B.Tech', batchYear: '2024', deptCode: 'cs', rollNo: '001', deptKnown: true } as ParsedEmail };
  }

  // Check domain
  if (!/@([a-z0-9-]+\.)?svnit\.ac\.in$/.test(trimmed)) {
    return { valid: false, error: 'Only SVNIT email addresses are allowed' };
  }

  // Extract local part (before @)
  const localPart = trimmed.split('@')[0];

  // Match student email pattern: [type][batch][dept][roll]
  // type = 1 char (i/u/p/d)
  // batch = 2 digits
  // dept = 2-3 lowercase letters
  // roll = 3 digits
  const pattern = /^([iupd])(\d{2})([a-z]{2,3})(\d{3})$/;
  const match = localPart.match(pattern);

  if (!match) {
    // Could be a faculty/staff email or non-standard format
    return {
      valid: false,
      error: 'Could not parse email. Student emails follow the format like i22ma038@svnit.ac.in. If you are faculty/staff, this platform is for students only.',
    };
  }

  const [, typeCode, batchYear, deptCode, rollNo] = match;

  // Validate batch year range
  const currentYY = new Date().getFullYear() % 100; // e.g. 25 for 2025
  const batchNum = parseInt(batchYear, 10);

  if (batchNum < 15 || batchNum > currentYY) {
    return {
      valid: false,
      error: `Batch year '${batchYear}' seems invalid. Expected between 15 and ${currentYY}.`,
    };
  }

  // Validate type code
  if (!TYPE_MAP[typeCode]) {
    return { valid: false, error: `Unknown program type '${typeCode}'.` };
  }

  // Check department
  const deptKnown = !!DEPT_MAP[deptCode];

  // Build parsed result
  const matchKey = `${typeCode}${batchYear}${deptCode}`;
  const programLabel = TYPE_MAP[typeCode];
  const department = getDeptDisplayName(typeCode, deptCode);
  const yearLevel = calculateYear(batchYear);
  const admissionNumber = `${typeCode.toUpperCase()}${batchYear}${deptCode.toUpperCase()}${rollNo}`;
  const currentStudy = buildCurrentStudy(typeCode, deptCode);

  return {
    valid: true,
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
  const result = validateSVNITEmail(email);
  return result.parsed || null;
}

/**
 * Calculate year level from batch year.
 * e.g. batch "22" in year 2025 → diff = 2025 - 2022 = 3 → "3rd Year"
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
  return '5th Year'; // cap at 5th
}

/**
 * Get the display department name for signup/profile.
 */
function getDeptDisplayName(typeCode: string, deptCode: string): string {
  // Check specific display map first
  const typeMap = DEPT_DISPLAY_MAP[typeCode];
  if (typeMap && typeMap[deptCode]) return typeMap[deptCode];

  // Fallback to generic DEPT_MAP
  if (DEPT_MAP[deptCode]) {
    const base = DEPT_MAP[deptCode];
    if (typeCode === 'i') return `Integrated M.Sc. ${base}`;
    return base;
  }

  // Unknown dept
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
