// ============================================================
//  STT SERVICE
//  Calls the Python IndicConformer FastAPI service at :8000
//  Accepts a Buffer of audio bytes, returns transcribed text.
// ============================================================

const STT_URL = process.env.STT_URL ?? "http://localhost:8000";

export type STTResult =
  | { success: true;  text: string; language: string; durationSeconds: number; latencyMs: number }
  | { success: false; error: string };

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename:    string,
  lang:        string = "hi"
): Promise<STTResult> {
  const t0 = Date.now();

  try {
    // Build multipart form — same format as curl.exe test
    const formData = new FormData();
    formData.append("audio", new Blob([audioBuffer as unknown as ArrayBuffer]), filename);
    formData.append("lang", lang);

    const response = await fetch(`${STT_URL}/transcribe`, {
      method: "POST",
      body:   formData,
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `STT service HTTP ${response.status}: ${err}` };
    }

    const data = await response.json() as {
      text: string;
      language: string;
      duration_seconds: number;
      latency_ms: number;
      warning?: string;
    };

    return {
      success:         true,
      text:            data.text,
      language:        data.language,
      durationSeconds: data.duration_seconds,
      latencyMs:       Date.now() - t0,
    };
  } catch (err) {
    return { success: false, error: `STT service unreachable: ${String(err)}` };
  }
}

export async function checkSTTHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${STT_URL}/health`);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, error: `STT service not reachable at ${STT_URL}` };
  }
}
