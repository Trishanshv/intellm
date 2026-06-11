# STT Microservice — Phase 2

Speech-to-Text microservice using **AI4Bharat IndicConformer-600M** wrapped in a FastAPI server.

Supports **22 Indian languages**: Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, Assamese, Urdu, Sanskrit, Nepali, Sindhi, Konkani, Maithili, Manipuri, Bodo, Dogri, Santali, Kashmiri.

## Quick Start

### Prerequisites

- Python 3.11+ with `venv` activated
- Dependencies installed: `pip install -r requirements.txt`
- GPU (optional but recommended): NVIDIA GPU with CUDA 13.2+ for faster inference

### Run the Server

```bash
# From the project root, activate venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Navigate to stt-service
cd stt-service

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server will be available at `http://localhost:8000`.

### Test the Server

**Option 1: Interactive API docs**
```
http://localhost:8000/docs
```
Use the Swagger UI to test endpoints interactively.

**Option 2: Health check**
```bash
curl http://localhost:8000/health
```

**Option 3: End-to-end test with audio**
```bash
# If you have a test.wav file:
python test-model3.py
```

**Option 4: Record and test live**
```bash
# Install sounddevice (if not already installed)
pip install sounddevice

# Record 5 seconds of audio
python reccord.py

# This creates test.wav, then test with:
python test-model3.py
```

## API Endpoints

### `POST /transcribe`

Accepts audio file and returns transcribed text.

**Request:**
```
POST /transcribe
Content-Type: multipart/form-data

Parameters:
- audio (file, required): Audio file (WAV, MP3, FLAC, OGG, etc.)
- lang (string, optional, default: "hi"): Language code (hi, ta, te, kn, ml, mr, bn, gu, pa, or, as, ur, sa, ne, sd, kok, mai, mni, brx, doi, sat, ks)
```

**Response (200 OK):**
```json
{
  "text": "नमस्ते, यह एक परीक्षण है",
  "language": "hi",
  "duration_seconds": 3.45,
  "latency_ms": 2150
}
```

**Error Responses:**
- `400`: Invalid language code or audio too short/long (<0.5s or >30s)
- `422`: Invalid audio format or corrupted file
- `500`: Inference failed (model error)
- `503`: Model not loaded yet (try again in a few seconds)

### `GET /health`

Returns server and model status.

**Response:**
```json
{
  "status": "ok",
  "model": "loaded",
  "supported_languages": ["hi", "ta", "te", "kn", "ml", ...]
}
```

## Architecture

- **Model**: `AI4Bharat/indic-conformer-600m-multilingual` (ONNX-optimized)
- **Framework**: FastAPI + Uvicorn
- **Audio Processing**: Librosa (resampling to 16kHz mono)
- **Inference**: PyTorch with ONNX Runtime (GPU/CPU fallback)
- **CORS**: Configured for localhost:3000 (frontend) and localhost:4000 (orchestrator)

## Performance

- **Model load time**: ~20–30 seconds (first run) / <1s (cached)
- **GPU inference**: 1–3 seconds per request (RTX 4050)
- **CPU inference**: 5–15 seconds per request (depends on CPU)
- **Memory usage**: ~2–3 GB (model + PyTorch overhead)

## Environment Variables

- `MODEL_ID` (optional): HuggingFace model ID (default: `ai4bharat/indic-conformer-600m-multilingual`)
- `PORT` (optional): Port to run server on (default: `8000`)

## Troubleshooting

**Model takes forever to load:**
- First load downloads ~2–3 GB from HuggingFace (slow internet will take time)
- Subsequent loads use cache (~30 seconds with GPU, longer with CPU)

**"Model not loaded yet" error:**
- Wait for the server to fully start. Check terminal output for "Model loaded successfully"

**Empty transcription result:**
- Audio might be too quiet or in an unsupported language
- Try a clearer audio sample or specify the correct language code

**CUDA out of memory:**
- Reduce batch size (not applicable here, single inference only)
- Or switch to CPU mode

## Next Steps (Phase 3)

This service will be called by the **Node.js Orchestrator** at `http://localhost:8000/transcribe` to handle audio transcription before intent extraction.

---

**Created**: June 2026  
**Model**: AI4Bharat IndicConformer-600M  
**Status**: ✅ Production-ready for Phase 3 integration
