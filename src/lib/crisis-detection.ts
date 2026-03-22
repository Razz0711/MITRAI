// ============================================
// MitrRAI - Crisis Detection
// Detects mental health crisis signals in user messages.
// Used to supplement (NOT replace) Arya's response with
// a safety resource note — Arya's character is unchanged.
// ============================================

// Keywords that indicate a potential mental health crisis.
// Deliberately broad to catch subtle signals.
const CRISIS_PATTERNS: RegExp[] = [
  // Explicit suicide mentions (Hindi, Hinglish, English)
  /suicide/i,
  /suicid/i,
  /mar (jaunga|jaungi|jaata|jaati)/i,
  /marna chahta/i,
  /jeena nahi/i,
  /jina nahi/i,
  /khatam kar lunga/i,
  /khatam kar lena/i,
  /khud ko maarna/i,
  /khud ko hurt/i,
  /self.?harm/i,
  /cut myself/i,
  /khud ko kaatna/i,
  /zindagi khatam/i,
  /zindagi nahi chahiye/i,
  /life khatam/i,
  /end (my|this) life/i,
  /take my (own )?life/i,
  /want to die/i,
  /wanna die/i,
  /kill myself/i,
  /kill (khud ko|myself)/i,
  /overdose/i,
  /hanging/i,
  /jump (se|from|off)/i,
];

/**
 * Returns true if the message contains any crisis signal.
 * Keeps it simple — false positives are fine (safety note is low-friction).
 */
export function detectCrisis(message: string): boolean {
  return CRISIS_PATTERNS.some(pattern => pattern.test(message));
}
