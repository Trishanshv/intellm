# inteLLm — Multilingual Agricultural Voice Assistant

> **Open-source · Fully offline · 22 Indian languages**  
> A microservice pipeline that turns a farmer's voice into structured, actionable agricultural intelligence — weather, mandi prices, crop disease diagnosis, and farming advisories.

---

## What is this?

**inteLLm** is a multilingual, voice-first agricultural assistant built entirely on open-source, MIT-licensed components. A farmer can speak a query in Hindi, Tamil, Bengali, Marathi, or any of the 22 officially recognized Indian languages. The system transcribes their voice, extracts a structured intent, and routes it to the right data source — all running locally, with no API keys and no usage costs.

This is a university research project demonstrating:
- **Microservice architecture** — Python STT service + Node.js orchestrator + Next.js frontend, each independently swappable
- **Grammar-constrained LLM decoding** — Ollama's token sampler is restricted to valid JSON at the token level, eliminating hallucination
- **Multilingual NLP** — AI4Bharat's IndicConformer, India's first open-source ASR covering all 22 scheduled languages (IIT Madras)
- **Adapter pattern** — mock adapters today, live APIs tomorrow, without touching the orchestrator or frontend

---

## Tech Stack

| Layer | Technology | License |
|-------|-----------|---------|
| **Speech-to-Text** | AI4Bharat IndicConformer-600M (HuggingFace + Python FastAPI) | MIT |
| **Intent LLM** | Ollama + `llama3.1:8b` or `qwen2.5:7b` (grammar-constrained JSON) | MIT / Apache 2.0 |
| **Orchestrator** | Node.js + Express | MIT |
| **Frontend** | Next.js + TypeScript + TailwindCSS | MIT |
| **State** | Zustand (last 3 conversation turns) | MIT |

---

## Architecture & Pipeline

```mermaid
flowchart TD
    U(["👤 User\nVoice or text\nHindi · Tamil · Bengali · etc."])

    subgraph FE["Next.js Frontend  (TypeScript)"]
        MR["MediaRecorder API\nCaptures audio blob"]
        ZS["Zustand Store\nHolds last 3 turns"]
    end

    subgraph ORCH["Node.js + Express  —  Orchestrator"]
        RCV["POST /api/query\nReceives audio + history"]
        COORD["Coordinates pipeline\nSTT → LLM → Router → Response"]
    end

    subgraph PY["Python FastAPI  —  STT Microservice  :8000"]
        IC["AI4Bharat IndicConformer 600M\nMIT licence · 22 Indian languages"]
    end

    subgraph OL["Ollama  —  Local LLM  :11434"]
        LM["llama3.1:8b\ngrammar-constrained JSON output\ntemperature = 0"]
    end

    subgraph ROUTER["Intent Router  (TypeScript)"]
        RT{"intent field?"}
    end

    subgraph ADAPTERS["Adapter Layer  —  swap APIs without changing platform"]
        AW["weatherAdapter()\nIMD · Open-Meteo"]
        AM["marketPriceAdapter()\nAgmarknet · data.gov.in"]
        AC["cropDiseaseAdapter()\nCrop Doctor  ← plug in later"]
        AA["advisoryAdapter()\nKVK · ICAR"]
        AF["fallbackAdapter()\nunsupported intent"]
    end

    RESP["Response Card\nstructured · language-matched"]

    U -->|"audio blob"| MR
    MR -->|"FormData + history"| RCV
    ZS -->|"last 3 turns"| RCV
    RCV --> COORD
    COORD -->|"audio blob"| IC
    IC -->|"transcribed text\nlanguage detected"| COORD
    COORD -->|"text + history\nJSON schema enforced"| LM
    LM -->|"{ intent, entities }"| COORD
    COORD --> RT
    RT -->|"weather"| AW
    RT -->|"market_price"| AM
    RT -->|"crop_disease"| AC
    RT -->|"advisory"| AA
    RT -->|"unsupported"| AF
    AW & AM & AC & AA & AF -->|"AdapterResponse"| RESP
    RESP -->|"display + store turn"| ZS

    style U fill:#f0f4ff,stroke:#6366f1,color:#1e1b4b
    style PY fill:#fef9ec,stroke:#d97706,color:#451a03
    style OL fill:#f0fdf4,stroke:#16a34a,color:#052e16
    style FE fill:#eff6ff,stroke:#2563eb,color:#1e3a5f
    style ORCH fill:#fdf4ff,stroke:#9333ea,color:#3b0764
    style ROUTER fill:#fdf4ff,stroke:#9333ea,color:#3b0764
    style ADAPTERS fill:#f0fdf4,stroke:#16a34a,color:#052e16
    style RESP fill:#f0f4ff,stroke:#6366f1,color:#1e1b4b
```

