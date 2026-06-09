// ============================================================
//  AGRI PLATFORM — Mock Adapters
//
//  Each adapter implements a standard interface:
//    (entities) => AdapterResponse
//
//  When a real API is ready, ONLY the adapter changes.
//  The router, orchestrator, and frontend never need to change.
// ============================================================

import type {
  WeatherIntent,
  MarketPriceIntent,
  CropDiseaseIntent,
  AdvisoryIntent,
  UnsupportedIntent,
} from "./intentSchemas.js";

// ── Shared response type ──────────────────────────────────────

export type AdapterResponse = {
  intent:  string;
  data:    Record<string, unknown>;
  display: string;          // human-readable summary for the UI
  source:  "mock" | "live"; // swap to "live" when real API plugged in
};

// ── Weather Adapter ───────────────────────────────────────────

export function weatherAdapter(entities: WeatherIntent["entities"]): AdapterResponse {
  const location = entities.location ?? "your area";
  const timeframe = entities.timeframe ?? "today";

  // TODO: Replace with IMD API or Open-Meteo (free, open source)
  const mock = {
    location,
    timeframe,
    temperature_c: 32,
    humidity_pct:  68,
    condition:     "Partly cloudy with light winds",
    rainfall_mm:   0,
    advisory:      "Good conditions for field work. No irrigation needed today.",
  };

  return {
    intent:  "weather",
    data:    mock,
    display: `Weather for ${location} (${timeframe}): ${mock.condition}, ${mock.temperature_c}°C, humidity ${mock.humidity_pct}%. ${mock.advisory}`,
    source:  "mock",
  };
}

// ── Market Price Adapter ──────────────────────────────────────

export function marketPriceAdapter(entities: MarketPriceIntent["entities"]): AdapterResponse {
  const crop   = entities.crop;
  const market = entities.market ?? "local mandi";
  const state  = entities.state  ?? "your state";

  // Mock price data — keyed by crop name (lowercase)
  const MOCK_PRICES: Record<string, { min: number; max: number; unit: string }> = {
    wheat:   { min: 2200, max: 2400, unit: "₹/quintal" },
    rice:    { min: 1950, max: 2100, unit: "₹/quintal" },
    tomato:  { min:  800, max: 1200, unit: "₹/quintal" },
    onion:   { min:  600, max:  900, unit: "₹/quintal" },
    cotton:  { min: 6200, max: 6500, unit: "₹/quintal" },
    soybean: { min: 4400, max: 4600, unit: "₹/quintal" },
    maize:   { min: 1800, max: 2000, unit: "₹/quintal" },
    sugarcane:{ min: 310,  max: 340, unit: "₹/quintal" },
  };

  const priceKey = crop.toLowerCase();
  const price = MOCK_PRICES[priceKey] ?? { min: 1500, max: 2000, unit: "₹/quintal" };

  // TODO: Replace with Agmarknet API or data.gov.in commodity prices
  const mock = {
    crop,
    market,
    state,
    min_price:    price.min,
    max_price:    price.max,
    modal_price:  Math.round((price.min + price.max) / 2),
    unit:         price.unit,
    date:         new Date().toLocaleDateString("en-IN"),
  };

  return {
    intent:  "market_price",
    data:    mock,
    display: `${crop} price at ${market}: ₹${mock.min_price}–₹${mock.max_price} (modal ₹${mock.modal_price}) per quintal as of ${mock.date}.`,
    source:  "mock",
  };
}

// ── Crop Disease Adapter ──────────────────────────────────────

export function cropDiseaseAdapter(entities: CropDiseaseIntent["entities"]): AdapterResponse {
  const crop    = entities.crop;
  const symptom = entities.symptom ?? "unspecified symptoms";

  // TODO: Replace with Crop Doctor API when available
  const mock = {
    crop,
    symptom,
    possible_causes: [
      "Nutrient deficiency (nitrogen or iron)",
      "Fungal infection (early blight or downy mildew)",
      "Overwatering or waterlogged soil",
    ],
    recommended_action: "Inspect leaves closely. If yellowing starts from older leaves: likely nitrogen deficiency — apply urea. If starting from new growth: iron deficiency — apply ferrous sulphate foliar spray.",
    severity:  "moderate",
    confidence: "medium — visual diagnosis needed for accuracy",
  };

  return {
    intent:  "crop_disease",
    data:    mock,
    display: `For ${crop} with ${symptom}: Possible causes include ${mock.possible_causes[0]} or ${mock.possible_causes[1]}. Recommendation: ${mock.recommended_action}`,
    source:  "mock",
  };
}

// ── Advisory Adapter ─────────────────────────────────────────

export function advisoryAdapter(entities: AdvisoryIntent["entities"]): AdapterResponse {
  const crop  = entities.crop;
  const topic = entities.topic ?? "general";

  const ADVISORY_DB: Record<string, Record<string, string>> = {
    irrigation: {
      rice:    "Rice needs standing water (5–7 cm) during vegetative stage. Drain field 2 weeks before harvest.",
      wheat:   "Wheat needs 5–6 irrigations. Critical stages: crown root initiation (21 days), tillering, jointing, flowering, and grain filling.",
      tomato:  "Drip irrigation preferred. Water every 2–3 days. Avoid overhead watering to prevent fungal disease.",
      default: "Water at root zone. Avoid waterlogging. Check soil moisture at 6 cm depth before irrigating.",
    },
    sowing: {
      rice:    "Kharif sowing: June–July. Transplant 25–30 day old seedlings. Row spacing: 20×15 cm.",
      wheat:   "Rabi sowing: October–November. Seed rate 100–125 kg/hectare. Sow at 5–6 cm depth.",
      tomato:  "Raise nursery 4–6 weeks before transplanting. Transplant after last frost.",
      default: "Follow regional Kharif/Rabi calendar. Consult local Krishi Vigyan Kendra for exact dates.",
    },
    fertilizer: {
      rice:    "NPK 120:60:60 kg/hectare. Apply basal dose at transplanting, top dress nitrogen at tillering.",
      wheat:   "NPK 120:60:40 kg/hectare. Apply full P and K at sowing, split N into 3 doses.",
      tomato:  "Apply FYM 25 t/ha before planting. NPK 100:60:80 kg/hectare. Fertigation preferred.",
      default: "Conduct soil test first. General: FYM 10–15 t/ha + NPK as per crop requirement.",
    },
  };

  const topicKey  = topic.toLowerCase();
  const cropKey   = crop.toLowerCase();
  const topicData = ADVISORY_DB[topicKey] ?? ADVISORY_DB["irrigation"];
  const advice    = topicData[cropKey] ?? topicData["default"];

  return {
    intent:  "advisory",
    data:    { crop, topic, advice },
    display: `Advisory for ${crop} — ${topic}: ${advice}`,
    source:  "mock",
  };
}

// ── Fallback Adapter ─────────────────────────────────────────

export function fallbackAdapter(entities: UnsupportedIntent): AdapterResponse {
  return {
    intent:  "unsupported",
    data:    {},
    display: entities.message || "I can help with weather, market prices, crop diseases, and farming advice. Please ask about one of these topics.",
    source:  "mock",
  };
}
