// ============================================
// MitrrAI - Self Awareness Test
// Big Five (OCEAN) questions, scoring, types
// ============================================

// ── Trait Colors ──
export const TRAIT_COLORS: Record<string, string> = {
  openness: '#3b82f6',
  conscientiousness: '#f59e0b',
  extraversion: '#f97316',
  agreeableness: '#22c55e',
  neuroticism: '#a855f7',
};

export const TRAIT_LABELS: Record<string, string> = {
  openness: 'Openness',
  conscientiousness: 'Conscientiousness',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  neuroticism: 'Neuroticism',
};

// ── Question Type ──
export interface Question {
  id: number;
  text: string;
  trait: string;
}

// ── All 25 Questions ──
export const QUESTIONS: Question[] = [
  // OPENNESS (Q1-Q5)
  { id: 1,  text: 'I have a vivid imagination.', trait: 'openness' },
  { id: 2,  text: 'I have excellent ideas.', trait: 'openness' },
  { id: 3,  text: 'I am quick to understand things.', trait: 'openness' },
  { id: 4,  text: 'I use difficult words.', trait: 'openness' },
  { id: 5,  text: 'I spend time reflecting on things.', trait: 'openness' },

  // CONSCIENTIOUSNESS (Q6-Q10)
  { id: 6,  text: 'I am always prepared.', trait: 'conscientiousness' },
  { id: 7,  text: 'I pay attention to details.', trait: 'conscientiousness' },
  { id: 8,  text: 'I follow a schedule.', trait: 'conscientiousness' },
  { id: 9,  text: 'I get chores done right away.', trait: 'conscientiousness' },
  { id: 10, text: 'I get things done quickly.', trait: 'conscientiousness' },

  // EXTRAVERSION (Q11-Q15)
  { id: 11, text: 'I am the life of the party.', trait: 'extraversion' },
  { id: 12, text: 'I feel comfortable around people.', trait: 'extraversion' },
  { id: 13, text: 'I start conversations.', trait: 'extraversion' },
  { id: 14, text: 'I talk to a lot of different people at parties.', trait: 'extraversion' },
  { id: 15, text: "I don't mind being the center of attention.", trait: 'extraversion' },

  // AGREEABLENESS (Q16-Q20)
  { id: 16, text: 'I have a soft heart.', trait: 'agreeableness' },
  { id: 17, text: 'I take time out for others.', trait: 'agreeableness' },
  { id: 18, text: "I sympathize with others' feelings.", trait: 'agreeableness' },
  { id: 19, text: "I feel others' emotions.", trait: 'agreeableness' },
  { id: 20, text: 'I make people feel at ease.', trait: 'agreeableness' },

  // NEUROTICISM (Q21-Q25)
  { id: 21, text: 'I get stressed out easily.', trait: 'neuroticism' },
  { id: 22, text: 'I worry about things.', trait: 'neuroticism' },
  { id: 23, text: 'I get upset easily.', trait: 'neuroticism' },
  { id: 24, text: 'I have frequent mood swings.', trait: 'neuroticism' },
  { id: 25, text: 'I am easily disturbed.', trait: 'neuroticism' },
];

