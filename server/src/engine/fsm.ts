// ============================================================
//  FINITE STATE MACHINE — Pattern: FSM
//
//  Tracks the state of a single conversation session.
//  Prevents invalid transitions (e.g. can't go from IDLE
//  directly to NAVIGATING without going through PROCESSING).
//
//  States:
//    IDLE        → waiting for user input
//    LISTENING   → audio is being recorded/received
//    PROCESSING  → STT + LLM pipeline is running
//    CLARIFYING  → waiting for user to resolve ambiguity
//    NAVIGATING  → command emitted, parent app is acting
//    ERROR       → pipeline failed, needs recovery
//
//  Valid transitions:
//    IDLE        → LISTENING
//    LISTENING   → PROCESSING
//    PROCESSING  → NAVIGATING | CLARIFYING | ERROR
//    CLARIFYING  → PROCESSING | IDLE
//    NAVIGATING  → IDLE
//    ERROR       → IDLE
// ============================================================

import { eventBus, EVENTS } from "../patterns/eventBus.js";

export type FSMState =
  | "IDLE"
  | "LISTENING"
  | "PROCESSING"
  | "CLARIFYING"
  | "NAVIGATING"
  | "ERROR";

type Transition = { from: FSMState; to: FSMState };

// All valid transitions — any transition not in this list is rejected
const VALID_TRANSITIONS: Transition[] = [
  { from: "IDLE",       to: "LISTENING"  },
  { from: "LISTENING",  to: "PROCESSING" },
  { from: "PROCESSING", to: "NAVIGATING" },
  { from: "PROCESSING", to: "CLARIFYING" },
  { from: "PROCESSING", to: "ERROR"      },
  { from: "CLARIFYING", to: "PROCESSING" },
  { from: "CLARIFYING", to: "IDLE"       },
  { from: "NAVIGATING", to: "IDLE"       },
  { from: "ERROR",      to: "IDLE"       },
];

export class ConversationFSM {
  private state: FSMState = "IDLE";
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  getState(): FSMState {
    return this.state;
  }

  // Attempt a transition — throws if invalid
  transition(to: FSMState): void {
    const valid = VALID_TRANSITIONS.some(
      (t) => t.from === this.state && t.to === to
    );

    if (!valid) {
      throw new Error(
        `[FSM:${this.sessionId}] Invalid transition: ${this.state} → ${to}`
      );
    }

    const previous = this.state;
    this.state = to;

    // Emit state change for logging/debugging
    eventBus.emit(EVENTS.FSM_STATE_CHANGED, {
      sessionId: this.sessionId,
      from:      previous,
      to,
      timestamp: new Date().toISOString(),
    });
  }

  // Safe reset — always allowed regardless of current state
  reset(): void {
    this.state = "IDLE";
  }
}

// ── Session FSM registry ──────────────────────────────────────
//  One FSM per session, stored in memory.
//  In production this would be Redis for multi-instance support.

const sessionFSMs = new Map<string, ConversationFSM>();

export function getOrCreateFSM(sessionId: string): ConversationFSM {
  if (!sessionFSMs.has(sessionId)) {
    sessionFSMs.set(sessionId, new ConversationFSM(sessionId));
  }
  return sessionFSMs.get(sessionId)!;
}

export function resetFSM(sessionId: string): void {
  sessionFSMs.get(sessionId)?.reset();
}
