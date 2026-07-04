import sounddevice as sd
import soundfile as sf
import numpy as np

DURATION = 5
SAMPLE_RATE = 16000

print("Recording for 5 sec... speak now!")
audio = sd.rec(int(DURATION * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype='float32')
sd.wait()
print("Done recording!")

sf.write("test.wav", audio, SAMPLE_RATE)
print("Saved as test.wav")