### How the pipeline flows

1. **User speaks** (or types) in any Indian language. The browser's `MediaRecorder` captures a raw audio blob.
2. **Frontend** sends `FormData` (audio + last 3 conversation turns) to `POST /api/query` on the Express orchestrator.
3. **Orchestrator** forwards the audio blob to the **Python STT microservice** (`localhost:8000`).
4. **IndicConformer-600M** transcribes the audio and returns `{ text, language }`.
5. **Orchestrator** sends the text + conversation history to **Ollama** (`localhost:11434`) with a JSON Schema as the `format` field — this activates grammar-constrained decoding.
6. **Ollama** runs `llama3.1:8b` at temperature 0 and is physically constrained to output only tokens that continue a valid JSON document matching the schema. It returns `{ intent, entities }`.
7. **Intent Router** matches the `intent` field to the correct adapter function.
8. **Adapter** returns an `AdapterResponse` with structured data and a human-readable `display` string.
9. **Frontend** renders the Response Card and stores the turn in Zustand for the next query's context.

---

## Project Structure

```
inteLLm/
├── src/
│   ├── intentSchemas.ts    ← TypeScript types + JSON Schema + few-shot system prompt
│   ├── intentExtractor.ts  ← Calls Ollama, enforces schema, validates output, returns AgriIntent
│   ├── adapters.ts         ← Mock responses for each intent (swap for real APIs later)
│   ├── router.ts           ← Maps intent → correct adapter
│   └── tsconfig.json
├── tests/
│   └── runPipeline.ts      ← 20-query test suite (Hindi + English + Hinglish + edge cases)
├── stt-service/            ← Python FastAPI STT microservice
│   └── main.py             ← Change HuggingFace model here (see How to Run)
├── server/                 ← Express orchestrator + WebSocket server
│   └── src/
│       ├── index.ts        ← Change Ollama model here (see How to Run)
│       └── services/intentService.ts
├── sdk/                    ← Embeddable JS connector SDK
│   └── demo/index.html     ← Open at http://localhost:4000/demo
├── tracker.md              ← Build progress & what's left
├── PROJECT_ARCHITECTURE.md ← Full architecture reference
└── package.json
```

---

## How to Run — Full Stack (Phases 1–4, working now)

The full pipeline needs **3 terminals** running simultaneously.

### Prerequisites

| Tool | Version | Install |
|------|---------|--------|
| Node.js | v20+ | https://nodejs.org |
| Python | 3.10+ | https://python.org |
| Ollama | latest | https://ollama.com |

---

### Step 1 — Pull the LLM (one time)

```bash
# Pull the default model (~4.7 GB)
ollama pull llama3.1:8b
```

> **Want to change the model?** Open [`server/src/services/intentService.ts`](./server/src/services/intentService.ts) and look for the `model:` field near the top. Change `"llama3.1:8b"` to any model you've pulled locally (e.g. `"qwen2.5:7b"`, `"llama3.2:3b"`).
>
> Low-spec machine? `llama3.2:3b` (~2 GB) is faster. `qwen2.5:7b` gives better multilingual accuracy for Indian languages.

---

### Step 2 — Set up the STT service (one time)

```bash
cd stt-service

# Activate the virtual environment (create it first if needed)
python -m venv ../venv
..\ venv\Scripts\Activate.ps1    # Windows PowerShell
# source ../venv/bin/activate    # Mac / Linux

pip install -r requirements.txt
```

