# inteLLm Project Architecture

## Project Overview

**inteLLm** is an open-source, multilingual intent extraction pipeline designed for Indian languages. It takes audio input (in any of 22 officially recognized Indian languages), transcribes it using ASR, and then extracts structured intent data using a locally-run LLM with schema-enforced JSON output.

**Why this matters**: This is a project demonstrating microservice architecture, multilingual NLP, and grammar-constrained decoding — all using open-source, MIT-licensed components. Which can be usefull for integration in many platforms.

---

## Full Architecture Stack

| Layer | Technology | Why This Choice | License |
|-------|-----------|-----------------|---------|
| **Speech-to-Text** | AI4Bharat IndicConformer-600m (Python + HuggingFace) | First open-source ASR for all 22 Indian languages, built at IIT Madras | MIT |
| **Intent Extraction LLM** | Ollama + Llama3.1:8B or Qwen2.5:7B | Local, free, schema-enforced JSON (no hallucination), no API keys | MIT / Apache 2.0 |
| **Orchestrator** | Node.js + Express | Coordinates between STT service and frontend, lightweight HTTP gateway | MIT |
| **Frontend** | Next.js + TypeScript + TailwindCSS | Type-safe, modern, lightweight client | MIT |
| **State Management** | Zustand | Minimal, client-side session context | MIT |

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│              Next.js + TypeScript + TailwindCSS             │
│                    (Zustand for state)                       │
└────────────────────────┬──────────────────────────────────────┘
                         │ HTTP
                         │
┌────────────────────────▼──────────────────────────────────────┐
│                   Node.js + Express                           │
│              (Orchestrator / API Gateway)                     │
│         - Routes requests to microservices                    │
│         - Handles session management                         │
└────────┬───────────────────────────────┬─────────────────────┘
         │ HTTP                          │ HTTP
         │                               │
┌────────▼──────────────────┐  ┌────────▼──────────────────┐
│  Python FastAPI Service   │  │  Ollama Intent Service   │
│  (STT Microservice)       │  │  (Local LLM with Schema) │
│                           │  │                          │
│ • IndicConformer Model    │  │ • Llama3.1:8B OR         │
│ • 22 Indian Languages     │  │ • Qwen2.5:7B             │
│ • HuggingFace Model       │  │ • Grammar-Constrained    │
│ • Audio Input → Text      │  │   JSON Output            │
└───────────────────────────┘  └──────────────────────────┘

Fallback for High-Noise Audio:
• IndicWhisper (also MIT licensed by AI4Bharat)
```

---

## Data Flow Pipeline

```
1. User Input
   └─> Audio file (Hindi, Tamil, Telugu, Marathi, etc.)

2. Frontend (Next.js)
   └─> Upload audio to Express server
       └─> POST /api/transcribe

3. Express Orchestrator
   └─> Forward audio to Python STT service
       └─> POST http://localhost:5000/transcribe

4. Python FastAPI STT Service
   └─> Load IndicConformer model
       └─> Process audio
           └─> Return transcribed text (Indian language)
               └─> Return to Express

5. Express Orchestrator
   └─> Forward text to Ollama
       └─> POST http://localhost:11434/api/generate
           (with JSON schema constraint)

6. Ollama LLM Service
   └─> Run llama3.1:8B / qwen2.5:7B
       └─> Grammar-constrained decoding
           └─> Return structured JSON intent
               └─> Return to Express

7. Express Orchestrator
   └─> Return structured intent to frontend
       └─> POST response with JSON

8. Frontend (Next.js)
   └─> Display extracted intent
       └─> Update Zustand state
           └─> Render to user
