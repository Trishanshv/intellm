import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage }        from "http";
import type { Server }                 from "http";
import { eventBus, EVENTS }            from "./patterns/eventBus.js";
import type { NavigationCommand }      from "./patterns/commandPattern.js";

// sessionId → WebSocket connection
const clients = new Map<string, WebSocket>();

export function initWSServer(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    // Extract sessionId and platformId from query string
    // e.g. ws://localhost:4000?sessionId=sdk_123&platformId=crop_doctor
    const url        = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const sessionId  = url.searchParams.get("sessionId") ?? `anon_${Date.now()}`;
    const platformId = url.searchParams.get("platformId") ?? "unknown";

    clients.set(sessionId, ws);
    console.log(`[WSServer] Client connected: ${sessionId} (${platformId}) | total: ${clients.size}`);

    // Handle pings from the SDK heartbeat
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type?: string };
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch {
        // ignore non-JSON messages
      }
    });

    ws.on("close", () => {
      clients.delete(sessionId);
      console.log(`[WSServer] Client disconnected: ${sessionId} | total: ${clients.size}`);
    });

    ws.on("error", (err) => {
      console.error(`[WSServer] Error for ${sessionId}:`, err.message);
      clients.delete(sessionId);
    });

    // Confirm connection to SDK
    ws.send(JSON.stringify({ type: "connected", sessionId }));
  });

  // ── EventBus bridge ───────────────────────────────────────
  //  When the engine emits a NavigationCommand, push it to
  //  the matching SDK client over WebSocket.

  eventBus.on<NavigationCommand>(EVENTS.NAVIGATION_COMMAND, (cmd) => {
    pushToClient(cmd.sessionId, cmd);
  });

  eventBus.on<NavigationCommand>(EVENTS.CLARIFICATION_NEEDED, (cmd) => {
    pushToClient(cmd.sessionId, cmd);
  });

  console.log("[WSServer] WebSocket server ready on same port as HTTP");
}

function pushToClient(sessionId: string, payload: unknown): void {
  const ws = clients.get(sessionId);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    // Client disconnected — command was already returned via HTTP response
    return;
  }
  ws.send(JSON.stringify(payload));
}

export function getConnectedClientCount(): number {
  return clients.size;
}