On first run, the AI4Bharat IndicConformer model (~1–2 GB) will be downloaded from HuggingFace automatically.

> **Want to change the STT model?** Open [`stt-service/main.py`](./stt-service/main.py) and find:
> ```python
> model = IndicASRModel.from_pretrained("ai4bharat/indic-conformer-600m-multilingual")
> ```
> Replace the model ID with any compatible HuggingFace model. The 600M param ONNX variant is used here for speed on CPU.

---

### Step 3 — Install server dependencies (one time)

```bash
cd server
npm install
```

---

### Running the stack

Open **3 terminals** and run one command in each:

```bash
# Terminal 1 — Ollama (the LLM brain)
ollama serve

# Terminal 2 — STT service (speech-to-text)
cd stt-service
..\ venv\Scripts\Activate.ps1    # activate venv first
uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 3 — Navigation engine + SDK demo server
cd server
npm run dev
```

Then open **Chrome** (not Firefox — mic access is more reliable) and go to:

```
http://localhost:4000/demo/index.html
```

Click the mic button, speak in Hindi or any Indian language, and watch the page navigate automatically.

---

### How to Run — Phase 1 only (Intent Pipeline, no audio)

If you just want to test the intent extraction without audio:

```bash
# Requires only: ollama serve running
npm install
npm test
```

Expected output:
```
✓ Ollama running · model: llama3.1:8b

  आज का मौसम कैसा रहेगा?                    ✓ [weather]       843ms
  गेहूं का भाव बताओ                          ✓ [market_price]  731ms
  ...

  Total: 20 · Passed: 20 · Accuracy: 100.0% · Avg latency: 1550ms
```

---

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3.1:8b` | Model to use for intent extraction |
| `STT_URL` | `http://localhost:8000` | STT microservice URL |

---

## How Grammar-Constrained Decoding Works

This is the core technical contribution of the project. Instead of just prompting the LLM to "return JSON", we pass a full JSON Schema as the `format` field in the Ollama API request:

```typescript
body: JSON.stringify({
  model: "llama3.1:8b",
  messages: [...],
  format: INTENT_JSON_SCHEMA,   // ← the JSON Schema object, not just "json"
  options: { temperature: 0 },
})
```

Passing a JSON Schema (not just the string `"json"`) tells Ollama's token sampler to only ever emit tokens that are valid continuations of a document matching that schema. At token generation time, the sampler masks all tokens that would violate the schema. The model **cannot** produce `{"intent":"weather"} Here is the weather:` — the extra text is impossible given the grammar.

This is enforced at the **token level**, not the prompt level. It's not just an instruction the model might ignore — it's a hard constraint on what can be sampled.

---

## Adding a New Intent

Example: adding `soil_test`.

**1.** Add the TypeScript type in `src/intentSchemas.ts`:
```typescript
export type SoilTestIntent = {
  intent: "soil_test";
  entities: { location?: string; crop?: string };
};
```

**2.** Add to the `AgriIntent` union and the `enum` in `INTENT_JSON_SCHEMA`:
```typescript
enum: ["weather", "market_price", "crop_disease", "advisory", "soil_test", "unsupported"]
```

**3.** Add few-shot examples to `INTENT_SYSTEM_PROMPT`:
```
Input: "मेरी मिट्टी की जांच कहां होगी?"
Output: {"intent":"soil_test","entities":{"location":"local KVK"}}
```

**4.** Add an adapter function in `src/adapters.ts`.

**5.** Add a `case` in `src/router.ts`.

---

## Supported Intents

| Intent | Example query | Entities extracted |
|--------|-------------|-------------------|
| `weather` | "आज का मौसम कैसा रहेगा?" | `location`, `crop`, `timeframe` |
| `market_price` | "दिल्ली में गेहूं का भाव बताओ" | `crop`, `market`, `state` |
| `crop_disease` | "My tomato leaves are turning yellow" | `crop`, `symptom` |
| `advisory` | "धान की बुवाई कब करें?" | `crop`, `topic` |
| `unsupported` | "How do I fix my tractor engine?" | `message` (human-readable) |

