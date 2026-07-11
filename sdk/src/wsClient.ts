// ============================================================
//  WS CLIENT — WebSocket Connection Manager
//
//  Handles connection lifecycle so AgriNavSDK never has to:
//    - Auto-reconnect on drop (exponential backoff)
//    - Heartbeat ping every 30s to keep connection alive
//    - Message queue: messages sent while disconnected are
//      held and flushed once reconnected
//    - Clean teardown on sdk.disconnect()
// ============================================================

type MessageHandler = (data: unknown) => void;

type WSClientOptions = {
  url:             string;
  onMessage:       MessageHandler;
  onConnected?:    () => void;
  onDisconnected?: () => void;
};

const RECONNECT_BASE_MS  = 1000;   // initial backoff
const RECONNECT_MAX_MS   = 16000;  // cap at 16 seconds
const HEARTBEAT_MS       = 30000;  // ping every 30 seconds

export class WSClient {
  private url:             string;
  private ws:              WebSocket | null = null;
  private reconnectDelay:  number = RECONNECT_BASE_MS;
  private reconnectTimer:  ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer:  ReturnType<typeof setInterval> | null = null;
  private messageQueue:    string[] = [];
  private destroyed:       boolean = false;
  private handlers:        WSClientOptions;

  constructor(options: WSClientOptions) {
    this.url      = options.url;
    this.handlers = options;
  }

  connect(): void {
    if (this.destroyed) return;

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      console.error("[AgriNavSDK] WebSocket construction failed:", err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log("[AgriNavSDK] Connected to", this.url);
      this.reconnectDelay = RECONNECT_BASE_MS; // reset backoff on success

      // Flush any messages queued while disconnected
      while (this.messageQueue.length > 0) {
        this.ws?.send(this.messageQueue.shift()!);
      }

      this.startHeartbeat();
      this.handlers.onConnected?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        this.handlers.onMessage(data);
      } catch {
        console.warn("[AgriNavSDK] Failed to parse message:", event.data);
      }
    };

    this.ws.onclose = () => {
      console.warn("[AgriNavSDK] Disconnected");
      this.stopHeartbeat();
      this.handlers.onDisconnected?.();
      if (!this.destroyed) this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error("[AgriNavSDK] WebSocket error:", err);
      // onclose fires automatically after onerror — no need to reconnect here
    };
  }

  // Send a JSON message — queue if not yet connected
  send(data: unknown): void {
    const serialised = JSON.stringify(data);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(serialised);
    } else {
      this.messageQueue.push(serialised);
    }
  }

  // Cleanly shut down — no more reconnect attempts
  disconnect(): void {
    this.destroyed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      console.log(`[AgriNavSDK] Reconnecting in ${this.reconnectDelay}ms...`);
      this.connect();
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
    }, this.reconnectDelay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
