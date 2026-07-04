// ============================================================
//  INTENT SERVICE
//  Thin wrapper around the Phase 1 intent extractor.
//  Keeps the orchestrator clean — one import, one call.
// ============================================================

export { extractIntent, checkOllamaHealth } from "../phase1/intentExtractor.js";
