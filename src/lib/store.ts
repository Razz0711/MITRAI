// ============================================
// MitrAI - Data Store with File Persistence
// (Data survives server restarts in dev mode)
// ============================================

import { StudentProfile, StudySession, Notification } from './types';
import fs from 'fs';
import path from 'path';

// File-based persistence for dev mode
const DATA_DIR = path.join(process.cwd(), '.data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStudentsFromFile(): Map<string, StudentProfile> {
  try {
    ensureDataDir();
    if (fs.existsSync(STUDENTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8'));
      return new Map(Object.entries(data));
    }
  } catch (e) {
    console.error('Failed to load students from file:', e);
  }
  return new Map();
}

function saveStudentsToFile() {
  try {
    ensureDataDir();
    const obj: Record<string, StudentProfile> = {};
    students.forEach((v, k) => { obj[k] = v; });
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error('Failed to save students to file:', e);
  }
}

// Load persisted data on startup
const students: Map<string, StudentProfile> = loadStudentsFromFile();
const sessions: Map<string, StudySession> = new Map();
const notifications: Map<string, Notification[]> = new Map();

// ============================================
// Demo Seed Data (only loaded when DEMO_MODE=true)
// ============================================

const seedStudents: StudentProfile[] = [
  {
    id: 'demo-1',
    createdAt: new Date().toISOString(),
    name: 'Arjun Sharma',
    age: 20,
    email: 'arjun.sharma@svnit.ac.in',
    admissionNumber: 'U23CS001',
    city: 'Surat',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    department: 'Computer Science & Engineering',
    currentStudy: 'B.Tech CSE',
    institution: 'SVNIT Surat',
    yearLevel: '3rd Year',
    targetExam: 'Semester Exams',
    targetDate: '2026-05-10',
    strongSubjects: ['Data Structures', 'Algorithms', 'DBMS'],
    weakSubjects: ['Computer Networks', 'Operating Systems'],
    currentlyStudying: 'Design and Analysis of Algorithms',
    upcomingTopics: ['Machine Learning', 'Compiler Design'],
    learningType: 'practical',
    studyMethod: ['problems', 'discussion'],
    sessionLength: '2hrs',
    breakPattern: 'pomodoro',
    pace: 'fast',
    availableDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
    availableTimes: '8PM-11PM IST',
    sessionsPerWeek: 4,
    sessionType: 'both',
    studyStyle: 'strict',
    communication: 'extrovert',
    teachingAbility: 'can explain well',
    accountabilityNeed: 'high',
    videoCallComfort: true,
    shortTermGoal: 'Score 9+ SGPA this semester',
    longTermGoal: 'Get placed in a top product company',
    studyHoursTarget: 5,
    weeklyGoals: 'Complete 3 chapters and solve 150 DSA problems',
  },
  {
    id: 'demo-2',
    createdAt: new Date().toISOString(),
    name: 'Priya Patel',
    age: 19,
    email: 'priya.patel@svnit.ac.in',
    admissionNumber: 'U24AI001',
    city: 'Surat',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    department: 'Artificial Intelligence',
    currentStudy: 'B.Tech AI',
    institution: 'SVNIT Surat',
    yearLevel: '2nd Year',
    targetExam: 'Semester Exams',
    targetDate: '2026-05-10',
    strongSubjects: ['Linear Algebra', 'Python Programming', 'Probability & Statistics'],
    weakSubjects: ['Digital Logic', 'Discrete Mathematics'],
    currentlyStudying: 'Machine Learning Fundamentals',
    upcomingTopics: ['Deep Learning', 'Natural Language Processing'],
    learningType: 'visual',
    studyMethod: ['videos', 'notes'],
    sessionLength: '1hr',
    breakPattern: 'pomodoro',
    pace: 'medium',
    availableDays: ['Monday', 'Tuesday', 'Thursday', 'Saturday'],
    availableTimes: '7PM-10PM IST',
    sessionsPerWeek: 3,
    sessionType: 'both',
    studyStyle: 'flexible',
    communication: 'introvert',
    teachingAbility: 'can explain well',
    accountabilityNeed: 'medium',
    videoCallComfort: true,
    shortTermGoal: 'Master ML algorithms before midsems',
    longTermGoal: 'Research internship at a top AI lab',
    studyHoursTarget: 4,
    weeklyGoals: 'Finish 2 ML modules and implement 3 algorithms',
  },
  {
    id: 'demo-3',
    createdAt: new Date().toISOString(),
    name: 'Rahul Verma',
    age: 20,
    email: 'rahul.verma@svnit.ac.in',
    admissionNumber: 'U23ME001',
    city: 'Surat',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    department: 'Mechanical Engineering',
    currentStudy: 'B.Tech Mechanical',
    institution: 'SVNIT Surat',
    yearLevel: '3rd Year',
    targetExam: 'GATE ME',
    targetDate: '2027-02-01',
    strongSubjects: ['Thermodynamics', 'Strength of Materials', 'Engineering Mechanics'],
    weakSubjects: ['Fluid Mechanics', 'Heat Transfer'],
    currentlyStudying: 'Manufacturing Processes',
    upcomingTopics: ['Machine Design', 'Vibrations'],
    learningType: 'practical',
    studyMethod: ['problems', 'notes'],
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
    shortTermGoal: 'Complete Thermo & SOM revision by March',
    longTermGoal: 'Crack GATE with under 500 AIR',
    studyHoursTarget: 6,
    weeklyGoals: 'Solve 200 GATE PYQs and revise 2 chapters',
  },
  {
    id: 'demo-4',
    createdAt: new Date().toISOString(),
    name: 'Sneha Desai',
    age: 19,
    email: 'sneha.desai@svnit.ac.in',
    admissionNumber: 'U24EC001',
    city: 'Surat',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    department: 'Electronics & Communication',
    currentStudy: 'B.Tech ECE',
    institution: 'SVNIT Surat',
    yearLevel: '2nd Year',
    targetExam: 'Semester Exams',
    targetDate: '2026-05-10',
    strongSubjects: ['Circuit Theory', 'Signals & Systems'],
    weakSubjects: ['Electromagnetic Theory', 'Microprocessors'],
    currentlyStudying: 'Analog Electronics',
    upcomingTopics: ['Digital Communication', 'VLSI Design'],
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
    shortTermGoal: 'Clear all subjects with A grade',
    longTermGoal: 'MS in VLSI from a top university',
    studyHoursTarget: 4,
    weeklyGoals: 'Complete 2 chapters, solve tutorials, revise previous week',
  },
  {
    id: 'demo-5',
    createdAt: new Date().toISOString(),
    name: 'Aditya Joshi',
    age: 21,
    email: 'aditya.joshi@svnit.ac.in',
    admissionNumber: 'U22CE001',
    city: 'Surat',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    department: 'Civil Engineering',
    currentStudy: 'B.Tech Civil',
    institution: 'SVNIT Surat',
    yearLevel: '4th Year',
    targetExam: 'GATE CE',
    targetDate: '2027-02-01',
    strongSubjects: ['Structural Analysis', 'RCC Design', 'Geotechnical Engineering'],
    weakSubjects: ['Fluid Mechanics', 'Environmental Engineering'],
    currentlyStudying: 'Steel Structures',
    upcomingTopics: ['Transportation Engineering', 'Estimation & Costing'],
    learningType: 'reading',
    studyMethod: ['notes', 'problems'],
    sessionLength: '2hrs',
    breakPattern: 'flexible',
    pace: 'medium',
    availableDays: ['Monday', 'Wednesday', 'Saturday'],
    availableTimes: '9PM-11PM IST',
    sessionsPerWeek: 3,
    sessionType: 'both',
    studyStyle: 'flexible',
    communication: 'introvert',
    teachingAbility: 'prefer learning',
    accountabilityNeed: 'medium',
    videoCallComfort: true,
    shortTermGoal: 'Master Structural Analysis for GATE',
    longTermGoal: 'Clear GATE and join IIT for M.Tech',
    studyHoursTarget: 5,
    weeklyGoals: 'Complete 2 chapters and solve 100 GATE problems',
  },
  {
    id: 'demo-6',
    createdAt: new Date().toISOString(),
    name: 'Kavya Mehta',
    age: 20,
    email: 'kavya.mehta@svnit.ac.in',
    admissionNumber: 'U23MA001',
    city: 'Surat',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    department: 'Integrated M.Sc. Mathematics',
    currentStudy: 'Integrated M.Sc. Mathematics',
    institution: 'SVNIT Surat',
    yearLevel: '3rd Year',
    targetExam: 'Semester Exams',
    targetDate: '2026-05-10',
    strongSubjects: ['Linear Algebra', 'Probability & Statistics', 'Numerical Analysis'],
    weakSubjects: ['Complex Analysis', 'Mechanics', 'Computer Networks'],
    currentlyStudying: 'Ordinary Differential Equations',
    upcomingTopics: ['Complex Analysis', 'Continuum Mechanics', 'Metric Spaces'],
    learningType: 'reading',
    studyMethod: ['notes', 'problems'],
    sessionLength: '2hrs',
    breakPattern: 'pomodoro',
    pace: 'medium',
    availableDays: ['Monday', 'Wednesday', 'Friday', 'Sunday'],
    availableTimes: '7PM-10PM IST',
    sessionsPerWeek: 4,
    sessionType: 'both',
    studyStyle: 'strict',
    communication: 'introvert',
    teachingAbility: 'can explain well',
    accountabilityNeed: 'high',
    videoCallComfort: true,
    shortTermGoal: 'Score 9+ SGPA in ODE and Probability',
    longTermGoal: 'Pursue research in Applied Mathematics or get into a quant firm',
    studyHoursTarget: 5,
    weeklyGoals: 'Finish 3 chapters, solve problem sets, revise proofs',
  },
  {
    id: 'demo-9',
    createdAt: new Date().toISOString(),
    name: 'Deepak Rathod',
    age: 19,
    email: 'deepak.rathod@svnit.ac.in',
    admissionNumber: 'U24MA002',
    city: 'Surat',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    department: 'Integrated M.Sc. Mathematics',
    currentStudy: 'Integrated M.Sc. Mathematics',
    institution: 'SVNIT Surat',
    yearLevel: '2nd Year',
    targetExam: 'Semester Exams',
    targetDate: '2026-05-10',
    strongSubjects: ['Elements of Analysis', 'Analytical Geometry', 'Discrete Mathematics'],
    weakSubjects: ['Numerical Analysis', 'Data Structures', 'Electromagnetics'],
    currentlyStudying: 'Linear Algebra',
    upcomingTopics: ['Number Theory', 'Computational Life Science'],
    learningType: 'practical',
    studyMethod: ['problems', 'discussion'],
    sessionLength: '1hr',
    breakPattern: 'flexible',
    pace: 'medium',
    availableDays: ['Tuesday', 'Thursday', 'Saturday'],
    availableTimes: '8PM-11PM IST',
    sessionsPerWeek: 3,
    sessionType: 'learning',
    studyStyle: 'flexible',
    communication: 'extrovert',
    teachingAbility: 'average',
    accountabilityNeed: 'medium',
    videoCallComfort: true,
    shortTermGoal: 'Clear Numerical Analysis and Linear Algebra with good grades',
    longTermGoal: 'GATE Mathematics or Data Science career',
    studyHoursTarget: 4,
    weeklyGoals: 'Complete tutorial sheets and practice 50 problems per subject',
  },
  {
    id: 'demo-7',
    createdAt: new Date().toISOString(),
    name: 'Rohan Tiwari',
    age: 19,
    email: 'rohan.tiwari@svnit.ac.in',
    admissionNumber: 'U24EE001',
    city: 'Surat',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    department: 'Electrical Engineering',
    currentStudy: 'B.Tech EE',
    institution: 'SVNIT Surat',
    yearLevel: '2nd Year',
    targetExam: 'Semester Exams',
    targetDate: '2026-05-10',
    strongSubjects: ['Circuit Analysis', 'Electrical Machines'],
    weakSubjects: ['Control Systems', 'Power Electronics'],
    currentlyStudying: 'Network Theory',
    upcomingTopics: ['Power Systems', 'Instrumentation'],
    learningType: 'practical',
    studyMethod: ['problems', 'videos'],
    sessionLength: '1hr',
    breakPattern: 'flexible',
    pace: 'medium',
    availableDays: ['Monday', 'Wednesday', 'Friday'],
    availableTimes: '8PM-10PM IST',
    sessionsPerWeek: 3,
    sessionType: 'learning',
    studyStyle: 'flexible',
    communication: 'introvert',
    teachingAbility: 'average',
    accountabilityNeed: 'medium',
    videoCallComfort: true,
    shortTermGoal: 'Clear Control Systems with good marks',
    longTermGoal: 'GATE EE or core company placement',
    studyHoursTarget: 4,
    weeklyGoals: 'Solve tutorial sheets and practice numericals',
  },
  {
    id: 'demo-8',
    createdAt: new Date().toISOString(),
    name: 'Ananya Iyer',
    age: 20,
    email: 'ananya.iyer@svnit.ac.in',
    admissionNumber: 'U23CH001',
    city: 'Surat',
    country: 'India',
    timezone: 'IST',
    preferredLanguage: 'English',
    department: 'Chemical Engineering',
    currentStudy: 'B.Tech Chemical',
    institution: 'SVNIT Surat',
    yearLevel: '3rd Year',
    targetExam: 'GATE CH',
    targetDate: '2027-02-01',
    strongSubjects: ['Chemical Reaction Engineering', 'Thermodynamics', 'Mass Transfer'],
    weakSubjects: ['Process Control', 'Heat Transfer'],
    currentlyStudying: 'Process Dynamics and Control',
    upcomingTopics: ['Plant Design', 'Process Economics'],
    learningType: 'reading',
    studyMethod: ['notes', 'problems'],
    sessionLength: '2hrs',
    breakPattern: 'pomodoro',
    pace: 'slow',
    availableDays: ['Tuesday', 'Thursday', 'Saturday', 'Sunday'],
    availableTimes: '7PM-10PM IST',
    sessionsPerWeek: 4,
    sessionType: 'both',
    studyStyle: 'strict',
    communication: 'extrovert',
    teachingAbility: 'can explain well',
    accountabilityNeed: 'high',
    videoCallComfort: true,
    shortTermGoal: 'Complete CRE and Mass Transfer revision',
    longTermGoal: 'Crack GATE CH and join IIT Bombay M.Tech',
    studyHoursTarget: 5,
    weeklyGoals: 'Revise 2 chapters and solve GATE PYQs',
  },
];

// Initialize with seed data only in demo mode
if (process.env.DEMO_MODE === 'true') {
  seedStudents.forEach(s => students.set(s.id, s));
}

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
  saveStudentsToFile();
  return student;
}

export function updateStudent(id: string, updates: Partial<StudentProfile>): StudentProfile | null {
  const existing = students.get(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates };
  students.set(id, updated);
  saveStudentsToFile();
  return updated;
}

export function deleteStudent(id: string): boolean {
  const result = students.delete(id);
  if (result) saveStudentsToFile();
  return result;
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
