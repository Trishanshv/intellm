// ============================================================
//  INTENT REGISTRY — Pattern: Repository + Strategy
//
//  The central store of all registered intents across all
//  platforms. When a parent app integrates with this platform,
//  it registers its intents here at initialisation time.
//
//  Each intent registration contains:
//    - intent name (must match LLM output)
//    - which platform it belongs to
//    - what command to issue (navigate to route / trigger action)
//    - example phrases (used for semantic similarity fallback)
//    - required entities (for validation)
//
//  Pattern: Repository — storage is abstracted behind a clean
//  interface. Today it's in-memory. Tomorrow it could be a DB.
// ============================================================

import type { Command } from "../patterns/commandPattern.js";

// ── Types ─────────────────────────────────────────────────────

export type IntentRegistration = {
  intentName:       string;           // must match LLM intent output exactly
  platformId:       string;           // e.g. "crop_doctor", "hospital_mgmt"
  description:      string;           // human readable, used in logs + SDK docs
  command:          Command;          // what to emit when this intent fires
  examplePhrases:   string[];         // for semantic similarity fallback
  requiredEntities: string[];         // entities that must be present (can be [])
  confidenceMin:    number;           // per-intent confidence floor (overrides global)
};

export type PlatformRegistration = {
  platformId:   string;
  displayName:  string;
  baseUrl:      string;               // e.g. "https://cropdoctor.in"
  intents:      IntentRegistration[];
};

// ── In-memory repository ──────────────────────────────────────

class IntentRegistry {
  private platforms: Map<string, PlatformRegistration> = new Map();

  // Register a platform with all its intents at once
  registerPlatform(platform: PlatformRegistration): void {
    this.platforms.set(platform.platformId, platform);
    console.log(
      `[IntentRegistry] Registered platform '${platform.platformId}' ` +
      `with ${platform.intents.length} intents`
    );
  }

  // Look up a specific intent for a platform
  resolve(platformId: string, intentName: string): IntentRegistration | null {
    const platform = this.platforms.get(platformId);
    if (!platform) return null;
    return platform.intents.find((i) => i.intentName === intentName) ?? null;
  }

  // Get all intents for a platform (used for semantic similarity search)
  getAllIntents(platformId: string): IntentRegistration[] {
    return this.platforms.get(platformId)?.intents ?? [];
  }

  // Get all registered platform IDs
  getPlatformIds(): string[] {
    return Array.from(this.platforms.keys());
  }

  getPlatform(platformId: string): PlatformRegistration | null {
    return this.platforms.get(platformId) ?? null;
  }
}

export const intentRegistry = new IntentRegistry();

// ── Default platform registrations ───────────────────────────
//  These ship with the platform as built-in demos.
//  Real integrations would POST to /api/register at runtime.

// Crop Doctor platform registration
intentRegistry.registerPlatform({
  platformId:  "crop_doctor",
  displayName: "Crop Doctor",
  baseUrl:     "https://cropdoctor.in",
  intents: [
    {
      intentName:       "weather",
      platformId:       "crop_doctor",
      description:      "Navigate to the weather forecast page",
      command:          { type: "NAVIGATE", route: "/weather" },
      examplePhrases:   ["what is the weather", "आज का मौसम", "will it rain tomorrow", "बारिश होगी क्या"],
      requiredEntities: [],
      confidenceMin:    0.75,
    },
    {
      intentName:       "market_price",
      platformId:       "crop_doctor",
      description:      "Navigate to mandi price page for a crop",
      command:          { type: "NAVIGATE", route: "/market", params: {} },
      examplePhrases:   ["wheat price", "गेहूं का भाव", "mandi rate", "मंडी भाव"],
      requiredEntities: ["crop"],
      confidenceMin:    0.75,
    },
    {
      intentName:       "crop_disease",
      platformId:       "crop_doctor",
      description:      "Navigate to the crop disease diagnosis page",
      command:          { type: "NAVIGATE", route: "/disease-check" },
      examplePhrases:   ["my crop has disease", "फसल में रोग", "yellow leaves", "पत्तियां पीली"],
      requiredEntities: ["crop"],
      confidenceMin:    0.80,
    },
    {
      intentName:       "advisory",
      platformId:       "crop_doctor",
      description:      "Navigate to the farming advisory page",
      command:          { type: "NAVIGATE", route: "/advisory" },
      examplePhrases:   ["farming advice", "खेती की सलाह", "when to irrigate", "सिंचाई कब करें"],
      requiredEntities: ["crop"],
      confidenceMin:    0.75,
    },
    {
      intentName:       "unsupported",
      platformId:       "crop_doctor",
      description:      "Fallback for unrecognised queries",
      command:          { type: "FALLBACK", message: "I can help you navigate to weather, market prices, crop disease, or advisory pages." },
      examplePhrases:   [],
      requiredEntities: [],
      confidenceMin:    0.0,
    },
  ],
});

// Generic demo platform — shows the platform works beyond agriculture
intentRegistry.registerPlatform({
  platformId:  "demo_platform",
  displayName: "Generic Demo",
  baseUrl:     "http://localhost:3000",
  intents: [
    {
      intentName:       "weather",
      platformId:       "demo_platform",
      description:      "Open weather page",
      command:          { type: "NAVIGATE", route: "/weather" },
      examplePhrases:   ["show weather", "weather forecast"],
      requiredEntities: [],
      confidenceMin:    0.70,
    },
    {
      intentName:       "market_price",
      platformId:       "demo_platform",
      description:      "Open market prices page",
      command:          { type: "NAVIGATE", route: "/prices" },
      examplePhrases:   ["show prices", "market rates"],
      requiredEntities: [],
      confidenceMin:    0.70,
    },
    {
      intentName:       "crop_disease",
      platformId:       "demo_platform",
      description:      "Open disease check page",
      command:          { type: "NAVIGATE", route: "/disease" },
      examplePhrases:   ["check disease", "crop problem"],
      requiredEntities: [],
      confidenceMin:    0.70,
    },
    {
      intentName:       "advisory",
      platformId:       "demo_platform",
      description:      "Open advisory page",
      command:          { type: "NAVIGATE", route: "/advisory" },
      examplePhrases:   ["get advice", "farming tips"],
      requiredEntities: [],
      confidenceMin:    0.70,
    },
    {
      intentName:       "unsupported",
      platformId:       "demo_platform",
      description:      "Fallback",
      command:          { type: "FALLBACK", message: "I can help you navigate this platform using voice." },
      examplePhrases:   [],
      requiredEntities: [],
      confidenceMin:    0.0,
    },
  ],
});