---

## Supported Languages (Phase 2 onwards)

All 22 officially recognized Indian languages via AI4Bharat IndicConformer-600M:

Hindi · Tamil · Telugu · Kannada · Malayalam · Marathi · Gujarati · Bengali · Punjabi · Urdu · Odia · Assamese · Maithili · Konkani · Manipuri · Nepali · Santali · Sindhi · Sanskrit · Kashmiri · Dogri · Bodo

---

## Performance

Measured on a CPU-only machine (no GPU), using `llama3.1:8b` and IndicConformer-600M ONNX.

| Stage | Avg latency |
|-------|------------|
| STT (IndicConformer-600M, ONNX, CPU) | ~500–800ms |
| Intent extraction (llama3.1:8b, Ollama) | ~1–3s |
| Engine + routing | <10ms |
| **End-to-end (speak → page navigate)** | **~1s (fast) to ~4.7s (cold)** |

**Live query example (observed):**

```
Intent:     market_price
Confidence: 90%
Total time: 4704ms
```

Average across normal queries: **~1s** once models are warm. First query after startup is slower because model weights are paged into RAM.

> Cold start (first query after `uvicorn` boots) takes 3–5s as the model loads. Subsequent queries are consistently ~1s.

---

## Why Split Architecture? STT + LLM vs. One Model for Both

One obvious question: *why not just use a single large LLM for both speech-to-text and intent extraction?*

### What this project does

```
Audio → [IndicConformer 600M] → text → [llama3.1:8b] → structured intent
          ↑ specialist ASR model            ↑ specialist reasoning model
```

### What a single-LLM approach would look like

```
Audio → [Sarvam AI] → structured intent
         one model handles everything
```

### Why the split wins for this use case

| Dimension | Split (this project) | Single LLM |
|-----------|---------------------|------------|
| **Multilingual ASR** | IndicConformer is purpose-built for 22 Indian languages, trained on 10,000+ hours of Indian speech data | General-purpose audio LLMs are primarily trained on English and European languages — Indian language accuracy drops significantly |
| **Fully offline** | Both models run locally with no API calls | Most capable audio LLMs require cloud APIs — adds cost, latency, and data privacy risk |
| **Latency** | Each model is small and specialized (~600M + 8B params) | A single model capable of both tasks would need to be much larger (70B+ range) to match quality — much slower on CPU |
| **Replaceability** | Swap the STT model independently (e.g. Whisper-large for English-heavy use) without changing the LLM, or swap the LLM without touching STT | Changing one aspect means swapping the entire model |
| **Cost** | Runs free, forever, on any laptop | Cloud audio LLMs cost per minute of audio |

### Where a single LLM would be better

- **Simpler deployment** — one model to download, one service to run
- **Better for English** — outperform this stack on English-only queries
- **Less engineering** — no inter-service HTTP calls, no format conversion
- **Conversational context** — a single model can naturally connect what it heard to what it understood, potentially better at accent-heavy speech where the "text" intermediate step loses nuance

The split architecture uses **the best specialist for each job** rather than a generalist that's mediocre at both.

---

## Build Progress

See [`tracker.md`](./tracker.md) for the full phase-by-phase progress tracker with detailed checklists.

---

## Academic Value

| Criterion | Status |
|-----------|--------|
| Fully open-source (MIT/Apache 2.0) | ✅ |
| Microservice architecture | ✅ |
| Multilingual NLP (22 Indian languages) | ✅ |
| Grammar-constrained decoding (novel technique) | ✅ |
| IIT Madras-backed ASR model | ✅ |
| No API costs / fully offline | ✅ |

---

## License

MIT — see `LICENSE` file.

**Model licences:**
- IndicConformer-600M: MIT (AI4Bharat / IIT Madras)
- Llama 3.1: Meta Llama 3.1 Community License (free for research)
- Qwen2.5: Apache 2.0
