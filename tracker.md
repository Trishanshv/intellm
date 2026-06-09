# inteLLm — Project Progress Tracker

> **Last updated**: June 9, 2026  
> **Status**: Phase 1 complete · Phase 2 not started

---

## 🗺️ Phase Overview

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Intent Extraction Pipeline (Ollama + schema enforcement) | ✅ Complete |
| **Phase 2** | STT Microservice (AI4Bharat IndicConformer + FastAPI) | 🔲 Not started |
| **Phase 3** | Orchestrator (Node.js + Express — wires STT + LLM) | 🔲 Not started |
| **Phase 4** | Frontend (Next.js + TypeScript + Tailwind + Zustand) | 🔲 Not started |
| **Phase 5** | Polish, testing & optional deployment | 🔲 Not started |

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

### Known gaps / things to watch

- [ ] Accuracy result not yet recorded — run `npm test` with Ollama live and paste the summary here
- [ ] `"wheat"` (single word) and `"बारिश"` (single word) edge cases may fail — monitor in test results
- [ ] Adapters are all `source: "mock"` — no live API connected yet

---

## 🔲 Phase 2 — Python STT Microservice

**Goal**: Wrap AI4Bharat IndicConformer-600M in a FastAPI endpoint that accepts an audio blob and returns transcribed text + detected language.

### What needs to be built

- [ ] `stt_service/` directory (Python project, separate from Node root)
- [ ] `stt_service/requirements.txt` — `fastapi`, `uvicorn`, `transformers`, `torch`, `soundfile`, `librosa`
- [ ] `stt_service/main.py` — FastAPI app with:
  - `POST /transcribe` — accepts multipart audio upload, returns `{ text, language, confidence }`
  - `GET /health` — returns model load status
  - Model loaded once at startup (not per-request) for speed
- [ ] Model loading: `AI4Bharat/indic-conformer-600m-multilingual` from HuggingFace
- [ ] Fallback path: `IndicWhisper` for high-noise audio (optional, Phase 2b)
- [ ] Test with at least one Hindi `.wav` clip before moving to Phase 3
- [ ] `stt_service/README.md` — setup instructions (Python env, `pip install`, `uvicorn main:app`)

### Hardware notes

- IndicConformer-600M is ~600M params; first HuggingFace download is large
- Model stays in memory after first load — subsequent requests are fast
- Runs on CPU (slower) or GPU (faster); no GPU required for a demo

---

## 🔲 Phase 3 — Node.js + Express Orchestrator

**Goal**: Single Express server that accepts `POST /api/query` (audio + history) from the frontend, fans out to the STT service and Ollama, routes the result through the adapter layer, and returns a structured `AdapterResponse`.

### What needs to be built

- [ ] `server/` directory (Express app)
- [ ] `server/index.ts` — Express entry point
- [ ] `POST /api/query` route — full pipeline:
  1. Save audio to temp file
  2. `POST http://localhost:8000/transcribe` → get text
  3. Call `extractIntent(text, history)` → get `AgriIntent`
  4. Call `routeIntent(intent)` → get `AdapterResponse`
  5. Return JSON response to frontend
- [ ] `GET /api/health` — checks Ollama + STT service status
- [ ] Error handling: STT timeout, Ollama timeout, invalid audio format
- [ ] CORS config for Next.js dev server (`localhost:3000`)
- [ ] `server/package.json` with `express`, `multer` (file upload), `node-fetch` / native `fetch`

---

## 🔲 Phase 4 — Next.js Frontend

**Goal**: Browser UI where a farmer can hold a button to speak (or type), see the transcription, and get a structured response card.

### What needs to be built

- [ ] `frontend/` — `npx create-next-app@latest` with TypeScript + Tailwind
- [ ] Zustand store: session state holding last 3 `{ userText, intent, adapterResponse }` turns
- [ ] `MediaRecorder` hook — capture mic audio as a `Blob`, stream to server
- [ ] Voice input button (hold-to-record or push-to-talk)
- [ ] Text fallback input (for low-bandwidth / no-mic scenarios)
- [ ] Response card component — renders `AdapterResponse.display` with intent badge
- [ ] Language indicator — shows detected language from STT
- [ ] History panel — last 3 turns visible for context
- [ ] Error states: Ollama down, STT down, no mic permission

---

## 🔲 Phase 5 — Polish & Optional Deployment

- [ ] Docker Compose file (`docker-compose.yml`) wiring all three services
- [ ] End-to-end accuracy test with real audio clips in Hindi, Tamil, Bengali
- [ ] Latency profiling — identify bottleneck (STT vs. LLM)
- [ ] Add `confidence` field to `AgriIntent` schema
- [ ] Replace mock adapters with live APIs:
  - [ ] `weatherAdapter()` → Open-Meteo (free, no key) or IMD
  - [ ] `marketPriceAdapter()` → Agmarknet / data.gov.in commodity prices
  - [ ] `cropDiseaseAdapter()` → Crop Doctor API (when available)
  - [ ] `advisoryAdapter()` → KVK / ICAR data feeds
- [ ] README badges (build status, license, language count)

---

## 📁 Current File Structure

```
inteLLm/
├── README.md                    ✅ rewritten — full pipeline + how to run
├── PROJECT_ARCHITECTURE.md      ✅ full architecture reference
├── tracker.md                   ✅ THIS FILE
├── package.json                 ✅ npm test wired
├── src/
│   ├── intentSchemas.ts         ✅ types + JSON schema + system prompt
│   ├── intentExtractor.ts       ✅ Ollama caller + validator + health check
│   ├── adapters.ts              ✅ mock adapters (all 5 intents)
│   ├── router.ts                ✅ intent → adapter switch
│   └── tsconfig.json            ✅
├── tests/
│   └── runPipeline.ts           ✅ 20-query test suite
├── notebook2_audio_segments.md  ✅ research notes
├── stt_service/                 🔲 Phase 2 — not created yet
├── server/                      🔲 Phase 3 — not created yet
└── frontend/                    🔲 Phase 4 — not created yet
```

---

## 🧪 Test Results Log

> Fill this in after each `npm test` run.

| Date | Model | Passed / Total | Accuracy | Avg Latency | Notes |
|------|-------|---------------|----------|-------------|-------|
| —    | —     | — / 20        | —        | —           | Not run yet |

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
