// ============================================
// MitrAI - Study Buddy Matching Algorithm
// ============================================

import { StudentProfile, MatchResult, MatchScore } from './types';
import { generateMatchExplanation } from './gemini';

// ============================================
// Core Scoring Functions
// ============================================

function scoreSubjectCompatibility(student: StudentProfile, candidate: StudentProfile): number {
  // Max 30 points

  // Same exam target = 30 points
  if (student.targetExam && candidate.targetExam &&
    student.targetExam.toLowerCase() === candidate.targetExam.toLowerCase()) {
    return 30;
  }

  // Check subject overlap
  const studentSubjects = [...student.strongSubjects, ...student.weakSubjects].map(s => s.toLowerCase());
  const candidateSubjects = [...candidate.strongSubjects, ...candidate.weakSubjects].map(s => s.toLowerCase());

  const overlap = studentSubjects.filter(s => candidateSubjects.includes(s));

  // Related subjects (same field)
  if (overlap.length >= 3) return 25;
  if (overlap.length >= 2) return 20;
  if (overlap.length >= 1) return 15;

  // Check if same general area
  const sameStudy = student.currentStudy.toLowerCase() === candidate.currentStudy.toLowerCase();
  if (sameStudy) return 10;

  return 0; // No overlap - eliminate
}

function scoreScheduleCompatibility(student: StudentProfile, candidate: StudentProfile): number {
  // Max 25 points

  // Check day overlap
  const dayOverlap = student.availableDays.filter(d => candidate.availableDays.includes(d));

  if (dayOverlap.length === 0) return 0; // No overlap - eliminate

  // Parse time ranges for overlap estimation
  const timeScore = estimateTimeOverlap(student.availableTimes, candidate.availableTimes);

  if (dayOverlap.length >= 4 && timeScore >= 2) return 25;
  if (dayOverlap.length >= 3 && timeScore >= 1) return 22;
  if (dayOverlap.length >= 2 && timeScore >= 1) return 18;
  if (dayOverlap.length >= 1 && timeScore >= 1) return 12;
  if (dayOverlap.length >= 1) return 8;

  return 5;
}

function estimateTimeOverlap(time1: string, time2: string): number {
  // Simple heuristic: extract hour numbers and compare
  const hours1 = extractHours(time1);
  const hours2 = extractHours(time2);

  if (!hours1 || !hours2) return 1; // Assume some overlap if can't parse

  const overlapStart = Math.max(hours1.start, hours2.start);
  const overlapEnd = Math.min(hours1.end, hours2.end);
  const overlap = overlapEnd - overlapStart;

  return Math.max(0, overlap);
}

function extractHours(timeStr: string): { start: number; end: number } | null {
  // Try to parse common formats like "8PM-11PM", "20:00-23:00", etc.
  const match = timeStr.match(/(\d{1,2})\s*(AM|PM)?\s*[-–to]+\s*(\d{1,2})\s*(AM|PM)?/i);
  if (!match) return null;

  let start = parseInt(match[1]);
  let end = parseInt(match[3]);

  if (match[2]?.toUpperCase() === 'PM' && start < 12) start += 12;
  if (match[4]?.toUpperCase() === 'PM' && end < 12) end += 12;
  if (match[2]?.toUpperCase() === 'AM' && start === 12) start = 0;
  if (match[4]?.toUpperCase() === 'AM' && end === 12) end = 0;

  return { start, end };
}

function scoreLearningStyleMatch(student: StudentProfile, candidate: StudentProfile): number {
  // Max 20 points
  let score = 0;

  // Same learning type
  if (student.learningType === candidate.learningType) {
    score += 10;
  } else {
    // Complementary types get some points
    score += 5;
  }

  // Study method overlap
  const methodOverlap = student.studyMethod.filter(m => candidate.studyMethod.includes(m));
  if (methodOverlap.length >= 2) score += 6;
  else if (methodOverlap.length >= 1) score += 3;

  // Session length compatibility
  if (student.sessionLength === candidate.sessionLength) score += 4;
  else score += 2;

  return Math.min(20, score);
}

function scoreGoalAlignment(student: StudentProfile, candidate: StudentProfile): number {
  // Max 15 points

  const sameExam = student.targetExam.toLowerCase() === candidate.targetExam.toLowerCase();

  // Check if target dates are close (within 3 months)
  let sameTimeline = false;
  try {
    const date1 = new Date(student.targetDate);
    const date2 = new Date(candidate.targetDate);
    const diffMonths = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24 * 30);
    sameTimeline = diffMonths <= 3;
  } catch {
    sameTimeline = false;
  }

  if (sameExam && sameTimeline) return 15;
  if (sameExam) return 10;

  // Related goals check
  const sameStudy = student.currentStudy.toLowerCase() === candidate.currentStudy.toLowerCase();
  if (sameStudy) return 7;

  return 3;
}

