# inteLLm — Developer Reference

> **Audience**: Developers integrating the SDK into a platform, contributors extending the engine, or anyone who wants to understand exactly how this system works.  
> **Last updated**: July 13, 2026

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Component Deep-Dive](#2-component-deep-dive)
   - [STT Microservice](#21-stt-microservice)
   - [Navigation Engine](#22-navigation-engine)
   - [SDK / Connector](#23-sdk--connector)
3. [API Reference](#3-api-reference)
4. [SDK Public API Reference](#4-sdk-public-api-reference)
5. [Design Patterns](#5-design-patterns)
6. [Performance](#6-performance)
7. [Folder Structure](#7-folder-structure)
8. [Known Limitations & Future Work](#8-known-limitations--future-work)

---

## 1. System Architecture

### Full Stack Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                       Parent Platform                             │
│   (any web app: Next.js, React, vanilla HTML, etc.)              │
│                                                                   │
│    ┌──────────────────────────────────────────────────────┐      │
│    │                  IntLLM SDK                           │      │
│    │  new IntLLM({ serverUrl, platformId, onNavigate… })  │      │
│    │  nav.sendAudio(blob, "hi")                            │      │
│    └────────────┬────────────────────────┬────────────────┘      │
│                 │ HTTP POST /api/query   │ WS ws://localhost:4000 │
└─────────────────┼────────────────────────┼────────────────────────┘
                  │                        │
┌─────────────────▼────────────────────────▼────────────────────────┐
│              Navigation Engine  —  Node.js + Express  :4000        │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                  Middleware Pipeline                          │ │
│  │  1. validateInput → 2. transcribeAudio → 3. extractIntent    │ │
│  │  → 4. processNavigation                                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────────┐ │
│  │ConversationFSM│  │IntentRegistry │  │  ConfidenceFilter      │ │
│  │IDLE→LISTENING │  │ Platform Map  │  │  score() → pass/clarify│ │
│  │→PROCESSING    │  │ Intent→Route  │  │  (Strategy Pattern)    │ │
│  │→NAVIGATING    │  │ (Repository)  │  └────────────────────────┘ │
│  └───────────────┘  └───────────────┘                             │
│                                                                    │
│  ┌───────────────────────────────────────────────────────────────┐│
│  │                     EventBus (Observer)                       ││
│  │   NAVIGATION_COMMAND · CLARIFICATION_NEEDED · FSM_CHANGED    ││
│  └──────────────────────────┬────────────────────────────────────┘│
│                             │                                      │
│  ┌──────────────────────────▼────────────────────────────────────┐│
│  │                    WebSocket Server                            ││
│  │    Broadcasts NavigationCommand to all SDK clients for session ││
│  └───────────────────────────────────────────────────────────────┘│
└──────────────────────┬────────────────────────┬────────────────────┘
                       │ POST /transcribe        │ POST /api/chat
                       ▼                         ▼
        ┌─────────────────────┐    ┌──────────────────────────┐
        │  STT Microservice   │    │  Ollama (Local LLM)      │
        │ Python FastAPI :8000│    │  :11434                  │
        │ IndicConformer 600M │    │  llama3.1:8b             │
        │ 22 Indian languages │    │  grammar-constrained JSON│
        └─────────────────────┘    └──────────────────────────┘
```

### Data Flow: Voice → Page Navigation

```
1.  Parent app calls:  nav.sendAudio(blob, "hi")
2.  SDK POSTs:         FormData { audio, platformId, sessionId, lang }
                       → POST http://localhost:4000/api/query
3.  Pipeline stage 1:  validateInput  (platformId, sessionId, lang)
4.  Pipeline stage 2:  transcribeAudio
                       → POST http://localhost:8000/transcribe (audio blob)
                       ← { text: "गेहूं का भाव बताओ", language: "hi" }
5.  Pipeline stage 3:  extractIntent
                       → POST http://localhost:11434/api/chat
                          (text + conversation history + JSON Schema as format)
                       ← { intent: "market_price", entities: { crop: "wheat" } }
6.  Pipeline stage 4:  processNavigation
                       → intentRegistry.resolve("crop_doctor", "market_price")
                       → confidenceFilter.scoreConfidence(intent, transcript, reg)
                       → score ≥ threshold → assemble NavigationCommand
                       → eventBus.emit(NAVIGATION_COMMAND, command)
7.  WebSocket server:  broadcast command to all WS clients for this sessionId
8.  SDK receives:      NavigationCommand over WS
9.  SDK fires:         onNavigate("/market", { crop: "wheat" })
10. Platform runs:     window.location.href = "/market?crop=wheat"
```

---

## 2. Component Deep-Dive

### 2.1 STT Microservice

**File**: `stt-service/main.py`  
**Runtime**: Python 3.10+ · FastAPI · Uvicorn  
**Port**: 8000

#### Model

`AI4Bharat/indic-conformer-600m-multilingual` — loaded once at startup into memory. The ONNX variant is used for CPU-optimized inference. Model weights: ~600M parameters (~1–2 GB download from HuggingFace on first run).

#### Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/transcribe` | POST | Accepts `multipart/form-data` with `audio` + `lang` fields. Returns transcribed text. |
| `/health` | GET | Returns model load status + supported language list. |

#### Audio handling

Audio is decoded via a direct `ffmpeg` subprocess pipe (bundled via `imageio-ffmpeg` — no system install needed). Accepts `webm`, `ogg`, `mp4`, `wav`, and more. The decoded stream is resampled to **16kHz mono** before passing to the model.

#### Response shape

```json
{
  "text": "गेहूं का भाव बताओ",
  "language": "hi",
  "duration_seconds": 2.3,
  "latency_ms": 640
}
```

#### Error cases

| Error | HTTP status | Cause |
|---|---|---|
| `audio_too_short` | 422 | Audio < 0.5 seconds |
| `audio_too_long` | 422 | Audio > 30 seconds |
| `missing_file` | 422 | No `audio` field in request |
| `inference_error` | 500 | Model inference failed |

---

### 2.2 Navigation Engine

**Directory**: `server/src/`  
**Runtime**: Node.js 20+ · Express · TypeScript (tsx, no compile step)  
**Port**: 4000

The engine is composed of five independent subsystems wired together by the Middleware Pipeline.

#### 2.2.1 Finite State Machine — `engine/fsm.ts`

Each conversation session gets its own `ConversationFSM` instance, keyed by `sessionId`. The FSM prevents invalid pipeline transitions and emits state-change events to the EventBus for logging.

```
IDLE ──────────────────► LISTENING
                              │
                              ▼
                         PROCESSING
                         /    │    \
                        /     │     \
                       ▼      ▼      ▼
                 NAVIGATING CLARIFYING ERROR
                       │      │        │
                       └──────┴────────┘
                              │
                              ▼
                             IDLE
```

Valid transitions — any not in this list throws an error:

| From | To |
|---|---|
| `IDLE` | `LISTENING` |
| `LISTENING` | `PROCESSING` |
| `PROCESSING` | `NAVIGATING` \| `CLARIFYING` \| `ERROR` |
| `CLARIFYING` | `PROCESSING` \| `IDLE` |
| `NAVIGATING` | `IDLE` |
| `ERROR` | `IDLE` |

#### 2.2.2 Intent Registry — `engine/intentRegistry.ts`

An in-memory `Map<platformId, PlatformRegistration>` that stores all intent→command mappings for every integrated platform. Two platforms ship as built-in defaults:
- `demo_platform` — used by the bundled SDK demo at `localhost:4000/demo`
- `crop_doctor` — the reference agricultural platform integration

**Resolving an intent:**
```typescript
intentRegistry.resolve("crop_doctor", "market_price")
// → IntentRegistration { command: { type: "NAVIGATE", route: "/market" }, … }
```

#### 2.2.3 Confidence Filter — `engine/confidenceFilter.ts`

Since Ollama's grammar-constrained JSON output doesn't include log-probabilities, a proxy confidence score is calculated:

| Factor | Effect on score |
|---|---|
| Base score for any recognized intent | +0.80 |
| All required entities present | up to +0.15 |
| No required entities (intent has none) | +0.10 |
| Transcript shorter than 5 characters | −0.20 |
| Intent is `"unsupported"` | Score = 0.0 (always) |

If `score < threshold` (per-intent `confidenceMin`, defaulting to `0.70`), the filter emits a `CLARIFY` command instead of `NAVIGATE`.

#### 2.2.4 Navigation Engine — `engine/navigationEngine.ts`

The central orchestrator that connects all engine subsystems. Receives a validated `AgriIntent` from the LLM and:

1. Resolves the intent against the Intent Registry
2. Scores confidence via the Confidence Filter
3. On **pass**: merges dynamic entities into the command's `params`, transitions FSM to `NAVIGATING`, emits `NavigationCommand` on the EventBus
4. On **fail**: transitions FSM to `CLARIFYING`, emits a `CLARIFY` command instead

#### 2.2.5 WebSocket Server — `wsServer.ts`

Wraps the Node.js `http.Server` to accept WebSocket upgrades. Each connected SDK client sends its `sessionId` and `platformId` as URL query params:

```
ws://localhost:4000?sessionId=sdk_1234_abc&platformId=crop_doctor
```

The WS server maintains a `Map<sessionId, WebSocket>` of connected clients, listens to the EventBus for `NAVIGATION_COMMAND` events, and pushes the JSON payload to the matching client socket.

---

### 2.3 SDK / Connector

**Directory**: `sdk/src/`  
**Class**: `IntLLM` (in `AgriNavSDK.ts`)

The SDK is a ~200-line TypeScript class with zero runtime dependencies. It never talks directly to the LLM or STT service — only to the Navigation Engine.

#### Connection model

```
                    ┌──── IntLLM instance ────────────────┐
  sendAudio(blob)   │                                      │
  ──────────────►   │  HTTP POST /api/query ──────────►   │
                    │         (audio + metadata)           │
                    │                                      │
                    │  WS ws://localhost:4000 ◄────────►   │  ← real-time push
                    │     receives NavigationCommand       │
                    │                                      │
  onNavigate(route) │  ◄─────────────────────────────     │
  ◄──────────────   │                                      │
                    └──────────────────────────────────────┘
```

> **Why HTTP for audio?** Audio blobs sent as `multipart/form-data` are much better suited to HTTP than WebSocket framing (binary framing overhead, no backpressure). The WebSocket is used exclusively for **receiving** pushed `NavigationCommand` objects.

#### `WSClient` — `wsClient.ts`

The `IntLLM` class delegates all WebSocket lifecycle management to `WSClient`, which provides:

| Feature | Detail |
|---|---|
| **Exponential backoff reconnect** | Starts at 1s, doubles on each failure, caps at 16s |
| **Heartbeat ping** | Every 30 seconds to prevent proxy/load-balancer timeouts |
| **Message queue** | Messages sent while disconnected are queued and flushed on reconnect |
| **Clean teardown** | `destroyed` flag prevents reconnect after `sdk.disconnect()` |

---

## 3. API Reference

All endpoints are on the Navigation Engine at `http://localhost:4000`.

---

### `POST /api/query`

The main pipeline endpoint. Accepts an audio file and returns a `NavigationCommand`.

**Request** — `multipart/form-data`:

| Field | Type | Required | Description |
|---|---|---|---|
| `audio` | File | ✅ | Audio recording. Accepts webm, ogg, wav, mp4. Max 10MB. |
| `platformId` | string | ✅ | Must match a registered platform ID (e.g. `"demo_platform"`). |
| `sessionId` | string | recommended | Used for FSM state isolation and WS routing. Auto-generated if absent. |
| `lang` | string | no | BCP-47 language code (default: `"hi"`). Passed to STT service. |
| `history` | JSON string | no | Array of `{ userText, intent }` objects (last 3 turns for LLM context). |

**Success response** — `200 OK`:
```json
{
  "success": true,
  "transcript": "गेहूं का भाव बताओ",
  "command": {
    "command": { "type": "NAVIGATE", "route": "/market", "params": { "crop": "wheat" } },
    "intent": "market_price",
    "confidence": 0.9,
    "transcript": "गेहूं का भाव बताओ",
    "language": "hi",
    "platformId": "demo_platform",
    "sessionId": "sdk_1720831234_xk9f2",
    "timestamp": "2026-07-13T17:30:00.000Z",
    "processingMs": 4704
  }
}
```

**Error response** — `400` or `500`:
```json
{
  "success": false,
  "stage": "stt",
  "error": "STT service unreachable: fetch failed"
}
```

**Pipeline stages** (visible in `stage` field on errors):

| Stage | Description |
|---|---|
| `validateInput` | Missing/empty platformId or audio buffer |
| `stt` | STT service returned an error or is unreachable |
| `intentExtraction` | Ollama returned an error or is unreachable |
| `navigation` | Intent registry / confidence filter failure |

---

### `GET /api/health`

Returns the live health status of all downstream services.

**Response** — `200 OK` if all services are up, `503` if any are down:
```json
{
  "status": "ok",
  "services": {
    "stt":    { "ok": true },
    "ollama": { "ok": true }
  },
  "platforms": ["demo_platform", "crop_doctor"]
}
```

---

### `POST /api/register`

Registers a new platform with its intent→command mappings. Call this once at your app's startup before accepting user queries.

**Request body** — `application/json`:
```json
{
  "platformId":   "my_platform",
  "displayName":  "My App",
  "baseUrl":      "http://localhost:3000",
  "intents": [
    {
      "intentName":       "weather",
      "platformId":       "my_platform",
      "description":      "Open weather page",
      "command":          { "type": "NAVIGATE", "route": "/weather" },
      "examplePhrases":   ["what's the weather", "show forecast"],
      "requiredEntities": [],
      "confidenceMin":    0.75
    }
  ]
}
```

**Supported `command.type` values:**

| Type | Required fields | SDK callback triggered |
|---|---|---|
| `NAVIGATE` | `route: string`, `params?: Record<string,string>` | `onNavigate(route, params)` |
| `ACTION` | `action: string`, `payload?: Record<string,unknown>` | `onAction(action, payload)` |
| `FALLBACK` | `message: string` | `onFallback(message)` |
| `CLARIFY` | `message: string`, `suggestions: string[]` | `onClarify(message, suggestions)` |

**Success response:**
```json
{ "success": true, "message": "Platform 'my_platform' registered with 3 intents" }
```

---

### WebSocket `ws://localhost:4000`

Connect with query params: `?sessionId=YOUR_SESSION&platformId=YOUR_PLATFORM`

The server pushes a `NavigationCommand` JSON object after every successful `/api/query`. The SDK handles this automatically.

**Message format** (same shape as `command` in the `/api/query` response):
```json
{
  "command": { "type": "NAVIGATE", "route": "/weather" },
  "intent": "weather",
  "confidence": 0.9,
  "transcript": "aaj ka mausam",
  "language": "hi",
  "platformId": "my_platform",
  "sessionId": "sdk_123_abc",
  "timestamp": "2026-07-13T17:30:00.000Z",
  "processingMs": 2100
}
```

---

## 4. SDK Public API Reference

### `class IntLLM`

The sole public class. Import from `sdk/src/AgriNavSDK.ts`.

```typescript
import { IntLLM } from "./sdk/AgriNavSDK";
const nav = new IntLLM(config);
```

---

### `IntLLMConfig`

All constructor options. Only `serverUrl`, `platformId`, and `onNavigate` are required.

```typescript
type IntLLMConfig = {
  // ── Required ─────────────────────────────────────────────────
  serverUrl:  string;   // e.g. "ws://localhost:4000"
  platformId: string;   // must match a registered platform

  // The primary callback — receives route + optional URL params
  onNavigate: (route: string, params?: Record<string, string>) => void;

  // ── Optional but recommended ───────────────────────────────────
  sessionId?: string;   // auto-generated UUID if not provided
  lang?:      string;   // default "hi". BCP-47 language code.

  // ── Optional callbacks ─────────────────────────────────────────
  onAction?:       (action: string, payload?: Record<string, unknown>) => void;
  onClarify?:      (message: string, suggestions: string[]) => void;
  onFallback?:     (message: string) => void;
  onConnected?:    () => void;
  onDisconnected?: () => void;
  onCommand?:      (command: NavigationCommand) => void; // fires before all other callbacks
  onProcessing?:   () => void;  // pipeline started
  onIdle?:         () => void;  // pipeline finished (success or failure)
};
```

---

### Public Methods

#### `nav.sendAudio(audioBlob: Blob, lang?: string): Promise<void>`

Sends a recorded audio blob to the pipeline. POSTed as `multipart/form-data` to `/api/query`. The resulting `NavigationCommand` fires the appropriate callback.

```typescript
// Example: send after MediaRecorder stops
mediaRecorder.onstop = async () => {
  const blob = new Blob(chunks, { type: "audio/webm" });
  await nav.sendAudio(blob, "hi");
};
```

> **Guard**: if a query is already processing, `sendAudio` is a no-op. Wait for `onIdle` before sending the next query.

---

#### `nav.sendText(text: string, lang?: string): Promise<void>`

Convenience method for text-only queries (no microphone). Encodes the text as a `text/plain` Blob and sends it through the same pipeline.

```typescript
await nav.sendText("show wheat prices", "en");
```

---

#### `nav.disconnect(): void`

Cleanly shuts down the WebSocket connection and stops all reconnect attempts. Call this on page unload.

```typescript
// Vanilla JS
window.addEventListener("beforeunload", () => nav.disconnect());

// React
useEffect(() => { return () => nav.disconnect(); }, []);
```

---

#### `nav.getState(): SDKState`

Returns the current connection/processing state.

```typescript
type SDKState = "disconnected" | "connecting" | "connected" | "processing";
```

---

#### `nav.getSessionId(): string`

Returns the session ID (auto-generated or provided in config). Use this to correlate client-side logs with server-side console output.

---

### Exported Types

All types are re-exported from `AgriNavSDK.ts` — parent apps only need one import:

```typescript
import { IntLLM } from "./sdk/AgriNavSDK";
import type {
  IntLLMConfig,
  NavigationCommand,
  NavigatePayload,
  ActionPayload,
  ClarifyPayload,
  FallbackPayload,
  CommandPayload,
  SDKState,
} from "./sdk/AgriNavSDK";
```

---

## 5. Design Patterns

Six established patterns are used. Each lives in its own file, named and documented for easy identification.

### 5.1 Middleware Pipeline — `server/src/middleware/pipeline.ts`

**What**: A chain of functions (stages) where each stage enriches a shared `PipelineContext` object. Any stage can short-circuit by setting `context.error`.

**Why**: The audio → STT → LLM → engine flow is naturally sequential with shared state. A pipeline makes it trivial to add, remove, or reorder stages (e.g. adding a caching stage between STT and LLM).

```typescript
const STAGES: Stage[] = [
  validateInput,      // Stage 1: check inputs
  transcribeStage,    // Stage 2: audio → text (STT)
  extractIntentStage, // Stage 3: text → intent (LLM)
  navigationStage,    // Stage 4: intent → command (engine)
];
```

### 5.2 Finite State Machine — `server/src/engine/fsm.ts`

**What**: Enforces that a conversation session progresses through a well-defined set of states, with only valid transitions allowed.

**Why**: Without an FSM, race conditions could cause nonsensical sequences (e.g. a navigation command emitted while still transcribing). The FSM makes invalid states impossible by construction.

### 5.3 Command Pattern — `server/src/patterns/commandPattern.ts`

**What**: Encapsulates an action as an object (`NavigationCommand`) that can be serialized, logged, and replayed independently of the code that executes it.

**Why**: The Navigation Engine doesn't know or care what the parent platform will _do_ with a `NAVIGATE /weather` command. The Command Pattern decouples the engine (emitter) from the SDK (executor).

### 5.4 Observer / Event Bus — `server/src/patterns/eventBus.ts`

**What**: A decoupled publish/subscribe system. Components emit named events; other components subscribe without knowing who else is listening.

**Why**: The Navigation Engine, WebSocket Server, and logging layer all need to react to `NAVIGATION_COMMAND` events. Without an EventBus, the engine would need direct references to all consumers.

```typescript
// Engine (publisher) — knows nothing about WebSocket or logging
eventBus.emit(EVENTS.NAVIGATION_COMMAND, command);

// WS Server (subscriber) — knows nothing about the engine internals
eventBus.on(EVENTS.NAVIGATION_COMMAND, (cmd) => broadcastToSession(cmd));
```

### 5.5 Repository Pattern — `server/src/engine/intentRegistry.ts`

**What**: Abstracts the storage layer behind a clean interface. `IntentRegistry` exposes `registerPlatform`, `resolve`, `getAllIntents`, `getPlatformIds` — callers don't know it's a `Map` in memory.

**Why**: Today the registry is in-memory. A production system would swap the backing store to Redis or a database without changing any callers.

### 5.6 Strategy Pattern — `server/src/engine/confidenceFilter.ts`

**What**: Defines a family of interchangeable scoring algorithms behind a common interface (`scoreConfidence`). The caller (`applyConfidenceFilter`) doesn't know which strategy is in use.

**Why**: Today confidence is scored via a keyword heuristic. The strategy pattern makes it trivial to swap in cosine similarity against example phrases, or LLM log-probability scoring, without touching any other code.

---

## 6. Performance

Measured on a CPU-only machine (Intel Core i5, no GPU), using `llama3.1:8b` and IndicConformer-600M ONNX.

### Per-stage latency

| Stage | Measurement method | Avg latency |
|---|---|---|
| **STT** (IndicConformer ONNX, CPU) | `latency_ms` field in STT response | ~500–800ms |
| **Intent extraction** (llama3.1:8b, Ollama) | timed in `extractIntent()` | ~1,000–3,000ms |
| **Engine + routing** | `Date.now() - startTimeMs` post-pipeline | < 10ms |
| **End-to-end total** | `processingMs` field in NavigationCommand | **~1,500–4,700ms** |

### Real observed results

| Query | Intent | Total (ms) |
|---|---|---|
| `"गेहूं का भाव बताओ"` (live demo run) | market_price | **4,704ms** |
| Phase 1 test suite average (20 queries, text-only) | mixed | **1,550ms** |

> **Cold vs. warm**: The first query after `uvicorn` starts takes 3–5s because the IndicConformer model is paged into RAM. Subsequent queries on warm models are consistently under 2s.
>
> Run `tests/benchmark.ts` for automated per-stage measurement across 20 queries:
> ```bash
> # Requires all 3 services running
> npx tsx tests/benchmark.ts
> ```

### Hardware requirements

| Component | Minimum | Recommended |
|---|---|---|
| RAM | 8 GB | 16 GB |
| CPU | Any modern x86-64 | 8+ cores (faster Ollama inference) |
| GPU | Not required | NVIDIA with CUDA (5–10× faster STT + LLM) |
| Disk | 8 GB free | 15 GB (models + node_modules + venv) |

---

## 7. Folder Structure

```
inteLLm/
│
├── README.md                        Navigation hub — quick start + all key links
├── DEVELOPER.md                     THIS FILE — full developer reference
├── PROJECT_ARCHITECTURE.md          Original architecture overview
├── tracker.md                       Phase-by-phase build progress
├── package.json                     Root — npm test runs Phase 1 test suite
├── .gitignore
│
├── src/                             Phase 1 — Intent Extraction Pipeline
│   ├── intentSchemas.ts             TypeScript union types + JSON Schema + few-shot prompt
│   ├── intentExtractor.ts           Ollama caller + grammar-constrained decoding + validator
│   ├── adapters.ts                  Mock adapters for all 5 intent types
│   ├── router.ts                    Intent → adapter switch (exhaustiveness checked)
│   └── tsconfig.json
│
├── tests/
│   ├── runPipeline.ts               Phase 1: 20-query accuracy test suite (npm test)
│   └── benchmark.ts                 Phase 5/6: End-to-end latency benchmark script
│
├── stt-service/                     Phase 2 — Python FastAPI STT Microservice
│   ├── main.py                      FastAPI app: POST /transcribe, GET /health
│   ├── requirements.txt             Pinned Python dependencies
│   └── README.md                    STT service setup + API docs
│
├── server/                          Phase 3 — Navigation Engine (Node.js)
│   ├── package.json                 express, multer, ws, tsx
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                 Express + HTTP server entry point (port 4000)
│       ├── wsServer.ts              WebSocket server — EventBus → SDK clients
│       │
│       ├── middleware/
│       │   └── pipeline.ts          Middleware Pipeline: 4 sequential stages
│       │
│       ├── engine/
│       │   ├── fsm.ts               FSM: per-session conversation state machine
│       │   ├── intentRegistry.ts    Repository: platform intent → command store
│       │   ├── confidenceFilter.ts  Strategy: proxy confidence scorer
│       │   └── navigationEngine.ts  Orchestrator: FSM + Registry + Filter → Command
│       │
│       ├── patterns/
│       │   ├── commandPattern.ts    Command types (NavigationCommand, NAVIGATE, etc.)
│       │   └── eventBus.ts          Observer: typed Node.js EventEmitter
│       │
│       ├── services/
│       │   ├── sttService.ts        HTTP client for STT microservice (:8000)
│       │   └── intentService.ts     HTTP client for Ollama (:11434)
│       │
│       └── routes/
│           └── query.ts             Express routes: /api/query, /api/health, /api/register
│
└── sdk/                             Phase 4 — Embeddable JS Connector
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── AgriNavSDK.ts            IntLLM class — the entire public API surface
    │   ├── wsClient.ts              WSClient — connection + reconnect lifecycle
    │   └── types.ts                 Public TypeScript types (NavigationCommand, etc.)
    └── demo/
        └── index.html               Full demo: mic, pipeline log, WS status, perf panel
```

---

## 8. Known Limitations & Future Work

### Current Limitations

| Limitation | Detail |
|---|---|
| **Mock adapters only** | All data (weather, prices, disease info) is hardcoded. Real API integration is out of scope for this build. |
| **Local-only deployment** | All services run on localhost. No production deployment, reverse proxy, or SSL configured. |
| **Single user per session** | No authentication or multi-tenancy. |
| **Short queries only** | Optimized for queries under 10 seconds of audio. Longer recordings degrade STT accuracy. |
| **5 built-in intent types** | Adding a new intent requires modifying the Ollama prompt schema and TypeScript types in both `src/` and `server/src/phase1/`. |
| **CPU-only inference** | No CUDA/GPU path configured. STT + LLM pipeline is significantly slower on CPU than GPU. |
| **Proxy confidence scoring** | The confidence score is a keyword heuristic, not true log-probability from the LLM. |
| **No conversation memory persistence** | Session history is in-memory. A server restart clears all sessions. |

### Potential Future Improvements

- **Live API integration** — Connect `weatherAdapter()` to Open-Meteo and `marketPriceAdapter()` to Agmarknet / data.gov.in. Change `source: "mock"` → `source: "live"` in adapters.
- **GPU inference** — Add CUDA device selection in `stt-service/main.py` and configure Ollama GPU layers.
- **Semantic confidence scoring** — Replace the heuristic with cosine similarity against `examplePhrases` using a sentence-transformer model.
- **Session persistence** — Store FSM state + conversation history in Redis for multi-instance and crash-recovery support.
- **Intent fine-tuning** — Fine-tune a smaller LLM (Phi-3, Gemma-2B) on agricultural queries for better multilingual accuracy at lower latency.
- **Docker Compose** — Package all 3 services into a `docker-compose.yml` for one-command setup.
- **IndicWhisper fallback** — Route low-confidence STT results to IndicWhisper for a second-pass attempt.
