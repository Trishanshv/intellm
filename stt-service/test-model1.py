from transformers import AutoProcessor, AutoModelForCTC
import torch

print("Loading processor...")
processor = AutoProcessor.from_pretrained("ai4bharat/indic-conformer-600m-multilingual")

print("Loading model...")
model = AutoModelForCTC.from_pretrained("ai4bharat/indic-conformer-600m-multilingual")

print("Model loaded successfully!")
print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")