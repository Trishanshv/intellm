// ============================================================
//  EVENT BUS — Pattern: Event Bus
//
//  Decouples the Navigation Engine from the SDK/connector.
//  The engine emits events. The SDK listens and acts.
//  Neither knows about the other directly.
//
//  Why this matters:
//  If we later add WebSocket, REST polling, or SSE as delivery
//  mechanisms, we only change the listener — not the engine.
// ============================================================

type EventHandler<T> = (payload: T) => void;

class EventBus {
  // Map of eventName → array of handlers
  private listeners: Map<string, EventHandler<unknown>[]> = new Map();

  // Register a listener for an event
  on<T>(event: string, handler: EventHandler<T>): void {
    const existing = this.listeners.get(event) ?? [];
    this.listeners.set(event, [...existing, handler as EventHandler<unknown>]);
  }

  // Remove a listener
  off<T>(event: string, handler: EventHandler<T>): void {
    const existing = this.listeners.get(event) ?? [];
    this.listeners.set(event, existing.filter((h) => h !== (handler as EventHandler<unknown>)));
  }

  // Emit an event — calls all registered handlers synchronously
  emit<T>(event: string, payload: T): void {
    const handlers = this.listeners.get(event) ?? [];
    handlers.forEach((h) => h(payload));
  }

  // Clear all listeners for an event (useful in tests)
  clear(event: string): void {
    this.listeners.delete(event);
  }
}

// Singleton — one bus for the whole server process
export const eventBus = new EventBus();

// ── Event name constants ──────────────────────────────────────
//  Centralised so there are no magic strings scattered in code

export const EVENTS = {
  NAVIGATION_COMMAND:  "navigation:command",   // engine → SDK
  CLARIFICATION_NEEDED:"navigation:clarify",   // engine → SDK (low confidence)
  PIPELINE_ERROR:      "pipeline:error",        // any stage → error handler
  FSM_STATE_CHANGED:   "fsm:stateChanged",      // FSM → logger/debugger
} as const;