// ── Answer Options ──
export const ANSWER_OPTIONS = [
  { value: 1, label: 'Very Inaccurate' },
  { value: 2, label: 'Moderately Inaccurate' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Moderately Accurate' },
  { value: 5, label: 'Very Accurate' },
];

// ── Scoring Types ──
export interface OceanScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export type Answers = Record<number, number | null>;

// ── Calculate OCEAN scores from answers ──
export function calculateOCEANScores(answers: Answers): OceanScores {
  const traitQuestions: Record<string, number[]> = {
    openness: [1, 2, 3, 4, 5],
    conscientiousness: [6, 7, 8, 9, 10],
    extraversion: [11, 12, 13, 14, 15],
    agreeableness: [16, 17, 18, 19, 20],
    neuroticism: [21, 22, 23, 24, 25],
  };

  const scores: Record<string, number> = {};

  for (const [trait, qIds] of Object.entries(traitQuestions)) {
    const rawSum = qIds.reduce((sum, qId) => sum + (answers[qId] || 3), 0);
    // Range: 5-25 → Percentage: 0-100
    const percentage = Math.round(((rawSum - 5) / 20) * 100);
    scores[trait] = Math.max(0, Math.min(100, percentage));
  }

  return scores as unknown as OceanScores;
}

// ── Get score label ──
export function getScoreLabel(score: number): 'Low' | 'Moderate' | 'High' {
  if (score <= 33) return 'Low';
  if (score <= 66) return 'Moderate';
  return 'High';
}

// ── Build system instruction for Grok ──
export function buildSystemInstruction(): string {
  return `You are a world-class personality analyst and compassionate life coach writing deeply personalized Big Five personality reports for Indian college students.

Your writing is:
* Warm, honest, poetic but practical
* Never clinical or cold
* Uses "you" directly to address the person
* Finds cross-trait combinations (not just individual trait descriptions)
* Culturally aware of Indian college student pressures (placements, family expectations, friendships, academics)

CRITICAL: Always analyze traits in combination. The most important insights come from how traits interact with each other, not in isolation.`;
}

// ── Build user prompt for report generation ──
export function buildReportPrompt(
  name: string,
  date: string,
  scores: OceanScores,
  previousScores?: OceanScores | null,
  previousDate?: string | null
): string {
  let prompt = `Generate a complete personality report for:

Name: ${name}
Date: ${date}

Big Five Scores:
* Openness: ${scores.openness}/100 (${getScoreLabel(scores.openness)})
* Conscientiousness: ${scores.conscientiousness}/100 (${getScoreLabel(scores.conscientiousness)})
* Extraversion: ${scores.extraversion}/100 (${getScoreLabel(scores.extraversion)})
* Agreeableness: ${scores.agreeableness}/100 (${getScoreLabel(scores.agreeableness)})
* Neuroticism: ${scores.neuroticism}/100 (${getScoreLabel(scores.neuroticism)})

Return a single valid JSON object with this exact structure:

{
  "tagline": "One powerful poetic sentence that captures this exact person based on their score combination",

  "archetype": {
    "name": "The [Unique Two-Word Name]",
    "description": "3-4 sentences in second person describing exactly who this person is based on ALL FIVE traits combined. Be specific, not generic.",
    "superpower_title": "Two-word title",
    "superpower_desc": "One sentence",
    "kryptonite_title": "Two-word title",
    "kryptonite_desc": "One sentence"
  },

  "traits": {
    "openness": {
      "score": ${scores.openness},
      "subtitle": "The [Poetic Subtitle]",
      "what_it_means": "2-3 sentences. Mention at least one other trait by name in the analysis.",
      "pitfall": "2 sentences. Must reference interaction with another trait.",
      "power_move": "2 sentences. Specific actionable advice."
    },
    "conscientiousness": { "score": ${scores.conscientiousness}, "subtitle": "...", "what_it_means": "...", "pitfall": "...", "power_move": "..." },
    "extraversion": { "score": ${scores.extraversion}, "subtitle": "...", "what_it_means": "...", "pitfall": "...", "power_move": "..." },
    "agreeableness": { "score": ${scores.agreeableness}, "subtitle": "...", "what_it_means": "...", "pitfall": "...", "power_move": "..." },
    "neuroticism": { "score": ${scores.neuroticism}, "subtitle": "...", "what_it_means": "...", "pitfall": "...", "power_move": "..." }
  },

  "internal_dynamics": {
    "strengths": [
      { "title": "Strength Name", "description": "One sentence. Must name which traits combine to create this strength." },
      { "title": "Strength Name", "description": "..." },
      { "title": "Strength Name", "description": "..." },
      { "title": "Strength Name", "description": "..." }
    ],
    "sabotages": [
      { "title": "Sabotage Name", "description": "One sentence. Must name which traits combine to create this pattern." },
      { "title": "Sabotage Name", "description": "..." },
      { "title": "Sabotage Name", "description": "..." },
      { "title": "Sabotage Name", "description": "..." }
    ]
  },

  "pillars": {
    "career": [ { "tip_title": "Bold Tip Name", "tip_desc": "2 sentences personalized to their specific score combination" }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." } ],
    "health": [ { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." } ],
    "wealth": [ { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." } ],
    "mindset": [ { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." } ],
    "intellect": [ { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." } ],
    "relationships": [ { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." }, { "tip_title": "...", "tip_desc": "..." } ]
  },

  "recommendations": {
    "books": [
      { "title": "Book Title", "author": "Author Name", "reason": "One sentence — why THIS book for THIS person's scores" },
      { "title": "...", "author": "...", "reason": "..." },
      { "title": "...", "author": "...", "reason": "..." }
    ],
    "videos": [
      { "title": "Video/Talk Title", "duration": "MM:SS", "reason": "One sentence" },
      { "title": "...", "duration": "...", "reason": "..." },
      { "title": "...", "duration": "...", "reason": "..." }
    ]
  },

  "arya_context": {
    "personality_summary": "3-4 sentences Arya will use as her understanding of this user. Include: their archetype, their biggest emotional pattern, what triggers their anxiety, what makes them feel good.",
    "how_to_talk_to_them": [
      "Specific instruction 1 for Arya",
      "Specific instruction 2 for Arya",
      "Specific instruction 3 for Arya",
      "Specific instruction 4 for Arya",
      "Specific instruction 5 for Arya"
    ],
    "topics_to_check_on": [
      "Topic 1 (e.g., exercise habit)",
      "Topic 2 (e.g., sleep quality)",
      "Topic 3 (e.g., social commitments)"
    ],
    "celebration_style": "How to celebrate wins with this person specifically",
    "comfort_style": "How to comfort this person when they are low"
  }
}`;

  // Add growth analysis for retakes
  if (previousScores && previousDate) {
    prompt += `

Previous scores (from ${previousDate}):
* Openness: ${previousScores.openness} → Now: ${scores.openness}
* Conscientiousness: ${previousScores.conscientiousness} → Now: ${scores.conscientiousness}
* Extraversion: ${previousScores.extraversion} → Now: ${scores.extraversion}
* Agreeableness: ${previousScores.agreeableness} → Now: ${scores.agreeableness}
* Neuroticism: ${previousScores.neuroticism} → Now: ${scores.neuroticism}

Also include a "growth_analysis" field in the root of the JSON:
{
  "growth_analysis": {
    "overall_narrative": "2-3 sentences comparing who they were vs who they are now. Warm and encouraging tone.",
    "biggest_improvement": "Which trait improved most and what it means",
    "area_to_focus": "Which trait needs most attention next 15 days",
    "arya_growth_message": "The exact message Arya will say when presenting results. Emotional, proud, caring tone. In Hinglish."
  }
}`;
  }

  prompt += `

Return ONLY the JSON. No markdown, no explanation, no backticks. Pure JSON only.`;

  return prompt;
}

// ── Loading messages for completion screen ──
export const LOADING_MESSAGES = [
  'Arya is reading your answers...',
  'Analyzing your personality patterns...',
  'Finding your psychological archetype...',
  'Building your 6 pillars blueprint...',
  'Almost there, making it personal...',
];

// ── localStorage keys ──
export const LS_TEST_PROGRESS = 'mitrrai_personality_test_progress';
export const LS_TEST_ANSWERS = 'mitrrai_personality_test_answers';
export const LS_HAS_TAKEN_TEST = 'mitrrai_has_taken_personality_test';
export const LS_LATEST_REPORT_ID = 'mitrrai_latest_personality_report_id';
export const LS_LAST_TEST_DATE = 'mitrrai_last_personality_test_date';
