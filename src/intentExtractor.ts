// ============================================================
//  AGRI PLATFORM — Ollama Intent Extractor
//  Core pipeline: text → Ollama → validated AgriIntent JSON
// ============================================================

import { AgriIntent, INTENT_JSON_SCHEMA, INTENT_SYSTEM_PROMPT } from "./intentSchemas.js";

const OLLAMA_BASE_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL ?? "llama3.1:8b";

// ── Types ─────────────────────────────────────────────────────

type OllamaMessage = { role: "system" | "user" | "assistant"; content: string };

type ConversationTurn = { userText: string; intent: AgriIntent };

type ExtractResult =
  | { success: true;  intent: AgriIntent; rawResponse: string; latencyMs: number }
  | { success: false; error: string;      rawResponse: string; latencyMs: number };

// ── Core extractor ────────────────────────────────────────────

export async function extractIntent(
  userText: string,
  history: ConversationTurn[] = []   // last N turns for context resolution
): Promise<ExtractResult> {

  const t0 = Date.now();

  // Build message history for context (e.g. "What about in Punjab?" resolves correctly)
  const messages: OllamaMessage[] = [
    { role: "system", content: INTENT_SYSTEM_PROMPT },
  ];

  // Inject last 3 turns as context so follow-up queries resolve correctly
  for (const turn of history.slice(-3)) {
    messages.push({ role: "user",      content: turn.userText });
    messages.push({ role: "assistant", content: JSON.stringify(turn.intent) });
  }

  messages.push({ role: "user", content: userText });

  // ── Ollama API call with schema enforcement ────────────────
  let rawResponse = "";
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:    OLLAMA_MODEL,
        messages,
        format:   INTENT_JSON_SCHEMA,   // grammar-constrained decoding
        stream:   false,
        options: {
          temperature: 0,               // deterministic — classifiers need 0 temp
          num_predict: 256,             // intent JSON is short; cap tokens
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        error: `Ollama HTTP ${response.status}: ${errText}`,
        rawResponse: "",
        latencyMs: Date.now() - t0,
      };
    }

    const data = await response.json() as { message?: { content?: string } };
    rawResponse = data?.message?.content ?? "";

  } catch (err) {
    return {
      success: false,
      error: `Network error calling Ollama: ${String(err)}`,
      rawResponse: "",
      latencyMs: Date.now() - t0,
    };
  }

  // ── Parse & validate ──────────────────────────────────────
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    return {
      success: false,
      error: `JSON parse failed. Raw: "${rawResponse}"`,
      rawResponse,
      latencyMs: Date.now() - t0,
    };
  }

  const validated = validateIntent(parsed);
  if (!validated.ok) {
    return {
      success: false,
      error: `Schema validation failed: ${validated.reason}`,
      rawResponse,
      latencyMs: Date.now() - t0,
    };
  }

  return {
    success: true,
    intent: validated.intent,
    rawResponse,
    latencyMs: Date.now() - t0,
  };
}

// ── Schema validator ──────────────────────────────────────────
//  Second line of defence after grammar-constrained decoding.

type ValidateResult =
  | { ok: true;  intent: AgriIntent }
  | { ok: false; reason: string };

function validateIntent(raw: unknown): ValidateResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, reason: "not an object" };
  }

  const obj = raw as Record<string, unknown>;
  const VALID_INTENTS = ["weather", "market_price", "crop_disease", "advisory", "unsupported"];

  if (typeof obj.intent !== "string" || !VALID_INTENTS.includes(obj.intent)) {
    return { ok: false, reason: `unknown intent: "${obj.intent}"` };
  }

  // Ensure unsupported has a message
  if (obj.intent === "unsupported") {
    if (typeof obj.message !== "string" || obj.message.trim() === "") {
      obj.message = "Query not supported.";
    }
    return { ok: true, intent: obj as AgriIntent };
  }

  // All others need entities (at minimum an empty object)
  if (obj.entities === undefined) {
    obj.entities = {};
  }

  // crop_disease and market_price require a crop
  if (
    (obj.intent === "crop_disease" || obj.intent === "market_price") &&
    (typeof (obj.entities as Record<string, unknown>).crop !== "string" ||
      (obj.entities as Record<string, unknown>).crop === "")
  ) {
    // Don't reject — just log. The adapter can ask the user to clarify.
    console.warn(`[intent-validator] '${obj.intent}' missing 'crop' entity`);
  }

  return { ok: true, intent: obj as AgriIntent };
}

// ── Health check ──────────────────────────────────────────────

export async function checkOllamaHealth(): Promise<{ ok: boolean; model: string; error?: string }> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!res.ok) return { ok: false, model: OLLAMA_MODEL, error: `HTTP ${res.status}` };

    const data = await res.json() as { models?: Array<{ name: string }> };
    const models = data.models?.map((m) => m.name) ?? [];
    const modelFound = models.some((m) => m.startsWith(OLLAMA_MODEL.split(":")[0]));

    if (!modelFound) {
      return {
        ok: false,
        model: OLLAMA_MODEL,
        error: `Model '${OLLAMA_MODEL}' not found. Run: ollama pull ${OLLAMA_MODEL}`,
      };
    }

    return { ok: true, model: OLLAMA_MODEL };
  } catch (err) {
    return {
      ok: false,
      model: OLLAMA_MODEL,
      error: `Ollama not reachable at ${OLLAMA_BASE_URL}. Is it running?`,
    };
  }
}
