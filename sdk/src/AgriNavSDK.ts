// ============================================================
//  AGRI NAV SDK — Main Class
//
//  This is the ENTIRE public API surface of the SDK.
//  A parent app developer only ever imports and uses this class.
//
//  Usage:
//    const nav = new AgriNavSDK({ ...config });
//    nav.sendAudio(audioBlob, "hi");
//    nav.disconnect();
//
//  The SDK:
//    1. Connects to the server via WebSocket
//    2. Sends audio to POST /api/query via HTTP (audio blobs
//       are too large for WebSocket — HTTP multipart is better)
//    3. Receives NavigationCommand back over WebSocket
//    4. Fires the appropriate parent-app callback
// ============================================================

import { WSClient }                       from "./wsClient.js";
import type {
  AgriNavSDKConfig,
  NavigationCommand,
  SDKState,
}                                         from "./types.js";

export class AgriNavSDK {
  private config:    AgriNavSDKConfig;
  private wsClient:  WSClient;
  private sessionId: string;
  private state:     SDKState = "disconnected";
  private httpBase:  string;  // HTTP base URL derived from ws URL

  constructor(config: AgriNavSDKConfig) {
    this.config    = config;
    this.sessionId = config.sessionId ?? `sdk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Derive HTTP base from WebSocket URL
    // ws://localhost:4000 → http://localhost:4000
    // wss://example.com  → https://example.com
    this.httpBase = config.serverUrl
      .replace(/^ws:\/\//, "http://")
      .replace(/^wss:\/\//, "https://");

    // WebSocket URL includes sessionId so the server can route
    // pushed commands back to this specific SDK instance
    const wsUrl = `${config.serverUrl}?sessionId=${this.sessionId}&platformId=${config.platformId}`;

    this.wsClient = new WSClient({
      url: wsUrl,
      onMessage:       this.handleMessage.bind(this),
      onConnected:     () => {
        this.setState("connected");
        this.config.onConnected?.();
      },
      onDisconnected:  () => {
        this.setState("disconnected");
        this.config.onDisconnected?.();
      },
    });

    this.wsClient.connect();
  }

  // ── Public API ────────────────────────────────────────────

  // Primary method: send recorded audio for processing
  // audioBlob — raw audio from MediaRecorder
  // lang      — BCP-47 language code, e.g. "hi", "ta", "bn"
  async sendAudio(audioBlob: Blob, lang?: string): Promise<void> {
    if (this.state === "processing") {
      console.warn("[AgriNavSDK] Already processing. Please wait.");
      return;
    }

    this.setState("processing");
    this.config.onProcessing?.();

    const formData = new FormData();
    formData.append("audio",      audioBlob, "recording.wav");
    formData.append("platformId", this.config.platformId);
    formData.append("sessionId",  this.sessionId);
    formData.append("lang",       lang ?? this.config.lang ?? "hi");

    try {
      const response = await fetch(`${this.httpBase}/api/query`, {
        method: "POST",
        body:   formData,
      });

      if (!response.ok) {
        const err = await response.json() as { error?: string };
        this.handleFallback(err.error ?? "Server error. Please try again.");
        return;
      }

      // The HTTP response contains the NavigationCommand directly.
      // The same command is also broadcast over WebSocket so other
      // listeners (e.g. debug panels) can observe it.
      const data = await response.json() as { success: boolean; command?: NavigationCommand; error?: string };

      if (!data.success || !data.command) {
        this.handleFallback(data.error ?? "No command received from server.");
        return;
      }

      // Handle the command locally (HTTP response is faster than WS roundtrip)
      this.handleMessage(data.command);

    } catch (err) {
      this.handleFallback(`Network error: ${String(err)}`);
    } finally {
      this.setState("connected");
      this.config.onIdle?.();
    }
  }

  // Send plain text instead of audio (useful for testing/text fallback)
  async sendText(text: string, lang?: string): Promise<void> {
    // Encode text as a tiny WAV-like blob the server can handle,
    // OR hit a separate /api/query-text endpoint if added later.
    // For now: convert text to a Blob with a special content type flag.
    const textBlob = new Blob([text], { type: "text/plain" });
    await this.sendAudio(textBlob, lang);
  }

  // Get current connection/processing state
  getState(): SDKState {
    return this.state;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // Cleanly shut down — call this on page unload
  disconnect(): void {
    this.wsClient.disconnect();
    this.setState("disconnected");
  }

  // ── Internal handlers ─────────────────────────────────────

  private handleMessage(data: unknown): void {
    const cmd = data as NavigationCommand;

    // Fire raw command callback first (for logging/analytics)
    this.config.onCommand?.(cmd);

    switch (cmd.command.type) {
      case "NAVIGATE":
        this.config.onNavigate(cmd.command.route, cmd.command.params);
        break;

      case "ACTION":
        this.config.onAction?.(cmd.command.action, cmd.command.payload);
        break;

      case "CLARIFY":
        if (this.config.onClarify) {
          this.config.onClarify(cmd.command.message, cmd.command.suggestions);
        } else {
          // Default: log to console if parent app didn't implement onClarify
          console.info("[AgriNavSDK] Clarification needed:", cmd.command.message);
        }
        break;

      case "FALLBACK":
        this.handleFallback(cmd.command.message);
        break;
    }
  }

  private handleFallback(message: string): void {
    if (this.config.onFallback) {
      this.config.onFallback(message);
    } else {
      console.warn("[AgriNavSDK] Fallback:", message);
    }
  }

  private setState(state: SDKState): void {
    this.state = state;
  }
}

// Re-export types so parent apps only need one import
export type {
  AgriNavSDKConfig,
  NavigationCommand,
  SDKState,
  NavigatePayload,
  ActionPayload,
  ClarifyPayload,
  FallbackPayload,
  CommandPayload,
} from "./types.js";
