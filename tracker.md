# inteLLm — Project Progress Tracker

> **Last updated**: July 4, 2026  
> **Status**: Phase 2 complete · Phase 3 design updated

---

## 🗺️ Phase Overview

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Intent Extraction Pipeline (Ollama + schema enforcement) | ✅ Complete |
| **Phase 2** | STT Microservice (AI4Bharat IndicConformer + FastAPI) | ✅ Complete |
| **Phase 3** | Navigation Engine Core (Node.js + Express + FSM + middleware + registry + commands) | 🔲 Not started |
| **Phase 4** | SDK / Connector (embeddable JS integration layer for parent apps) | 🔲 Not started |
| **Phase 5** | Next.js Demo Shell (fake parent platform for integration demos) | 🔲 Not started |
| **Phase 6** | Live Crop Doctor Integration (real parent platform demo) | 🔲 Not started |

---

## ✅ Phase 1 — Intent Extraction Pipeline

**Goal**: Prove that the Ollama → grammar-constrained JSON pipeline works reliably before touching audio.  
**Completion threshold**: ≥ 85% accuracy on the 20-query test suite.

### What's done

- [x] `src/intentSchemas.ts` — TypeScript union types for all 5 intent shapes (`WeatherIntent`, `MarketPriceIntent`, `CropDiseaseIntent`, `AdvisoryIntent`, `UnsupportedIntent`) plus the Ollama-compatible JSON Schema object and the few-shot system prompt
- [x] `src/intentExtractor.ts` — Core Ollama caller with:
  - Grammar-constrained decoding via `format: INTENT_JSON_SCHEMA`
  - Temperature-0 deterministic inference
  - Token cap (`num_predict: 256`) since intent JSON is short
  - Conversation history injection (last 3 turns) for follow-up query resolution
  - Two-layer validation: grammar constraint at token level + TypeScript runtime schema check
  - Ollama health check (`checkOllamaHealth()`) with helpful error messages
- [x] `src/adapters.ts` — Mock adapter for every intent:
  - `weatherAdapter()` — placeholder weather data with location/timeframe
  - `marketPriceAdapter()` — hardcoded price table for 8 major crops (₹/quintal)
  - `cropDiseaseAdapter()` — generic disease diagnosis scaffold
  - `advisoryAdapter()` — crop × topic lookup table (irrigation, sowing, fertilizer for rice/wheat/tomato)
  - `fallbackAdapter()` — graceful unsupported-intent response
  - All adapters return `{ intent, data, display, source: "mock" }` — the `source` field flips to `"live"` when a real API is plugged in
- [x] `src/router.ts` — `routeIntent()` switch with TypeScript exhaustiveness check on the `AgriIntent` discriminated union
- [x] `tests/runPipeline.ts` — 20-query test runner covering Hindi, English, Hinglish, ambiguous one-word inputs, and out-of-domain queries; prints coloured pass/fail + latency + summary stats
- [x] `package.json` — `npm test` wired to `npx tsx tests/runPipeline.ts`; no compiled build step needed
- [x] `src/tsconfig.json` — TypeScript config for the `src/` module
- [x] `PROJECT_ARCHITECTURE.md` — Full architecture reference doc
- [x] `README.md` — Phase 1 quick-start guide *(now rewritten with full pipeline)*

### Records

- [x] Accuracy result: **100.0% (20/20 pass)** · Avg latency: **1550ms** · Run on 2026-06-09 with llama3.1:8b
- [x] `"wheat"` (single word) and `"बारिश"` (single word) edge cases **both PASS** — no issues detected
- [ ] Adapters are all `source: "mock"` — no live API connected yet

---

## ✅ Phase 2 — Python STT Microservice

**Goal**: Wrap AI4Bharat IndicConformer-600M in a FastAPI endpoint that accepts an audio blob and returns transcribed text + detected language.  
**Status**: ✅ **COMPLETE** — Ready for Phase 3 (orchestrator integration)

### What's done

- [x] `stt-service/` directory (Python project, separate from Node root)
- [x] `stt-service/requirements.txt` — all dependencies pinned (fastapi, uvicorn, transformers, torch, torchaudio, soundfile, librosa, onnxruntime)
- [x] `stt-service/main.py` — FastAPI app with:
  - ✅ `POST /transcribe` — accepts multipart audio upload, returns `{ text, language, duration_seconds, latency_ms }`
  - ✅ `GET /health` — returns model load status + supported languages list
  - ✅ Model loaded once at startup (ONNX optimized version for speed)
  - ✅ CORS configured for orchestrator + frontend (localhost:3000, localhost:4000)
  - ✅ Audio validation (0.5–30 sec duration check)
  - ✅ Supports 22 Indian languages (Hindi, Tamil, Telugu, Kannada, Malayalam, etc.)
  - ✅ Proper error handling (invalid audio, missing file, inference failures)
  - ✅ Temp file cleanup on disk
- [x] Model loading: `AI4Bharat/indic-conformer-600m-multilingual` (ONNX variant from HuggingFace)
- [x] Test suite:
  - `test-model1.py` — Processor & model load verification
  - `test-model2.py` — ONNX model with dummy inference
  - `test-model3.py` — **Full end-to-end pipeline with real audio** ✅ PASS
  - `reccord.py` — Audio capture utility for manual testing
  - `test.wav` — Sample Hindi audio clip for testing
- [x] `stt-service/README.md` — setup instructions & API documentation

### Hardware notes

- IndicConformer-600M is ~600M params; first HuggingFace download is large
- Model stays in memory after first load — subsequent requests are fast
- Runs on CPU (slower) or GPU (faster); CPU for Demo Can upgrade to GPU if needed

---