```

---

## Component Breakdown

### 1. **Frontend Layer** (Next.js + TypeScript + TailwindCSS)
- **Purpose**: User interface for audio upload and intent display
- **Tech Stack**: 
  - Next.js for SSR/SSG
  - TypeScript for type safety
  - TailwindCSS for styling
  - Zustand for client-side state
- **Key Features**:
  - Audio file upload
  - Real-time transcription display
  - Intent extraction results visualization
  - Session management

### 2. **Orchestrator** (Node.js + Express)
- **Purpose**: Coordinates between frontend and microservices
- **Key Routes**:
  - `POST /api/transcribe` - Receives audio, calls STT service
  - `POST /api/extract-intent` - Receives text, calls Ollama
  - `GET /api/health` - Health check for both services
- **Why microservices?** 
  - STT needs Python (PyTorch models)
  - Intent LLM runs in Ollama (separate process)
  - Clean separation of concerns
  - Easy to scale/replace individual components

### 3. **STT Microservice** (Python + FastAPI)
- **Purpose**: Convert audio → text in Indian languages
- **Model**: AI4Bharat IndicConformer-600m
- **Supported Languages**: All 22 officially recognized Indian languages
  - Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Bengali, Punjabi, Urdu, Odia, Assamese, Maithili, Konkani, Manipuri, Nepali, Santali, Sindhi, Sanskrit, Kashmiri, Dogri, and Bodo
- **Fallback**: IndicWhisper for high-noise environments
- **Input**: Audio file (MP3, WAV, FLAC, etc.)
- **Output**: Transcribed text in original Indian language

### 4. **Intent Extraction LLM** (Ollama)
- **Purpose**: Extract structured intent from text using schema enforcement
- **Models**:
  - **llama3.1:8B** (default): ~8GB RAM, balanced performance
  - **qwen2.5:7B** (recommended for multilingual): Better at non-English languages, ~7GB RAM
- **Key Feature**: **Grammar-Constrained Decoding**
  - You define a JSON schema
  - Ollama's token sampler is restricted to tokens that form valid JSON
  - Model cannot deviate from schema at token level
  - Eliminates JSON hallucination completely
- **Example Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "confidence": { "type": "number" },
      "entities": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["intent", "confidence"]
  }
  ```
- **Input**: Transcribed text (in Indian language)
- **Output**: Structured JSON with extracted intent

---

## Known Considerations & Challenges

### 1. **Multilingual Hallucination Risk** ⚠️
**Problem**: Llama 3.1 has less training data on Indian languages vs. English. It could misunderstand Hindi/Tamil/etc. text and produce semantically wrong intents (though the JSON format will always be valid due to schema enforcement).

**Mitigation**:
- Use **Qwen2.5:7B** instead of Llama 3.1 (explicitly trained on 10+ languages)
- Validate intent outputs against a known intent vocabulary
- Test extensively with native speakers of each language
- Consider fine-tuning if accuracy is critical

### 2. **Model Size & Hardware Requirements**
- **Qwen2.5:7B**: ~7GB VRAM (comfortable on most modern laptops)
- **Llama3.1:8B**: ~8GB VRAM (similar requirement)
- If running on constrained hardware, use quantized versions (4-bit, 8-bit)

### 3. **STT Model Size**
- IndicConformer is ~600M parameters
- First load takes time (HuggingFace download + model initialization)
- Subsequent calls are much faster (model stays in memory)

### 4. **Language Ambiguity**
- If audio is in mixed languages (Hinglish, etc.), the model may struggle
- Best results with "pure" language audio

---

## Development Phases

### Phase 1: Intent Extraction Pipeline (Foundation) ✅
- Install Ollama
- Pull Qwen2.5:7B or Llama3.1:8B
- Write test script for schema-enforced intent extraction
- Verify JSON output matches schema
- **Deliverable**: Proof-of-concept Ollama pipeline

### Phase 2: STT Service (Hindi Audio Test) 🔄
- Set up Python FastAPI service
- Load IndicConformer from HuggingFace
- Test with Hindi audio clip
- Verify transcription accuracy
- **Deliverable**: Working STT microservice

