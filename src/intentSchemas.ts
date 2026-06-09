// ============================================================
//  AGRI PLATFORM — Intent Schemas
//  All intents the LLM can return, as TypeScript types
//  AND as Ollama-compatible JSON Schema objects.
// ============================================================

// ── TypeScript types ─────────────────────────────────────────

export type WeatherIntent = {
  intent: "weather";
  entities: {
    location?: string;
    crop?: string;
    timeframe?: "today" | "tomorrow" | "week";
  };
};

export type MarketPriceIntent = {
  intent: "market_price";
  entities: {
    crop: string;
    market?: string;
    state?: string;
  };
};

export type CropDiseaseIntent = {
  intent: "crop_disease";
  entities: {
    crop: string;
    symptom?: string;
  };
};

export type AdvisoryIntent = {
  intent: "advisory";
  entities: {
    crop: string;
    topic?: string; // e.g. "irrigation", "fertilizer", "sowing"
  };
};

export type UnsupportedIntent = {
  intent: "unsupported";
  message: string; // human-readable reason, in the user's language if possible
};

export type AgriIntent =
  | WeatherIntent
  | MarketPriceIntent
  | CropDiseaseIntent
  | AdvisoryIntent
  | UnsupportedIntent;

// ── Ollama JSON Schema (grammar-constrained output) ──────────
//
//  Passed as `format` in the Ollama API call.
//  This enforces structure at the TOKEN level — the model
//  physically cannot output anything outside this schema.

export const INTENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: ["weather", "market_price", "crop_disease", "advisory", "unsupported"],
    },
    entities: {
      type: "object",
      properties: {
        crop:      { type: "string" },
        location:  { type: "string" },
        market:    { type: "string" },
        state:     { type: "string" },
        symptom:   { type: "string" },
        topic:     { type: "string" },
        timeframe: { type: "string", enum: ["today", "tomorrow", "week"] },
      },
    },
    message: { type: "string" },
  },
  required: ["intent"],
} as const;

// ── System prompt ─────────────────────────────────────────────
//
//  Tightly constrains the LLM to classifier mode only.
//  The one-shot examples are critical — they train the model
//  on the exact schema in context before the real query.

export const INTENT_SYSTEM_PROMPT = `You are an agricultural query classifier for rural Indian farmers.
Your ONLY job is to extract the user's intent and entities from their query.
You must ALWAYS respond with a single valid JSON object. No explanations. No extra text.

Supported intents:
- weather        → user wants weather forecast or conditions
- market_price   → user wants crop/commodity prices at mandi
- crop_disease   → user wants help diagnosing crop problems or diseases
- advisory       → user wants farming advice (irrigation, fertilizer, sowing, etc.)
- unsupported    → query is outside agriculture or cannot be classified

EXAMPLES:

Input: "आज का मौसम कैसा रहेगा?"
Output: {"intent":"weather","entities":{"timeframe":"today"}}

Input: "मुझे दिल्ली में गेहूं का भाव बताओ"
Output: {"intent":"market_price","entities":{"crop":"wheat","market":"Delhi"}}

Input: "My tomato leaves are turning yellow"
Output: {"intent":"crop_disease","entities":{"crop":"tomato","symptom":"yellow leaves"}}

Input: "When should I irrigate my rice crop?"
Output: {"intent":"advisory","entities":{"crop":"rice","topic":"irrigation"}}

Input: "धान की बुवाई कब करें?"
Output: {"intent":"advisory","entities":{"crop":"rice","topic":"sowing"}}

Input: "How do I fix my tractor engine?"
Output: {"intent":"unsupported","message":"Tractor repairs are outside my agriculture knowledge scope."}

Input: "What is 2 + 2?"
Output: {"intent":"unsupported","message":"I can only help with agriculture-related queries."}

Now classify the following query. Respond with JSON only.`;
