// ============================================================
//  AGRI PLATFORM — Navigation Engine Server
//  Port 4000  |  Node.js + Express + TypeScript
// ============================================================

import express from "express";
import cors    from "cors";
import { router } from "./routes/query.js";
import { eventBus, EVENTS } from "./patterns/eventBus.js";

const app  = express();
const PORT = process.env.PORT ?? 4000;

// ── Middleware ────────────────────────────────────────────────

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:4000"] }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────

app.use("/api", router);

// ── Event Bus logging ─────────────────────────────────────────
//  In production, swap console.log for a proper logger (pino/winston)

eventBus.on(EVENTS.NAVIGATION_COMMAND, (cmd) => {
  console.log("[EventBus] Navigation command emitted:", JSON.stringify(cmd, null, 2));
});

eventBus.on(EVENTS.CLARIFICATION_NEEDED, (cmd) => {
  console.log("[EventBus] Clarification needed:", JSON.stringify(cmd, null, 2));
});

eventBus.on(EVENTS.FSM_STATE_CHANGED, (state) => {
  const s = state as { sessionId: string; from: string; to: string };
  console.log(`[FSM] ${s.sessionId}: ${s.from} → ${s.to}`);
});

eventBus.on(EVENTS.PIPELINE_ERROR, (err) => {
  console.error("[Pipeline Error]", err);
});

// ── Start ─────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║   Agri Navigation Engine               ║`);
  console.log(`║   http://localhost:${PORT}                ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
  console.log(`Endpoints:`);
  console.log(`  POST http://localhost:${PORT}/api/query     ← main pipeline`);
  console.log(`  GET  http://localhost:${PORT}/api/health    ← service health`);
  console.log(`  POST http://localhost:${PORT}/api/register  ← register platform\n`);
});
