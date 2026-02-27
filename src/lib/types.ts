// ============================================
// MitrAI - Study Buddy Matching Platform Types
// ============================================

export interface StudentProfile {
  id: string;
  createdAt: string;

  // Basic Info
  name: string;
  age: number;
  email: string;
  admissionNumber: string;
  city: string;
  country: string;
  timezone: string;
  preferredLanguage: string;

  // Academic Info
  department: string; // CSE, AI, Mechanical, etc.
  currentStudy: string; // degree/exam/course
  institution: string;
  yearLevel: string;
  targetExam: string;
  targetDate: string;

  // Subjects
  strongSubjects: string[];
  weakSubjects: string[];
  currentlyStudying: string;
  upcomingTopics: string[];

  // Study Style
  learningType: LearningType;
  studyMethod: StudyMethod[];
  sessionLength: SessionLength;
  breakPattern: BreakPattern;
  pace: StudyPace;

  // Schedule
  availableDays: Day[];
  availableTimes: string; // e.g. "8PM-11PM IST"
  sessionsPerWeek: number;
  sessionType: SessionType;

  // Personality
  studyStyle: StudyStylePref;
  communication: CommunicationType;
  teachingAbility: TeachingAbility;
  accountabilityNeed: Level;
  videoCallComfort: boolean;

  // Goals
  shortTermGoal: string;
  longTermGoal: string;
  studyHoursTarget: number;
  weeklyGoals: string;
}

export type LearningType = 'visual' | 'auditory' | 'reading' | 'practical';
export type StudyMethod = 'notes' | 'videos' | 'problems' | 'discussion';
export type SessionLength = '30mins' | '1hr' | '2hrs';
export type BreakPattern = 'pomodoro' | 'flexible';
export type StudyPace = 'fast' | 'medium' | 'slow';
export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type SessionType = 'teaching' | 'learning' | 'both';
export type StudyStylePref = 'strict' | 'flexible';
export type CommunicationType = 'introvert' | 'extrovert';
export type TeachingAbility = 'can explain well' | 'average' | 'prefer learning';
export type Level = 'high' | 'medium' | 'low';

// ============================================
// Onboarding Types
// ============================================

export interface OnboardingStep {
  id: number;
  phase: string;
  question: string;
  field: keyof StudentProfile | string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date';
  options?: string[];
  placeholder?: string;
  validation?: (value: string) => boolean;
}

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
}

// ============================================
// Matching Types
// ============================================

export interface MatchScore {
  overall: number;
  subject: number;
  schedule: number;
  style: number;
  goal: number;
  personality: number;
}

export interface MatchResult {
  student: StudentProfile;
  score: MatchScore;
  whyItWorks: string;
  potentialChallenges: string;
  recommendedFirstTopic: string;
  bestFormat: string;
  complementaryFactors: string[];
}

// ============================================
// Study Plan Types
// ============================================

export interface DailyPlan {
  day: Day;
  soloSession: {
    time: string;
    topic: string;
    duration: string;
    goal: string;
    resources: string[];
  };
  buddySession?: {
    time: string;
    topic: string;
    duration: string;
    format: string;
    goals: string[];
  };
  dailyTarget: string;
}

export interface WeeklyStudyPlan {
  studentName: string;
  buddyName: string;
  weekDates: string;
  mainGoal: string;
  days: DailyPlan[];
  weekSummary: {
    topicsToComplete: string[];
    problemsToSolve: number;
    mockTests: number;
    hoursTarget: number;
  };
  successMetrics: string[];
}

// ============================================
// Session Types
// ============================================

export interface StudySession {
  id: string;
  student1Id: string;
  student2Id: string;
  topic: string;
  goal: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  summary?: SessionSummary;
}

export interface SessionSummary {
  topicsCovered: string[];
  conceptsMastered: string[];
  needsMorePractice: string[];
  homework: string[];
  nextSessionTopic: string;
  rating: number;
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
  id: string;
  userId: string;
  type: 'session_reminder' | 'streak' | 'missed_session' | 'goal_achievement' | 'weekly_report' | 'match_found';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
