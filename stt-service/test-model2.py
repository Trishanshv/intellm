import sys
sys.path.append(r"C:\Users\trish\.cache\huggingface\hub\models--ai4bharat--indic-conformer-600m-multilingual\snapshots\e9b71b369c048e2c6b634d4c131061c34e441179")

from model_onnx import IndicASRModel
import torch

print("Loading model... (takes ~20 seconds first time)")
model = IndicASRModel.from_pretrained("ai4bharat/indic-conformer-600m-multilingual")
print("Model loaded!")

dummy_audio = torch.zeros(1, 16000)
result = model.forward(dummy_audio, lang="hi", decoding="ctc")
print(f"Test inference result: '{result}'")
print("Pipeline works!")