// ============================================================
//  COMMAND PATTERN
//
//  Every navigation action is a self-contained Command object.
//  The engine creates commands. The SDK executes them.
//  Commands are serialisable JSON — safe to send over HTTP/WS.
//
//  Why Command Pattern:
//  - Decouples "deciding what to do" from "doing it"
//  - Commands can be logged, queued, replayed, or undone
//  - Adding a new action type = adding a new command type,
//    nothing else changes
// ============================================================

// ── Command types ─────────────────────────────────────────────

// Navigate to a specific route in the parent app
export type NavigateCommand = {
  type:       "NAVIGATE";
  route:      string;         // e.g. "/weather", "/market/wheat"
  params?:    Record<string, string>; // e.g. { crop: "wheat", state: "Punjab" }
};

// Trigger an action in the parent app (not a page navigation)
export type ActionCommand = {
  type:       "ACTION";
  action:     string;         // e.g. "open_modal", "submit_form", "refresh_data"
  payload?:   Record<string, unknown>;
};

// Ask the user to clarify — confidence was too low
export type ClarifyCommand = {
  type:       "CLARIFY";
  message:    string;         // e.g. "Did you mean wheat prices or weather?"
  suggestions: string[];      // e.g. ["wheat prices", "weather forecast"]
};

// Unsupported — no intent matched, graceful fallback
export type FallbackCommand = {
  type:       "FALLBACK";
  message:    string;
};

export type Command =
  | NavigateCommand
  | ActionCommand
  | ClarifyCommand
  | FallbackCommand;

// ── NavigationCommand — the full envelope emitted by the engine

export type NavigationCommand = {
  command:        Command;
  intent:         string;           // raw intent string from LLM
  confidence:     number;           // 0.0 – 1.0
  transcript:     string;           // original user speech as text
  language:       string;           // detected language code e.g. "hi"
  platformId:     string;           // which platform this is for e.g. "crop_doctor"
  sessionId:      string;           // for context memory tracking
  timestamp:      string;           // ISO timestamp
  processingMs:   number;           // total pipeline latency
};

// ── Command executor (runs on the SDK side, shown here for reference)
//
//  In practice the SDK in the parent app implements this interface.
//  The server never calls execute() — it only creates and emits commands.

export interface ICommandExecutor {
  execute(command: NavigationCommand): void;
}
