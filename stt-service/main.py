import sys
import os
import time

# ── Inject bundled ffmpeg into PATH before pydub loads ────────
# imageio_ffmpeg ships its own ffmpeg binary — no system install needed
import imageio_ffmpeg as _ioff
_ffmpeg_exe = _ioff.get_ffmpeg_exe()
_ffmpeg_dir = os.path.dirname(_ffmpeg_exe)
# Prepend to PATH so pydub subprocess can find it
os.environ["PATH"] = _ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
print(f"[STT] Using ffmpeg: {_ffmpeg_exe}")

import io
import subprocess
import numpy as np
import soundfile as sf  # must be before convert_audio

def convert_audio(audio_bytes: bytes) -> np.ndarray:
    cmd = [
        _ffmpeg_exe, "-y",
        "-i", "pipe:0",
        "-ar", "16000",
        "-ac", "1",
        "-f", "wav",
        "pipe:1"
    ]
    result = subprocess.run(cmd, input=audio_bytes, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode())
    audio_array, _ = sf.read(io.BytesIO(result.stdout))
    return audio_array.astype("float32")

MODEL_SNAPSHOT_PATH = os.path.expanduser(
    r"~\.cache\huggingface\hub\models--ai4bharat--indic-conformer-600m-multilingual\snapshots\e9b71b369c048e2c6b634d4c131061c34e441179"
)
sys.path.append(MODEL_SNAPSHOT_PATH)

from model_onnx import IndicASRModel
import torch

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ── Constants ─────────────────────────────────────────────────

SAMPLE_RATE = 16000

SUPPORTED_LANGUAGES = [
    "hi", "ta", "te", "kn", "ml", "mr", "bn", "gu", "pa", "or",
    "as", "ur", "sa", "ne", "sd", "kok", "mai", "mni", "brx", "doi", "sat", "ks"
]

# ── App setup ─────────────────────────────────────────────────

app = FastAPI(
    title="Agri Platform STT Service",
    description="Speech-to-Text microservice using AI4Bharat IndicConformer",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins during development
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Model loading at startup ──────────────────────────────────

model = None

@app.on_event("startup")
async def load_model():
    global model
    print("Loading IndicConformer model... please wait")
    try:
        model = IndicASRModel.from_pretrained("ai4bharat/indic-conformer-600m-multilingual")
        print("Model loaded successfully and ready to serve requests")
    except Exception as e:
        print(f"CRITICAL: Model failed to load: {e}")
        raise e

# ── Health check ──────────────────────────────────────────────

@app.get("/health")
def health():
    if model is None:
        return {"status": "error", "model": "not loaded"}
    return {"status": "ok", "model": "loaded", "supported_languages": SUPPORTED_LANGUAGES}

# ── Transcribe endpoint ───────────────────────────────────────

@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    lang: str = Form(default="hi")
):
    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{lang}'. Supported: {SUPPORTED_LANGUAGES}"
        )

    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet. Try again in a few seconds.")

    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file received.")

    try:
        audio_array = convert_audio(audio_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Audio conversion failed: {str(e)}")

    duration = len(audio_array) / SAMPLE_RATE
    if duration < 0.5:
        raise HTTPException(status_code=400, detail="Audio too short. Minimum 0.5 seconds.")
    if duration > 30.0:
        raise HTTPException(status_code=400, detail="Audio too long. Maximum 30 seconds.")

    wav_tensor = torch.tensor(audio_array).unsqueeze(0)

    try:
        t0 = time.time()
        transcription = model.forward(wav_tensor, lang=lang, decoding="ctc")
        latency_ms = round((time.time() - t0) * 1000)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    if not transcription or transcription.strip() == "":
        return {
            "text": "",
            "language": lang,
            "duration_seconds": round(duration, 2),
            "latency_ms": latency_ms,
            "warning": "Empty transcription — audio may be silent or unclear"
        }

    return {
        "text": transcription.strip(),
        "language": lang,
        "duration_seconds": round(duration, 2),
        "latency_ms": latency_ms
    }