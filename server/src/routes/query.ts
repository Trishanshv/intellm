// ============================================================
//  ROUTES — POST /api/query  |  GET /api/health
// ============================================================

import { Router, Request, Response } from "express";
import multer from "multer";
import { runPipeline }         from "../middleware/pipeline.js";
import { checkSTTHealth }      from "../services/sttService.js";
import { checkOllamaHealth }   from "../services/intentService.js";
import { intentRegistry }      from "../engine/intentRegistry.js";

export const router = Router();

// multer stores uploaded audio in memory as Buffer
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── POST /api/query ───────────────────────────────────────────

router.post("/query", upload.single("audio"), async (req: Request, res: Response) => {
  const startTimeMs = Date.now();

  const platformId = req.body.platformId as string ?? "demo_platform";
  const sessionId  = req.body.sessionId  as string ?? `session_${Date.now()}`;
  const lang       = req.body.lang       as string ?? "hi";
  const history    = req.body.history    ? JSON.parse(req.body.history) : [];

  if (!req.file) {
    res.status(400).json({ error: "No audio file uploaded. Send audio as multipart field 'audio'." });
    return;
  }

  const ctx = await runPipeline({
    audioBuffer:   req.file.buffer,
    audioFilename: req.file.originalname || "audio.wav",
    platformId,
    sessionId,
    lang,
    history,
    startTimeMs,
  });

  if (ctx.error) {
    res.status(500).json({
      success:  false,
      stage:    ctx.error.stage,
      error:    ctx.error.message,
    });
    return;
  }

  res.json({
    success:    true,
    transcript: ctx.transcript,
    command:    ctx.result,
  });
});

// ── GET /api/health ───────────────────────────────────────────

router.get("/health", async (_req: Request, res: Response) => {
  const [stt, ollama] = await Promise.all([checkSTTHealth(), checkOllamaHealth()]);

  const allOk = stt.ok && ollama.ok;

  res.status(allOk ? 200 : 503).json({
    status:     allOk ? "ok" : "degraded",
    services: {
      stt:    { ok: stt.ok,    error: stt.error },
      ollama: { ok: ollama.ok, error: ollama.error },
    },
    platforms: intentRegistry.getPlatformIds(),
  });
});

// ── POST /api/register ────────────────────────────────────────
//  Allows parent platforms to register their intents at runtime

router.post("/register", (req: Request, res: Response) => {
  const platform = req.body;

  if (!platform.platformId || !platform.intents) {
    res.status(400).json({ error: "platformId and intents are required" });
    return;
  }

  try {
    intentRegistry.registerPlatform(platform);
    res.json({ success: true, message: `Platform '${platform.platformId}' registered with ${platform.intents.length} intents` });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
