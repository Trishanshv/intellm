// ============================================================
//  CONFIDENCE FILTER — Pattern: Strategy
//
//  Sits between LLM output and command emission.
//  Decides: is this intent confident enough to act on,
//  or should we ask the user to clarify?
//
//  Uses a Strategy Pattern — the scoring strategy is
//  swappable. Today: keyword heuristic. Later: cosine
//  similarity against example phrases (semantic search).
// ============================================================

import type { AgriIntent } from "../phase1/intentSchemas.js";
import type { IntentRegistration } from "./intentRegistry.js";
import type { ClarifyCommand } from "../patterns/commandPattern.js";

const GLOBAL_CONFIDENCE_FLOOR = 0.70; // below this, always clarify

// ── Confidence scorer ─────────────────────────────────────────
//
//  The LLM (Ollama with JSON schema) doesn't natively return a
//  confidence score, so we calculate a proxy score based on:
//    1. Whether required entities are present (+weight)
//    2. Whether intent is "unsupported" (score = 0)
//    3. Whether transcript length is reasonable (+weight)
//
//  In a future version this is replaced with log-probabilities
//  from the LLM or cosine similarity against example phrases.

export function scoreConfidence(
  intent:     AgriIntent,
  transcript: string,
  registration: IntentRegistration | null
): number {
  // Unsupported is always 0 confidence — it's a fallback, not a real match
  if (intent.intent === "unsupported") return 0.0;

  let score = 0.80; // base score for any recognised intent

  // Boost if required entities are present
  if (registration && registration.requiredEntities.length > 0) {
    const entities = (intent as { entities?: Record<string, unknown> }).entities ?? {};
    const presentCount = registration.requiredEntities.filter(
      (e) => entities[e] !== undefined && entities[e] !== ""
    ).length;
    const ratio = presentCount / registration.requiredEntities.length;
    score += ratio * 0.15; // up to +0.15 for all required entities present
  } else {
    score += 0.10; // no required entities = slightly easier match
  }

  // Small penalty for very short transcripts (likely noise)
  if (transcript.trim().length < 5) score -= 0.20;

  return Math.min(Math.max(score, 0), 1.0); // clamp to [0, 1]
}

// ── Filter result types ───────────────────────────────────────

export type FilterPass = {
  passed:     true;
  confidence: number;
};

export type FilterFail = {
  passed:     false;
  confidence: number;
  clarify:    ClarifyCommand;
};

export type FilterResult = FilterPass | FilterFail;

// ── Main filter function ──────────────────────────────────────

export function applyConfidenceFilter(
  intent:       AgriIntent,
  transcript:   string,
  registration: IntentRegistration | null
): FilterResult {
  const confidence = scoreConfidence(intent, transcript, registration);
  const threshold  = registration?.confidenceMin ?? GLOBAL_CONFIDENCE_FLOOR;

  if (confidence >= threshold) {
    return { passed: true, confidence };
  }

  // Build a helpful clarification message
  const suggestions = registration
    ? registration.examplePhrases.slice(0, 2)
    : ["try rephrasing your question"];

  return {
    passed:     false,
    confidence,
    clarify: {
      type:        "CLARIFY",
      message:     `I wasn't sure what you meant by "${transcript}". Did you mean one of these?`,
      suggestions,
    },
  };
}
