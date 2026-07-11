
import http                          from "http";
import path                          from "path";
import { fileURLToPath }             from "url";
import express                       from "express";
import cors                          from "cors";
import { router }                    from "./routes/query.js";
import { eventBus, EVENTS }          from "./patterns/eventBus.js";
import { initWSServer, getConnectedClientCount } from "./wsserver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
 
const app        = express();
const PORT       = process.env.PORT ?? 4000;
const httpServer = http.createServer(app);  // wrap Express in HTTP server for WS upgrade
 
// ── Middleware ────────────────────────────────────────────────
 
app.use(cors({ origin: "*" }));  // allow all origins during development
app.use(express.json());

// ── Serve SDK demo over HTTP (avoids file:// CORS restrictions) ──
app.use("/demo", express.static(path.join(__dirname, "../../sdk/demo")));
 
// ── Routes ────────────────────────────────────────────────────
 
app.use("/api", router);
 
// ── WebSocket server ──────────────────────────────────────────
 
initWSServer(httpServer);
 
// ── Event Bus logging ─────────────────────────────────────────
 
eventBus.on(EVENTS.NAVIGATION_COMMAND, (cmd) => {
  const c = cmd as { intent: string; sessionId: string };
  console.log(`[EventBus] NAV_COMMAND intent=${c.intent} session=${c.sessionId} clients=${getConnectedClientCount()}`);
});
 
eventBus.on(EVENTS.CLARIFICATION_NEEDED, (cmd) => {
  const c = cmd as { sessionId: string };
  console.log(`[EventBus] CLARIFY session=${c.sessionId}`);
});
 
eventBus.on(EVENTS.FSM_STATE_CHANGED, (state) => {
  const s = state as { sessionId: string; from: string; to: string };
  console.log(`[FSM] ${s.sessionId}: ${s.from} → ${s.to}`);
});
 
eventBus.on(EVENTS.PIPELINE_ERROR, (err) => {
  console.error("[Pipeline Error]", err);
});
 
// ── Start ─────────────────────────────────────────────────────
 
httpServer.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║   Agri Navigation Engine               ║`);
  console.log(`║   http://localhost:${PORT}                ║`);
  console.log(`║   ws://localhost:${PORT}                  ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
  console.log(`Endpoints:`);
  console.log(`  POST http://localhost:${PORT}/api/query     ← main pipeline`);
  console.log(`  GET  http://localhost:${PORT}/api/health    ← service health`);
  console.log(`  POST http://localhost:${PORT}/api/register  ← register platform`);
  console.log(`  WS   ws://localhost:${PORT}                 ← SDK connection\n`);
});
 
