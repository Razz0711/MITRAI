// ============================================
// MitrAI - Google Gemini AI Integration
// ============================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { StudentProfile } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function getModel() {
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

// ============================================
// Onboarding AI - Friendly Chat Agent
// ============================================

export async function getOnboardingResponse(
  currentStep: number,
  userMessage: string,
  collectedData: Partial<StudentProfile>,
  conversationHistory: { role: string; content: string }[]
): Promise<string> {
  const model = getModel();

  const systemPrompt = `You are a friendly onboarding assistant for MitrAI - A study buddy matching platform built for SVNIT Surat (Sardar Vallabhbhai National Institute of Technology) students.

Your job is to collect student information through a natural friendly conversation.

RULES:
- Ask ONE question at a time
- Be encouraging and friendly
- Use simple language
- Don't overwhelm with too many questions
- Make student feel comfortable
- Use their name once you know it
- Add encouraging comments between questions
- Make it feel like a friendly chat not a form
- Keep responses SHORT (2-3 sentences max)

DATA COLLECTED SO FAR:
${JSON.stringify(collectedData, null, 2)}

CURRENT STEP: ${currentStep}

CONVERSATION FLOW:
Step 0: Warm welcome to MitrAI for SVNIT, ask their name
Step 1: Ask age
Step 2: Ask which department/branch they're in (CSE, AI, Mechanical, Civil, Electrical, Electronics, Chemical, Integrated M.Sc. Mathematics, Integrated M.Sc. Physics, Integrated M.Sc. Chemistry, B.Tech Physics, Mathematics & Computing, etc.)
Step 3: Ask their current year (1st/2nd/3rd/4th/5th year)
Step 4: Ask what they're currently studying or preparing for (semester exams, GATE, placements, projects, etc.)
Step 5: Ask which subjects they're strong in. Suggest subjects relevant to their department and year:
  - Integrated M.Sc. Mathematics: Year 1-2: Elements of Analysis, Analytical Geometry, Discrete Mathematics, Numerical Analysis, Linear Algebra, Number Theory, Data Structures. Year 3: Probability & Statistics, Mechanics, ODEs, Complex Analysis, Metric Spaces, AI. Year 4: Topology, Abstract Algebra, Fluid Dynamics, Optimization, Functional Analysis, PDEs, Data Science, NLP. Year 5: Measure Theory, Mathematical Modelling, Advanced Operations Research.
  - Mathematics & Computing: Real Analysis, Abstract Algebra, Numerical Methods, Complex Analysis, Optimization, PDEs, Operating Systems, Computer Networks.
  - CSE: Data Structures, Algorithms, DBMS, OS, CN, Compiler Design, ML.
  - AI: Linear Algebra, Probability, ML, Deep Learning, NLP, Computer Vision.
  - Other departments: suggest subjects relevant to their branch.
Step 6: Ask which subjects they find difficult or need help with
Step 7: Ask how they prefer to study (Reading notes/Watching videos/Solving problems/Group discussion)
Step 8: Ask how long their study sessions usually are
Step 9: Ask which days and times they're usually free to study
Step 10: Ask their main goal right now (score well in midsems, GATE prep, project completion, etc.)
Step 11: Ask about study style (strict schedule or flexible) and if they need an accountability partner
Step 12: Wrap up message - say you have everything needed and will find them the best study buddy from SVNIT

IMPORTANT: Based on the current step, ask the NEXT relevant question. Acknowledge what the user just said warmly, then ask the next question naturally.
The institution is always SVNIT Surat - no need to ask for it.
If the user provides info for multiple fields at once, acknowledge all of it and skip to the appropriate next step.

TONE: Like a helpful SVNIT senior - warm, encouraging, relatable. Reference SVNIT life when appropriate (hostel, labs, library, cafeteria, etc.)`;

  const chatHistory = conversationHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user' as const,
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: chatHistory.length > 0 ? chatHistory : undefined,
    systemInstruction: systemPrompt,
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

// ============================================
// Matching AI - Generate Match Explanations
// ============================================

export async function generateMatchExplanation(
  student: StudentProfile,
  match: StudentProfile,
  score: { subject: number; schedule: number; style: number; goal: number; personality: number }
): Promise<{ whyItWorks: string; potentialChallenges: string; recommendedFirstTopic: string; bestFormat: string }> {
  const model = getModel();

  const prompt = `You are a Study Buddy Matching Agent. Analyze this match and provide insights.

STUDENT LOOKING FOR MATCH:
Name: ${student.name}
Studying: ${student.currentStudy}
Target Exam: ${student.targetExam}
Strong Subjects: ${student.strongSubjects.join(', ')}
Weak Subjects: ${student.weakSubjects.join(', ')}
Study Style: ${student.studyStyle}
Learning Type: ${student.learningType}
Goal: ${student.shortTermGoal}

MATCHED WITH:
Name: ${match.name}
Studying: ${match.currentStudy}
Target Exam: ${match.targetExam}
Strong Subjects: ${match.strongSubjects.join(', ')}
Weak Subjects: ${match.weakSubjects.join(', ')}
Study Style: ${match.studyStyle}
Learning Type: ${match.learningType}
Goal: ${match.shortTermGoal}

COMPATIBILITY SCORES:
Subject: ${score.subject}/30
Schedule: ${score.schedule}/25
Style: ${score.style}/20
Goal: ${score.goal}/15
Personality: ${score.personality}/10
Total: ${score.subject + score.schedule + score.style + score.goal + score.personality}/100

Respond in EXACTLY this JSON format (no markdown, no code blocks):
{
  "whyItWorks": "2-3 sentences explaining why this is a good match",
  "potentialChallenges": "1-2 sentences about possible issues",
  "recommendedFirstTopic": "specific topic they should study first together",
  "bestFormat": "1-on-1 / group / peer teaching - with brief reason"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    return {
      whyItWorks: `${student.name} and ${match.name} share compatible study goals and complementary strengths. Their overlapping schedules make regular sessions possible.`,
      potentialChallenges: 'Different learning paces may require patience from both sides.',
      recommendedFirstTopic: student.weakSubjects[0] || student.currentlyStudying || 'Introduction session',
      bestFormat: student.sessionType === 'both' ? 'Peer teaching' : '1-on-1',
    };
  }
}

// ============================================
// Study Plan AI - Generate Weekly Plans
// ============================================

export async function generateStudyPlan(
  student: StudentProfile,
  buddy: StudentProfile,
  weekDates: string
): Promise<string> {
  const model = getModel();

  const prompt = `You are a personal AI Study Planner. Create a detailed weekly study plan.

STUDENT PROFILE:
Name: ${student.name}
Studying: ${student.currentStudy}
Target Exam: ${student.targetExam} (Date: ${student.targetDate})
Strong Subjects: ${student.strongSubjects.join(', ')}
Weak Subjects: ${student.weakSubjects.join(', ')}
Currently Studying: ${student.currentlyStudying}
Study Method: ${student.studyMethod.join(', ')}
Session Length: ${student.sessionLength}
Available Days: ${student.availableDays.join(', ')}
Available Times: ${student.availableTimes}
Study Hours Target: ${student.studyHoursTarget} hours daily
Short Term Goal: ${student.shortTermGoal}
Weekly Goals: ${student.weeklyGoals}

BUDDY PROFILE:
Name: ${buddy.name}
Strong Subjects: ${buddy.strongSubjects.join(', ')}
Weak Subjects: ${buddy.weakSubjects.join(', ')}
Available Days: ${buddy.availableDays.join(', ')}
Available Times: ${buddy.availableTimes}
Teaching Ability: ${buddy.teachingAbility}

WEEK: ${weekDates}

Create a structured weekly study plan that includes:
1. Solo study sessions (what to study alone)
2. Buddy study sessions (topics to cover together, who explains what)
3. Daily targets with specific measurable goals
4. Weekly summary with hours target
5. Success metrics

Format it nicely with emojis and clear structure. Make it encouraging and actionable.
Consider who is strong in what subject - the strong student should help explain their strong subjects to the weaker student.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ============================================
// In-Session AI Assistant
// ============================================

export async function getSessionAssistantResponse(
  student1: StudentProfile,
  student2: StudentProfile,
  currentTopic: string,
  sessionGoal: string,
  userQuestion: string,
  chatHistory: { role: string; content: string }[]
): Promise<string> {
  const model = getModel();

  const systemPrompt = `You are an AI Study Assistant present inside a live study session between two students.

STUDENT 1: ${student1.name} (Strong in: ${student1.strongSubjects.join(', ')}, Learning type: ${student1.learningType})
STUDENT 2: ${student2.name} (Strong in: ${student2.strongSubjects.join(', ')}, Learning type: ${student2.learningType})
CURRENT TOPIC: ${currentTopic}
SESSION GOAL: ${sessionGoal}

YOUR ROLE:
- Help when students are stuck
- Explain concepts clearly with simple language
- Give real world examples and analogies
- Break complex topics into steps
- Generate practice questions when asked
- Keep energy positive and encouraging
- Be like a helpful senior student

RULES:
- Keep responses concise (3-5 sentences unless explaining a concept)
- Use emojis sparingly
- If asked for practice questions, start easy and increase difficulty
- Give hints before full answers
- Celebrate when students get things right`;

  const history = chatHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user' as const,
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: history.length > 0 ? history : undefined,
    systemInstruction: systemPrompt,
  });

  const result = await chat.sendMessage(userQuestion);
  return result.response.text();
}

