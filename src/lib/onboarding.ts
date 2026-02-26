// ============================================
// MitrAI - Onboarding Questions Configuration
// ============================================

import { OnboardingStep } from './types';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 0,
    phase: 'Welcome',
    question: '',
    field: 'name',
    type: 'text',
    placeholder: 'Type your name...',
  },
  {
    id: 1,
    phase: 'Basic Info',
    question: '',
    field: 'age',
    type: 'number',
    placeholder: 'Your age...',
  },
  {
    id: 2,
    phase: 'Basic Info',
    question: '',
    field: 'location',
    type: 'text',
    placeholder: 'e.g. Delhi, India',
  },
  {
    id: 3,
    phase: 'Basic Info',
    question: '',
    field: 'preferredLanguage',
    type: 'select',
    options: ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Other'],
  },
  {
    id: 4,
    phase: 'Academic',
    question: '',
    field: 'currentStudy',
    type: 'text',
    placeholder: 'e.g. Class 12 Science, B.Tech CSE...',
  },
  {
    id: 5,
    phase: 'Academic',
    question: '',
    field: 'targetExam',
    type: 'select',
    options: ['JEE', 'NEET', 'UPSC', 'CAT', 'GRE', 'GATE', 'Board Exams', 'Other'],
  },
  {
    id: 6,
    phase: 'Academic',
    question: '',
    field: 'yearLevel',
    type: 'text',
    placeholder: 'e.g. 12th grade, 2nd year...',
  },
  {
    id: 7,
    phase: 'Subjects',
    question: '',
    field: 'strongSubjects',
    type: 'text',
    placeholder: 'e.g. Physics, Math...',
  },
  {
    id: 8,
    phase: 'Subjects',
    question: '',
    field: 'weakSubjects',
    type: 'text',
    placeholder: 'e.g. Chemistry, Biology...',
  },
  {
    id: 9,
    phase: 'Study Style',
    question: '',
    field: 'studyMethod',
    type: 'multiselect',
    options: ['Reading notes', 'Watching videos', 'Solving problems', 'Group discussion'],
  },
  {
    id: 10,
    phase: 'Study Style',
    question: '',
    field: 'sessionLength',
    type: 'select',
    options: ['30 minutes', '1 hour', '2 hours', 'More than 2 hours'],
  },
  {
    id: 11,
    phase: 'Schedule',
    question: '',
    field: 'schedule',
    type: 'text',
    placeholder: 'e.g. Mon, Wed, Fri evenings 7-10 PM',
  },
  {
    id: 12,
    phase: 'Goals',
    question: '',
    field: 'shortTermGoal',
    type: 'text',
    placeholder: 'What\'s your main study goal right now?',
  },
  {
    id: 13,
    phase: 'Personality',
    question: '',
    field: 'personality',
    type: 'text',
    placeholder: 'Strict or flexible? Need accountability partner?',
  },
  {
    id: 14,
    phase: 'Complete',
    question: '',
    field: 'complete',
    type: 'text',
  },
];

// Parse raw onboarding data into a StudentProfile shape
export function parseOnboardingData(
  rawData: Record<string, string>
): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};

  if (rawData.name) parsed.name = rawData.name.trim();
  if (rawData.age) parsed.age = parseInt(rawData.age) || 17;

  // Parse location
  if (rawData.location) {
    const parts = rawData.location.split(',').map(s => s.trim());
    parsed.city = parts[0] || '';
    parsed.country = parts[1] || 'India';
  }

  if (rawData.preferredLanguage) parsed.preferredLanguage = rawData.preferredLanguage;
  if (rawData.currentStudy) parsed.currentStudy = rawData.currentStudy;
  if (rawData.targetExam) parsed.targetExam = rawData.targetExam;
  if (rawData.yearLevel) parsed.yearLevel = rawData.yearLevel;

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

  // Parse personality
  if (rawData.personality) {
    const p = rawData.personality.toLowerCase();
    parsed.studyStyle = p.includes('strict') ? 'strict' : 'flexible';
    parsed.accountabilityNeed = p.includes('accountability') || p.includes('yes') ? 'high' : 'medium';
  }

  return parsed;
}