function scorePersonalityMatch(student: StudentProfile, candidate: StudentProfile): number {
  // Max 10 points
  let score = 0;

  // Study style compatibility
  if (student.studyStyle === candidate.studyStyle) score += 3;
  else score += 1;

  // Teaching/learning complementarity
  if (
    (student.teachingAbility === 'can explain well' && candidate.teachingAbility === 'prefer learning') ||
    (student.teachingAbility === 'prefer learning' && candidate.teachingAbility === 'can explain well')
  ) {
    score += 4; // Perfect combo
  } else if (student.sessionType !== candidate.sessionType && student.sessionType !== 'both' && candidate.sessionType !== 'both') {
    score += 3; // Complementary
  } else {
    score += 2;
  }

  // Communication style
  if (student.communication === candidate.communication) score += 3;
  else score += 1;

  return Math.min(10, score);
}

// ============================================
// Complementary Bonus Scoring
// ============================================

function getComplementaryFactors(student: StudentProfile, candidate: StudentProfile): string[] {
  const factors: string[] = [];

  // Check if student's weak subjects are candidate's strong subjects
  const studentWeakCandidateStrong = student.weakSubjects.filter(s =>
    candidate.strongSubjects.map(cs => cs.toLowerCase()).includes(s.toLowerCase())
  );

  const candidateWeakStudentStrong = candidate.weakSubjects.filter(s =>
    student.strongSubjects.map(ss => ss.toLowerCase()).includes(s.toLowerCase())
  );

  if (studentWeakCandidateStrong.length > 0) {
    factors.push(`${candidate.name} can help with ${studentWeakCandidateStrong.join(', ')}`);
  }

  if (candidateWeakStudentStrong.length > 0) {
    factors.push(`${student.name} can help with ${candidateWeakStudentStrong.join(', ')}`);
  }

  // Teaching + Learning combo
  if (
    (student.teachingAbility === 'can explain well' && candidate.teachingAbility === 'prefer learning') ||
    (candidate.teachingAbility === 'can explain well' && student.teachingAbility === 'prefer learning')
  ) {
    factors.push('Perfect teacher-learner dynamic');
  }

  // Pace complementarity
  if (
    (student.pace === 'fast' && candidate.pace === 'slow') ||
    (student.pace === 'slow' && candidate.pace === 'fast')
  ) {
    factors.push('Different paces encourage patience and thorough explanations');
  }

  return factors;
}

// ============================================
// Main Matching Function
// ============================================

export function calculateMatchScore(student: StudentProfile, candidate: StudentProfile): MatchScore {
  const subject = scoreSubjectCompatibility(student, candidate);
  const schedule = scoreScheduleCompatibility(student, candidate);
  const style = scoreLearningStyleMatch(student, candidate);
  const goal = scoreGoalAlignment(student, candidate);
  const personality = scorePersonalityMatch(student, candidate);

  return {
    overall: subject + schedule + style + goal + personality,
    subject,
    schedule,
    style,
    goal,
    personality,
  };
}

export async function findTopMatches(
  student: StudentProfile,
  candidates: StudentProfile[],
  topN: number = 3,
  useAI: boolean = true
): Promise<MatchResult[]> {
  // Filter out the student themselves
  const others = candidates.filter(c => c.id !== student.id);

  // Calculate scores for all candidates
  const scored = others.map(candidate => {
    const score = calculateMatchScore(student, candidate);
    return { candidate, score };
  });

  // Filter out deal-breakers (0 in subject or schedule)
  const viable = scored.filter(s => s.score.subject > 0 && s.score.schedule > 0);

  // If no viable matches, fallback to all students (sorted by score)
  const pool = viable.length > 0 ? viable : scored;

  // Sort by overall score descending
  pool.sort((a, b) => b.score.overall - a.score.overall);

  // Take top N
  const topMatches = pool.slice(0, topN);

  // Generate match results with AI explanations
  const results: MatchResult[] = [];

  for (const match of topMatches) {
    const complementaryFactors = getComplementaryFactors(student, match.candidate);

    let explanation;
    if (useAI) {
      try {
        explanation = await generateMatchExplanation(student, match.candidate, match.score);
      } catch {
        explanation = null;
      }
    }

    results.push({
      student: match.candidate,
      score: match.score,
      whyItWorks: explanation?.whyItWorks ||
        `${match.candidate.name} and ${student.name} share a focus on ${student.targetExam} with complementary strengths.`,
      potentialChallenges: explanation?.potentialChallenges ||
        'Communication styles may need initial adjustment.',
      recommendedFirstTopic: explanation?.recommendedFirstTopic ||
        student.currentlyStudying || 'Introduction and goal setting',
      bestFormat: explanation?.bestFormat || 'Peer teaching',
      complementaryFactors,
    });
  }

  return results;
}
