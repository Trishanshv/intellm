import sys
import os
#import io
import time
import tempfile

MODEL_SNAPSHOT_PATH = os.path.expanduser(
    r"~\.cache\huggingface\hub\models--ai4bharat--indic-conformer-600m-multilingual\snapshots\e9b71b369c048e2c6b634d4c131061c34e441179"
)
sys.path.append(MODEL_SNAPSHOT_PATH)

from model_onnx import IndicASRModel
import torch
import librosa
import numpy as np
import soundfile as sf

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

#    Constants  

SAMPLE_RATE = 16000

SUPPORTED_LANGUAGES = [
    "hi", "ta", "te", "kn", "ml", "mr", "bn", "gu", "pa", "or",
    "as", "ur", "sa", "ne", "sd", "kok", "mai", "mni", "brx", "doi", "sat", "ks"
]

#    App setup  

app = FastAPI(
    title="Agri Platform STT Service",
    description="Speech-to-Text microservice using AI4Bharat IndicConformer",
    version="1.0.0"
)

# Allow requests from the Node.js orchestrator and Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

#    Model loading at startup                                   
# Loaded ONCE when uvicorn starts — never reloaded per request

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

#    Health check                                               

@app.get("/health")
def health():
    if model is None:
        return {"status": "error", "model": "not loaded"}
    return {"status": "ok", "model": "loaded", "supported_languages": SUPPORTED_LANGUAGES}

#    Transcribe endpoint                                        

@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    lang: str = Form(default="hi")
):
    # Validate language code
    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{lang}'. Supported: {SUPPORTED_LANGUAGES}"
        )

    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet. Try again in a few seconds.")

    # Read uploaded audio bytes
    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file received.")

    # Save to a temp file so librosa can read it (librosa needs a file path or file-like object, not raw bytes directly)
    suffix = os.path.splitext(audio.filename or "audio.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        # Load and resample to 16kHz mono — required by IndicConformer
        audio_array, sr = librosa.load(tmp_path, sr=SAMPLE_RATE, mono=True)
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(
            status_code=422,
            detail=f"Could not read audio file. Make sure it is a valid audio format. Error: {str(e)}"
        )
    finally:
        # Always clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # Reject clips that are too short or too long
    duration = len(audio_array) / SAMPLE_RATE
    if duration < 0.5:
        raise HTTPException(status_code=400, detail="Audio too short. Minimum 0.5 seconds.")
    if duration > 30.0:
        raise HTTPException(status_code=400, detail="Audio too long. Maximum 30 seconds.")

    # Convert
    wav_tensor = torch.tensor(audio_array).unsqueeze(0)

    # Run inference
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