### Phase 3: Wire Services Together 🔄
- Create Express orchestrator
- Connect Express → STT service
- Connect Express → Ollama
- Test end-to-end: audio → text → intent JSON
- **Deliverable**: Working microservice pipeline

### Phase 4: Frontend (Next.js) 🔄
- Build audio upload UI
- Wire frontend to Express API
- Display transcription and intent results
- Add session management with Zustand
- **Deliverable**: Full web application

### Phase 5: Polish & Scale (Optional)
- Add more language support testing
- Performance optimization
- Error handling & validation
- Deployment setup (Docker, etc.)

---

## How to Onboard a New Team Member

1. **Day 1**: Read this file and understand the overall architecture
2. **Day 2**: Set up local environment (Ollama, Python, Node.js)
3. **Day 3**: Run Phase 1 test (Ollama intent extraction)
4. **Day 4**: Run Phase 2 test (STT with IndicConformer)
5. **Day 5**: Run end-to-end pipeline with Express
6. **Week 2**: Start contributing to their assigned phase

---

## Running the Full Stack Locally

### Prerequisites
- Python 3.8+
- Node.js 18+
- Ollama 0.5.0+ (https://ollama.ai)
- 8GB+ RAM recommended

### Startup Checklist
```
1. Ollama running: ollama serve
2. STT service running: python src/stt_service.py
3. Express server running: node runPipeline.ts (or npm start)
4. Frontend running: npm run dev
```

---

## File Structure

```
inteLLm/
├── README.md                          # Quick start
├── PROJECT_ARCHITECTURE.md            # THIS FILE
├── package.json                       # Node.js dependencies
├── runPipeline.ts                     # Express orchestrator entry point
├── src/
│   ├── adapters.ts                    # Interface adapters
│   ├── intentExtractor.ts             # Intent extraction logic
│   ├── intentSchemas.ts               # JSON schemas for Ollama
│   ├── router.ts                      # Express routes
│   ├── tsconfig.json                  # TypeScript config
│   └── stt_service.py                 # (To be created) FastAPI STT
├── test/                              # Test files
└── notebook2_audio_segments.md        # Research notes
```

---

## Key Dependencies

### Node.js
- `express` - Web framework
- `typescript` - Type safety
- `axios` (or `node-fetch`) - HTTP client for calling microservices
- `zustand` - State management (frontend)
- `next` - Frontend framework

### Python
- `fastapi` - Web framework for STT service
- `transformers` - HuggingFace model loading
- `librosa` - Audio processing
- `torch` - PyTorch (for IndicConformer)

### Ollama
- Installed as standalone binary (not npm/pip)
- Downloaded models stored locally (~7GB for Qwen2.5:7B)

---

## Research & Academic Value

**Why this is a strong university project**:
1. ✅ **Open Source**: Everything MIT/Apache 2.0 licensed (no commercial restrictions)
2. ✅ **Microservices**: Demonstrates proper system design (professors love this)
3. ✅ **Multilingual**: Tackles a real research problem (Indian languages)
4. ✅ **Grammar-Constrained Decoding**: Shows advanced NLP concepts
5. ✅ **IIT Madras Backing**: IndicConformer is from IIT Madras (credibility)
6. ✅ **No API Costs**: Fully offline-capable, no vendor lock-in

---

## Questions to Discuss Before Coding

1. **Which model to prioritize?** Qwen2.5:7B (multilingual) or Llama3.1:8B (standard)?
2. **Intent vocabulary**: What are the target intents we're extracting? (e.g., "book_flight", "cancel_order", etc.)
3. **Supported languages**: Start with Hindi + one other, or test all 22?
4. **Deployment plan**: Local only, or eventual cloud deployment?
5. **Accuracy target**: How much error is acceptable for a research demo?

---

**Last Updated**: June 8, 2026  
**Author**: Team inteLLm  
**Status**: Architecture Defined, Phase 1 Ready