## 🔲 Phase 3 — Navigation Engine Core

**Goal**: Build the Node.js orchestrator as the core navigation engine that receives audio + platform context, runs the middleware pipeline, enforces confidence checks, looks up registered intents, and emits navigation commands through an event bus.

### What needs to be built

- [ ] `server/` directory (Node.js + Express app)
- [ ] `server/src/index.ts` — Express entry point on port 4000
- [ ] `server/src/middleware/pipeline.ts` — audio → STT → validate → LLM → confidence → emit
- [ ] `server/src/engine/fsm.ts` — conversation state machine (`idle → listening → processing → navigating → idle`)
- [ ] `server/src/engine/intentRegistry.ts` — in-memory intent registry for platform routes/actions
- [ ] `server/src/engine/confidenceFilter.ts` — threshold check + clarification fallback
- [ ] `server/src/engine/navigationEngine.ts` — assembles `NavigationCommand` and routes events
- [ ] `server/src/patterns/commandPattern.ts` — command interface + executor abstraction
- [ ] `server/src/patterns/eventBus.ts` — decoupled event emitter for SDK communication
- [ ] `server/src/services/sttService.ts` — calls Phase 2 service at `:8000`
- [ ] `server/src/services/intentService.ts` — reuses Phase 1 intent extraction logic
- [ ] `server/src/routes/query.ts` — `POST /api/query`, `GET /api/health`
- [ ] `server/package.json` with `express` and integration dependencies
- [ ] Command emit flow: `NavigationCommand { intent, route, confidence, platform }`

---

## 🔲 Phase 4 — SDK / Connector

**Goal**: Ship an embeddable JS connector that parent apps load to receive navigation commands and execute platform-specific actions without tight coupling.

### What needs to be built

- [ ] `sdk/` or `connector/` package for embeddable integration
- [ ] Initialization API for parent app route/action registration
- [ ] Event listener bridge for `NavigationCommand` payloads
- [ ] Parent-app adapters for platform-specific route execution
- [ ] Confidence/clarification hooks for user confirmation before navigation
- [ ] SDK docs and sample integration snippet

---

## 🔲 Phase 5 — Next.js Demo Shell

**Goal**: Build a fake parent platform in Next.js to demonstrate how the SDK integrates and how navigation commands are handled visually.

### What needs to be built

- [ ] `frontend/` — `npx create-next-app@latest` with TypeScript + Tailwind
- [ ] Session state for current page, last 3 turns, and navigation events
- [ ] Mic/text input demo that sends audio or text into the navigation engine
- [ ] Response panel showing the emitted command and resolved route
- [ ] Demo route handling to simulate parent app navigation
- [ ] Error states for STT, registry miss, and low-confidence clarification

---

## 🔲 Phase 6 — Live Crop Doctor Integration

**Goal**: Connect the SDK and navigation engine to the real Crop Doctor platform as the first live parent app integration.

### What needs to be built

- [ ] Crop Doctor integration adapter
- [ ] Real route/action registration against Crop Doctor pages
- [ ] End-to-end voice navigation flow in the live platform
- [ ] Production confidence tuning and fallback handling
- [ ] Integration validation checklist and deployment notes

---

## 📁 Current File Structure

```
inteLLm/
├── README.md                    ✅ rewritten — full pipeline + how to run
├── PROJECT_ARCHITECTURE.md      ✅ full architecture reference
├── tracker.md                   ✅ THIS FILE
├── package.json                 ✅ npm test wired
├── .gitignore                   ✅ node_modules, venv, etc.
├── .gitattributes               ✅ LF line endings
├── src/
│   ├── intentSchemas.ts         ✅ types + JSON schema + system prompt
│   ├── intentExtractor.ts       ✅ Ollama caller + validator + health check
│   ├── adapters.ts              ✅ mock adapters (all 5 intents)
│   ├── router.ts                ✅ intent → adapter switch
│   └── tsconfig.json            ✅
├── tests/
│   └── runPipeline.ts           ✅ 20-query test suite
├── stt-service/                 ✅ Phase 2 — FastAPI microservice
│   ├── main.py                  ✅ FastAPI app + endpoints
│   ├── requirements.txt          ✅ dependencies pinned
│   ├── test-model1.py           ✅ model load test
│   ├── test-model2.py           ✅ ONNX inference test
│   ├── test-model3.py           ✅ end-to-end pipeline test
│   ├── reccord.py               ✅ audio recording utility
│   ├── test.wav                 ✅ sample Hindi audio
│   └── README.md                ✅ setup docs & API reference
├── notebook2_audio_segments.md  ✅ research notes
├── server/                      🔲 Phase 3 — navigation engine core not created yet
├── sdk/                         🔲 Phase 4 — connector package not created yet
└── frontend/                    🔲 Phase 5 — demo shell not created yet
```

---

## 🧪 Test Results Log

> Fill this in after each `npm test` run.

| Date | Model | Passed / Total | Accuracy | Avg Latency | Notes |
|------|-------|---------------|----------|-------------|-------|
| 2026-06-09 | llama3.1:8b | 20 / 20 | 100.0% | 1550ms | All intents detected correctly; edge cases pass; ready for Phase 2 |

---

## 🔗 Key References

| Resource | Link |
|----------|------|
| AI4Bharat IndicConformer | https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual |
| IndicWhisper (fallback) | https://github.com/AI4Bharat/IndicWhisper |
| Ollama JSON schema format docs | https://ollama.com/blog/structured-outputs |
| Open-Meteo (free weather API) | https://open-meteo.com |
| Agmarknet (mandi prices) | https://agmarknet.gov.in |
| data.gov.in commodity data | https://data.gov.in |
