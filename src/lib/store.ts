// ============================================
// MitrAI - In-Memory Data Store
// (Replace with database in production)
// ============================================

import { StudentProfile, StudySession, Notification } from './types';

// In-memory store (resets on server restart)
// In production, replace with Supabase/PostgreSQL
const students: Map<string, StudentProfile> = new Map();
const sessions: Map<string, StudySession> = new Map();
const notifications: Map<string, Notification[]> = new Map();

// ============================================
// Seed Data - Demo Students for Matching
// ============================================

const seedStudents: StudentProfile[] = [
  {
    id: 'demo-1',
    createdAt: new Date().toISOString(),
    name: 'Arjun Sharma',
    age: 17,
    city: 'Delhi',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    currentStudy: 'Class 12 Science',
    institution: 'DPS RK Puram',
    yearLevel: '12th',
    targetExam: 'JEE',
    targetDate: '2026-04-15',
    strongSubjects: ['Mathematics', 'Physics'],
    weakSubjects: ['Chemistry', 'Organic Chemistry'],
    currentlyStudying: 'Calculus',
    upcomingTopics: ['Integration', 'Differential Equations'],
    learningType: 'practical',
    studyMethod: ['problems', 'videos'],
    sessionLength: '2hrs',
    breakPattern: 'pomodoro',
    pace: 'fast',
    availableDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
    availableTimes: '7PM-10PM IST',
    sessionsPerWeek: 4,
    sessionType: 'both',
    studyStyle: 'strict',
    communication: 'extrovert',
    teachingAbility: 'can explain well',
    accountabilityNeed: 'high',
    videoCallComfort: true,
    shortTermGoal: 'Complete Calculus and Mechanics by March',
    longTermGoal: 'Crack JEE Advanced with top 5000 rank',
    studyHoursTarget: 6,
    weeklyGoals: 'Finish 4 chapters and solve 200 problems',
  },
  {
    id: 'demo-2',
    createdAt: new Date().toISOString(),
    name: 'Priya Patel',
    age: 17,
    city: 'Mumbai',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    currentStudy: 'Class 12 Science',
    institution: 'Narsee Monjee',
    yearLevel: '12th',
    targetExam: 'JEE',
    targetDate: '2026-04-15',
    strongSubjects: ['Chemistry', 'Organic Chemistry'],
    weakSubjects: ['Mathematics', 'Calculus'],
    currentlyStudying: 'Organic Chemistry Reactions',
    upcomingTopics: ['Thermodynamics', 'Electrochemistry'],
    learningType: 'visual',
    studyMethod: ['notes', 'videos'],
    sessionLength: '1hr',
    breakPattern: 'pomodoro',
    pace: 'medium',
    availableDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
    availableTimes: '8PM-10PM IST',
    sessionsPerWeek: 3,
    sessionType: 'both',
    studyStyle: 'flexible',
    communication: 'introvert',
    teachingAbility: 'can explain well',
    accountabilityNeed: 'medium',
    videoCallComfort: true,
    shortTermGoal: 'Master Organic Chemistry by March',
    longTermGoal: 'Get into IIT Bombay CS',
    studyHoursTarget: 5,
    weeklyGoals: 'Finish 3 chapters and complete practice sets',
  },
  {
    id: 'demo-3',
    createdAt: new Date().toISOString(),
    name: 'Rahul Kumar',
    age: 18,
    city: 'Bangalore',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    currentStudy: 'Class 12 Science',
    institution: 'National Public School',
    yearLevel: '12th',
    targetExam: 'JEE',
    targetDate: '2026-04-15',
    strongSubjects: ['Physics', 'Mathematics'],
    weakSubjects: ['Chemistry', 'Inorganic Chemistry'],
    currentlyStudying: 'Electromagnetic Induction',
    upcomingTopics: ['Optics', 'Modern Physics'],
    learningType: 'practical',
    studyMethod: ['problems', 'discussion'],
    sessionLength: '2hrs',
    breakPattern: 'flexible',
    pace: 'fast',
    availableDays: ['Monday', 'Wednesday', 'Friday', 'Sunday'],
    availableTimes: '6PM-9PM IST',
    sessionsPerWeek: 4,
    sessionType: 'teaching',
    studyStyle: 'strict',
    communication: 'extrovert',
    teachingAbility: 'can explain well',
    accountabilityNeed: 'high',
    videoCallComfort: true,
    shortTermGoal: 'Complete Physics syllabus by March',
    longTermGoal: 'Crack JEE Advanced top 1000',
    studyHoursTarget: 7,
    weeklyGoals: 'Solve 300 problems and give 2 mock tests',
  },
  {
    id: 'demo-4',
    createdAt: new Date().toISOString(),
    name: 'Sneha Reddy',
    age: 17,
    city: 'Hyderabad',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    currentStudy: 'Class 12 Biology',
    institution: 'Sri Chaitanya',
    yearLevel: '12th',
    targetExam: 'NEET',
    targetDate: '2026-05-10',
    strongSubjects: ['Biology', 'Zoology'],
    weakSubjects: ['Physics', 'Chemistry'],
    currentlyStudying: 'Human Physiology',
    upcomingTopics: ['Genetics', 'Ecology'],
    learningType: 'visual',
    studyMethod: ['notes', 'videos'],
    sessionLength: '1hr',
    breakPattern: 'pomodoro',
    pace: 'medium',
    availableDays: ['Tuesday', 'Thursday', 'Saturday', 'Sunday'],
    availableTimes: '5PM-8PM IST',
    sessionsPerWeek: 3,
    sessionType: 'learning',
    studyStyle: 'flexible',
    communication: 'introvert',
    teachingAbility: 'average',
    accountabilityNeed: 'high',
    videoCallComfort: false,
    shortTermGoal: 'Finish Biology NCERT by March end',
    longTermGoal: 'Get into AIIMS Delhi',
    studyHoursTarget: 5,
    weeklyGoals: 'Complete 2 chapters and revise previous ones',
  },
  {
    id: 'demo-5',
    createdAt: new Date().toISOString(),
    name: 'Aditya Joshi',
    age: 18,
    city: 'Pune',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    currentStudy: 'Class 12 Science',
    institution: 'Fergusson College',
    yearLevel: '12th',
    targetExam: 'JEE',
    targetDate: '2026-04-15',
    strongSubjects: ['Chemistry', 'Physical Chemistry'],
    weakSubjects: ['Physics', 'Mathematics'],
    currentlyStudying: 'Chemical Kinetics',
    upcomingTopics: ['Coordination Compounds', 'Polymers'],
    learningType: 'reading',
    studyMethod: ['notes', 'problems'],
    sessionLength: '1hr',
    breakPattern: 'flexible',
    pace: 'slow',
    availableDays: ['Monday', 'Wednesday', 'Saturday'],
    availableTimes: '9PM-11PM IST',
    sessionsPerWeek: 3,
    sessionType: 'learning',
    studyStyle: 'flexible',
    communication: 'introvert',
    teachingAbility: 'prefer learning',
    accountabilityNeed: 'medium',
    videoCallComfort: true,
    shortTermGoal: 'Improve Physics from basics',
    longTermGoal: 'Clear JEE Mains with 95 percentile',
    studyHoursTarget: 4,
    weeklyGoals: 'Complete 2 chapters and solve 100 problems',
  },
  {
    id: 'demo-6',
    createdAt: new Date().toISOString(),
    name: 'Kavya Nair',
    age: 17,
    city: 'Chennai',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    currentStudy: 'Class 12 Biology',
    institution: 'PSBB',
    yearLevel: '12th',
    targetExam: 'NEET',
    targetDate: '2026-05-10',
    strongSubjects: ['Biology', 'Botany', 'Chemistry'],
    weakSubjects: ['Physics'],
    currentlyStudying: 'Genetics',
    upcomingTopics: ['Biotechnology', 'Evolution'],
    learningType: 'reading',
    studyMethod: ['notes', 'discussion'],
    sessionLength: '1hr',
    breakPattern: 'pomodoro',
    pace: 'medium',
    availableDays: ['Tuesday', 'Thursday', 'Saturday', 'Sunday'],
    availableTimes: '6PM-9PM IST',
    sessionsPerWeek: 4,
    sessionType: 'both',
    studyStyle: 'strict',
    communication: 'extrovert',
    teachingAbility: 'can explain well',
    accountabilityNeed: 'high',
    videoCallComfort: true,
    shortTermGoal: 'Complete Genetics and Biotechnology',
    longTermGoal: 'Score 700+ in NEET',
    studyHoursTarget: 6,
    weeklyGoals: 'Finish 3 chapters and solve previous year papers',
  },
];

