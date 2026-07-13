// ============================================================
//  IntLLM SDK — Public Types
//  These are the ONLY types a parent app developer needs.
//  Internal engine types are never exposed here.
// ============================================================

// ── Command types received from the engine ────────────────────

export type NavigatePayload = {
  type:    "NAVIGATE";
  route:   string;                        // e.g. "/weather", "/market"
  params?: Record<string, string>;        // e.g. { crop: "wheat", state: "Punjab" }
};

export type ActionPayload = {
  type:    "ACTION";
  action:  string;                        // e.g. "open_modal", "refresh_data"
  payload?: Record<string, unknown>;
};

export type ClarifyPayload = {
  type:        "CLARIFY";
  message:     string;                    // e.g. "Did you mean wheat price or weather?"
  suggestions: string[];
};

export type FallbackPayload = {
  type:    "FALLBACK";
  message: string;
};

export type CommandPayload =
  | NavigatePayload
  | ActionPayload
  | ClarifyPayload
  | FallbackPayload;

// ── Full navigation command envelope ─────────────────────────

export type NavigationCommand = {
  command:      CommandPayload;
  intent:       string;
  confidence:   number;                   // 0.0 – 1.0
  transcript:   string;                   // what the user said
  language:     string;                   // detected language code
  platformId:   string;
  sessionId:    string;
  timestamp:    string;
  processingMs: number;                   // total pipeline latency
};

// ── SDK configuration (passed to constructor) ─────────────────

export type IntLLMConfig = {
  serverUrl:   string;                    // e.g. "ws://localhost:4000"
  platformId:  string;                    // must match a registered platform
  sessionId?:  string;                    // auto-generated if not provided
  lang?:       string;                    // default "hi"

  // ── Callbacks — implement these in the parent app ──────────

  // Called when engine is confident — navigate to this route
  onNavigate: (route: string, params?: Record<string, string>) => void;

  // Called when engine triggers a non-navigation action
  onAction?: (action: string, payload?: Record<string, unknown>) => void;

  // Called when confidence is too low — show user a clarification prompt
  onClarify?: (message: string, suggestions: string[]) => void;

  // Called when intent is unsupported or pipeline fails
  onFallback?: (message: string) => void;

  // Called when WebSocket connects successfully
  onConnected?: () => void;

  // Called when WebSocket disconnects
  onDisconnected?: () => void;

  // Called with the raw NavigationCommand before callbacks fire
  // Useful for logging, analytics, or custom handling
  onCommand?: (command: NavigationCommand) => void;

  // Called when audio is sent and pipeline starts processing
  onProcessing?: () => void;

  // Called when pipeline finishes (success or failure)
  onIdle?: () => void;
};

// ── SDK state ─────────────────────────────────────────────────

export type SDKState = "disconnected" | "connecting" | "connected" | "processing";