// ============================================
// Agent-to-Agent Conversation (Compatibility Check)
// ============================================

export async function runAgentConversation(
  studentA: StudentProfile,
  studentB: StudentProfile
): Promise<{ compatibility: string; confidence: number; strengths: string[]; issues: string[]; recommendation: string; suggestedFirstSession: string }> {
  const model = getModel();

  const prompt = `You are analyzing compatibility between two students for a study buddy match.

STUDENT A:
Name: ${studentA.name}
Studying: ${studentA.currentStudy}, Target: ${studentA.targetExam}
Strong: ${studentA.strongSubjects.join(', ')}
Weak: ${studentA.weakSubjects.join(', ')}
Style: ${studentA.studyStyle}, Pace: ${studentA.pace}
Available: ${studentA.availableDays.join(', ')} ${studentA.availableTimes}
Goal: ${studentA.shortTermGoal}
Teaching: ${studentA.teachingAbility}
Communication: ${studentA.communication}

STUDENT B:
Name: ${studentB.name}
Studying: ${studentB.currentStudy}, Target: ${studentB.targetExam}
Strong: ${studentB.strongSubjects.join(', ')}
Weak: ${studentB.weakSubjects.join(', ')}
Style: ${studentB.studyStyle}, Pace: ${studentB.pace}
Available: ${studentB.availableDays.join(', ')} ${studentB.availableTimes}
Goal: ${studentB.shortTermGoal}
Teaching: ${studentB.teachingAbility}
Communication: ${studentB.communication}

Analyze compatibility considering:
1. Subject complementarity (one strong where other is weak = GOOD)
2. Schedule overlap
3. Study style compatibility
4. Goal alignment
5. Teaching/learning balance

Respond in EXACTLY this JSON format (no markdown, no code blocks):
{
  "compatibility": "High" or "Medium" or "Low",
  "confidence": number between 0-100,
  "strengths": ["strength1", "strength2", "strength3"],
  "issues": ["issue1", "issue2"],
  "recommendation": "Yes" or "No" or "Maybe",
  "suggestedFirstSession": "specific topic and format suggestion"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    return {
      compatibility: 'Medium',
      confidence: 60,
      strengths: ['Shared exam target', 'Schedule overlap possible'],
      issues: ['Compatibility analysis could not be fully completed'],
      recommendation: 'Maybe',
      suggestedFirstSession: 'Introduction and goal-setting session',
    };
  }
}

// ============================================
// Feedback & Progress Analysis
// ============================================

export async function analyzeProgress(
  student: StudentProfile,
  sessionsCompleted: number,
  topicsCovered: string[],
  studyHours: number,
  buddyFeedback: string
): Promise<string> {
  const model = getModel();

  const prompt = `You are a Study Progress Analyzer. Provide actionable feedback.

STUDENT: ${student.name}
Target: ${student.targetExam} (Date: ${student.targetDate})
Sessions Completed: ${sessionsCompleted}
Topics Covered: ${topicsCovered.join(', ')}
Study Hours Logged: ${studyHours}
Study Hours Target: ${student.studyHoursTarget}/day
Buddy Feedback: ${buddyFeedback}
Short Term Goal: ${student.shortTermGoal}
Long Term Goal: ${student.longTermGoal}

Provide a progress report covering:
1. PROGRESS SUMMARY - What improved, what needs work, consistency assessment
2. RECOMMENDATIONS - Study strategy adjustments, topics to focus on
3. MOTIVATION MESSAGE - Personalized encouragement, celebrate wins

Keep it encouraging, specific, and actionable. Like a caring mentor.
Use emojis sparingly. Keep it under 300 words.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
