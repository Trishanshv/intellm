// ============================================================
//  MIDDLEWARE PIPELINE — Pattern: Middleware Pipeline
//
//  Each stage is a function that receives context, does one
//  job, enriches the context, and passes it to the next stage.
//  Any stage can short-circuit by setting context.error.
//
//  Pipeline stages:
//    1. validateInput   — check platformId, sessionId, lang
//    2. transcribeAudio — STT: audio → text
//    3. extractIntent   — LLM: text → intent JSON
//    4. processNavigation — Engine: intent → NavigationCommand
// ============================================================

import { transcribeAudio }  from "../services/sttService.js";
import { extractIntent }    from "../services/intentService.js";
import { processIntent }    from "../engine/navigationEngine.js";
import { getOrCreateFSM }   from "../engine/fsm.js";
import type { AgriIntent }  from "../phase1/intentSchemas.js";
import type { NavigationCommand } from "../patterns/commandPattern.js";

// ── Pipeline context — passed through and enriched at each stage

export type PipelineContext = {
  // Inputs
  audioBuffer:  Buffer;
  audioFilename: string;
  platformId:   string;
  sessionId:    string;
  lang:         string;
  history:      Array<{ userText: string; intent: AgriIntent }>;
  startTimeMs:  number;

  // Enriched by pipeline stages
  transcript?:  string;
  intent?:      AgriIntent;
  result?:      NavigationCommand;
  error?:       { stage: string; message: string };
};

type Stage = (ctx: PipelineContext) => Promise<void>;

// ── Stage 1: Validate input ───────────────────────────────────

const validateInput: Stage = async (ctx) => {
  if (!ctx.platformId || ctx.platformId.trim() === "") {
    ctx.error = { stage: "validateInput", message: "platformId is required" };
    return;
  }
  if (!ctx.audioBuffer || ctx.audioBuffer.length === 0) {
    ctx.error = { stage: "validateInput", message: "audio is required" };
    return;
  }
  if (!ctx.sessionId) {
    ctx.sessionId = `session_${Date.now()}`;
  }
};

// ── Stage 2: Speech-to-Text ───────────────────────────────────

const transcribeStage: Stage = async (ctx) => {
  if (ctx.error) return; // short-circuit

  const fsm = getOrCreateFSM(ctx.sessionId);
  fsm.transition("LISTENING");

  const result = await transcribeAudio(ctx.audioBuffer, ctx.audioFilename, ctx.lang);

  if (!result.success) {
    ctx.error = { stage: "stt", message: result.error };
    fsm.reset();
    return;
  }

  ctx.transcript = result.text;
  fsm.transition("PROCESSING");
};

// ── Stage 3: Intent extraction ────────────────────────────────

const extractIntentStage: Stage = async (ctx) => {
  if (ctx.error) return;

  const result = await extractIntent(ctx.transcript!, ctx.history);

  if (!result.success) {
    ctx.error = { stage: "intentExtraction", message: result.error };
    getOrCreateFSM(ctx.sessionId).reset();
    return;
  }

  ctx.intent = result.intent;
};

// ── Stage 4: Navigation engine ────────────────────────────────

const navigationStage: Stage = async (ctx) => {
  if (ctx.error) return;

  ctx.result = processIntent({
    intent:      ctx.intent!,
    transcript:  ctx.transcript!,
    language:    ctx.lang,
    platformId:  ctx.platformId,
    sessionId:   ctx.sessionId,
    startTimeMs: ctx.startTimeMs,
  });
};

// ── Pipeline runner ───────────────────────────────────────────

const STAGES: Stage[] = [
  validateInput,
  transcribeStage,
  extractIntentStage,
  navigationStage,
];

export async function runPipeline(ctx: PipelineContext): Promise<PipelineContext> {
  for (const stage of STAGES) {
    await stage(ctx);
    if (ctx.error) break; // stop on first error
  }
  return ctx;
}