// Initialize with seed data
seedStudents.forEach(s => students.set(s.id, s));

// ============================================
// Student CRUD Operations
// ============================================

export function getAllStudents(): StudentProfile[] {
  return Array.from(students.values());
}

export function getStudentById(id: string): StudentProfile | undefined {
  return students.get(id);
}

export function createStudent(student: StudentProfile): StudentProfile {
  students.set(student.id, student);
  return student;
}

export function updateStudent(id: string, updates: Partial<StudentProfile>): StudentProfile | null {
  const existing = students.get(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates };
  students.set(id, updated);
  return updated;
}

export function deleteStudent(id: string): boolean {
  return students.delete(id);
}

// ============================================
// Session Operations
// ============================================

export function getAllSessions(): StudySession[] {
  return Array.from(sessions.values());
}

export function getSessionsByStudent(studentId: string): StudySession[] {
  return Array.from(sessions.values()).filter(
    s => s.student1Id === studentId || s.student2Id === studentId
  );
}

export function createSession(session: StudySession): StudySession {
  sessions.set(session.id, session);
  return session;
}

export function updateSession(id: string, updates: Partial<StudySession>): StudySession | null {
  const existing = sessions.get(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates };
  sessions.set(id, updated);
  return updated;
}

// ============================================
// Notification Operations
// ============================================

export function getNotifications(userId: string): Notification[] {
  return notifications.get(userId) || [];
}

export function addNotification(notification: Notification): void {
  const userNotifs = notifications.get(notification.userId) || [];
  userNotifs.push(notification);
  notifications.set(notification.userId, userNotifs);
}

export function markNotificationRead(userId: string, notifId: string): void {
  const userNotifs = notifications.get(userId);
  if (userNotifs) {
    const notif = userNotifs.find(n => n.id === notifId);
    if (notif) notif.read = true;
  }
}
