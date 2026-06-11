import sys
sys.path.append(r"C:\Users\trish\.cache\huggingface\hub\models--ai4bharat--indic-conformer-600m-multilingual\snapshots\e9b71b369c048e2c6b634d4c131061c34e441179")

from model_onnx import IndicASRModel
import torch
import soundfile as sf
import librosa

print("Loading model...")
model = IndicASRModel.from_pretrained("ai4bharat/indic-conformer-600m-multilingual")
print("Model loaded!")

# Load and resample audio to 16kHz (required by the model)
audio, sr = librosa.load("test.wav", sr=16000, mono=True)
wav_tensor = torch.tensor(audio).unsqueeze(0)  # shape: (1, samples)

print(f"Audio duration: {len(audio)/16000:.2f}s")

result = model.forward(wav_tensor, lang="hi", decoding="ctc")
print(f"Transcription: '{result}'")