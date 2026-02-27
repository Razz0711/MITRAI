// ============================================
// MitrAI - Onboarding Questions Configuration
// ============================================

import { OnboardingStep } from './types';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 0,
    phase: 'Academic',
    question: '',
    field: 'targetExam',
    type: 'select',
    options: ['Semester Exams', 'GATE', 'Placements', 'GRE', 'CAT', 'Projects', 'Other'],
  },
  {
    id: 1,
    phase: 'Subjects',
    question: '',
    field: 'strongSubjects',
    type: 'text',
    placeholder: 'e.g. DSA, Thermodynamics, Circuit Theory...',
  },
  {
    id: 2,
    phase: 'Subjects',
    question: '',
    field: 'weakSubjects',
    type: 'text',
    placeholder: 'e.g. OS, Fluid Mechanics, Control Systems...',
  },
  {
    id: 3,
    phase: 'Study Style',
    question: '',
    field: 'studyMethod',
    type: 'multiselect',
    options: ['Reading notes', 'Watching videos', 'Solving problems', 'Group discussion'],
  },
  {
    id: 4,
    phase: 'Study Style',
    question: '',
    field: 'sessionLength',
    type: 'select',
    options: ['30 minutes', '1 hour', '2 hours'],
  },
  {
    id: 5,
    phase: 'Schedule',
    question: '',
    field: 'schedule',
    type: 'text',
    placeholder: 'e.g. Mon, Wed, Fri evenings 7-10 PM',
  },
  {
    id: 6,
    phase: 'Goals',
    question: '',
    field: 'shortTermGoal',
    type: 'text',
    placeholder: 'e.g. Score 9+ SGPA, clear GATE, etc.',
  },
  {
    id: 7,
    phase: 'Personality',
    question: '',
    field: 'personality',
    type: 'text',
    placeholder: 'Strict or flexible? Need accountability partner?',
  },
  {
    id: 8,
    phase: 'Complete',
    question: '',
    field: 'complete',
    type: 'text',
  },
];

// Parse raw onboarding data into a StudentProfile shape
// authData comes from registration (name, department, yearLevel, email, admissionNumber)
export function parseOnboardingData(
  rawData: Record<string, string>,
  authData?: { name: string; department: string; yearLevel: string; email: string; admissionNumber: string }
): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};

  // From registration
  parsed.name = authData?.name || rawData.name || 'Unknown';
  parsed.email = authData?.email || '';
  parsed.admissionNumber = authData?.admissionNumber || '';
  parsed.age = 19; // default age

  // SVNIT defaults
  parsed.city = 'Surat';
  parsed.country = 'India';
  parsed.institution = 'SVNIT Surat';
  parsed.preferredLanguage = 'English';
  parsed.timezone = 'IST';

  // Department from registration
  const dept = authData?.department || rawData.department || '';
  if (dept) {
    parsed.department = dept;
    // Auto-generate currentStudy from department
    if (dept.startsWith('Integrated')) {
      parsed.currentStudy = dept;
    } else if (dept === 'Mathematics & Computing') {
      parsed.currentStudy = 'B.Tech Mathematics & Computing';
    } else {
      parsed.currentStudy = `B.Tech ${dept}`;
    }
  }

  // Year from registration
  parsed.yearLevel = authData?.yearLevel || rawData.yearLevel || '';

  if (rawData.targetExam) parsed.targetExam = rawData.targetExam;

  // Parse subjects (comma separated)
  if (rawData.strongSubjects) {
    parsed.strongSubjects = rawData.strongSubjects.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (rawData.weakSubjects) {
    parsed.weakSubjects = rawData.weakSubjects.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Parse study methods
  if (rawData.studyMethod) {
    const methodMap: Record<string, string> = {
      'reading notes': 'notes',
      'watching videos': 'videos',
      'solving problems': 'problems',
      'group discussion': 'discussion',
    };
    if (rawData.studyMethod.includes(',')) {
      parsed.studyMethod = rawData.studyMethod.split(',').map(s => {
        const key = s.trim().toLowerCase();
        return methodMap[key] || key;
      });
    } else {
      const key = rawData.studyMethod.trim().toLowerCase();
      parsed.studyMethod = [methodMap[key] || key];
    }
  }

  // Parse session length
  if (rawData.sessionLength) {
    const len = rawData.sessionLength.toLowerCase();
    if (len.includes('30')) parsed.sessionLength = '30mins';
    else if (len.includes('2')) parsed.sessionLength = '2hrs';
    else parsed.sessionLength = '1hr';
  }

  // Parse schedule
  if (rawData.schedule) {
    const schedule = rawData.schedule;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const shortDays: Record<string, string> = {
      'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday',
      'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday',
    };

    const foundDays: string[] = [];
    const lowerSchedule = schedule.toLowerCase();

    // Check short forms first
    for (const [short, full] of Object.entries(shortDays)) {
      if (lowerSchedule.includes(short)) foundDays.push(full);
    }

    // If no short forms found, check full names
    if (foundDays.length === 0) {
      for (const day of days) {
        if (lowerSchedule.includes(day.toLowerCase())) foundDays.push(day);
      }
    }

    parsed.availableDays = foundDays.length > 0 ? foundDays : ['Monday', 'Wednesday', 'Friday'];

    // Extract time
    const timeMatch = schedule.match(/(\d{1,2}\s*(am|pm|AM|PM)?)\s*[-–to]+\s*(\d{1,2}\s*(am|pm|AM|PM)?)/);
    parsed.availableTimes = timeMatch ? timeMatch[0] : '7PM-10PM IST';
  }

  if (rawData.shortTermGoal) parsed.shortTermGoal = rawData.shortTermGoal;

  // Parse personality & study preferences
  if (rawData.personality) {
    const p = rawData.personality.toLowerCase();
    parsed.studyStyle = p.includes('strict') ? 'strict' : 'flexible';
    parsed.accountabilityNeed = (p.includes('accountability') || p.includes('yes') || p.includes('partner')) ? 'high' : 'medium';
    // Derive communication style
    if (p.includes('introvert') || p.includes('quiet') || p.includes('alone') || p.includes('solo')) {
      parsed.communication = 'introvert';
    } else if (p.includes('extrovert') || p.includes('group') || p.includes('social') || p.includes('talk')) {
      parsed.communication = 'extrovert';
    }
  }

  // Derive learning type from study method
  if (rawData.studyMethod) {
    const m = rawData.studyMethod.toLowerCase();
    if (m.includes('video')) parsed.learningType = 'visual';
    else if (m.includes('reading') || m.includes('notes')) parsed.learningType = 'reading';
    else if (m.includes('problem') || m.includes('solving')) parsed.learningType = 'practical';
    else if (m.includes('discussion') || m.includes('group')) parsed.learningType = 'auditory';
  }

  return parsed;
}
