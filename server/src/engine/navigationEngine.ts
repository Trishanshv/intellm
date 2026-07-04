// ============================================================
//  NAVIGATION ENGINE
//
//  The core of the platform. Takes a validated intent from
//  the LLM, looks it up in the Intent Registry, applies the
//  Confidence Filter, assembles a NavigationCommand, and
//  emits it on the Event Bus.
//
//  This is the only place all patterns connect:
//    FSM → Registry → ConfidenceFilter → CommandPattern → EventBus
// ============================================================

import type { AgriIntent }        from "../phase1/intentSchemas.js";
import type { NavigationCommand }  from "../patterns/commandPattern.js";
import { eventBus, EVENTS }        from "../patterns/eventBus.js";
import { intentRegistry }          from "./intentRegistry.js";
import { applyConfidenceFilter }   from "./confidenceFilter.js";
import { getOrCreateFSM }          from "./fsm.js";

// ── Input to the Navigation Engine ───────────────────────────

export type EngineInput = {
  intent:      AgriIntent;
  transcript:  string;
  language:    string;
  platformId:  string;
  sessionId:   string;
  startTimeMs: number;     // pipeline start time for latency calculation
};

// ── Main engine function ──────────────────────────────────────

export function processIntent(input: EngineInput): NavigationCommand {
  const { intent, transcript, language, platformId, sessionId, startTimeMs } = input;
  const fsm = getOrCreateFSM(sessionId);

  // Transition FSM: PROCESSING → NAVIGATING or CLARIFYING
  const registration = intentRegistry.resolve(platformId, intent.intent);
  const filterResult = applyConfidenceFilter(intent, transcript, registration);

  // ── Low confidence → ask for clarification ────────────────
  if (!filterResult.passed) {
    fsm.transition("CLARIFYING");

    const command: NavigationCommand = {
      command:      filterResult.clarify,
      intent:       intent.intent,
      confidence:   filterResult.confidence,
      transcript,
      language,
      platformId,
      sessionId,
      timestamp:    new Date().toISOString(),
      processingMs: Date.now() - startTimeMs,
    };

    eventBus.emit(EVENTS.CLARIFICATION_NEEDED, command);
    return command;
  }

  // ── High confidence → emit navigation command ─────────────

  // If no registration found, emit fallback
  if (!registration) {
    fsm.transition("NAVIGATING");
    const command: NavigationCommand = {
      command:      { type: "FALLBACK", message: "This intent is not registered for this platform." },
      intent:       intent.intent,
      confidence:   filterResult.confidence,
      transcript,
      language,
      platformId,
      sessionId,
      timestamp:    new Date().toISOString(),
      processingMs: Date.now() - startTimeMs,
    };
    eventBus.emit(EVENTS.NAVIGATION_COMMAND, command);
    fsm.transition("IDLE");
    return command;
  }

  // Merge dynamic entities into command params if it's a NAVIGATE command
  // e.g. market_price intent with crop:"wheat" → route /market?crop=wheat
  let finalCommand = { ...registration.command };
  if (
    finalCommand.type === "NAVIGATE" &&
    intent.intent !== "unsupported"
  ) {
    const entities = (intent as { entities?: Record<string, string> }).entities ?? {};
    if (Object.keys(entities).length > 0) {
      finalCommand = {
        ...finalCommand,
        params: { ...(finalCommand.params ?? {}), ...entities },
      };
    }
  }

  fsm.transition("NAVIGATING");

  const command: NavigationCommand = {
    command:      finalCommand,
    intent:       intent.intent,
    confidence:   filterResult.confidence,
    transcript,
    language,
    platformId,
    sessionId,
    timestamp:    new Date().toISOString(),
    processingMs: Date.now() - startTimeMs,
  };

  eventBus.emit(EVENTS.NAVIGATION_COMMAND, command);
  fsm.transition("IDLE");

  return command;
}
