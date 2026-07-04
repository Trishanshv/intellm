// ============================================================
//  AGRI PLATFORM — Intent Router
//
//  Receives a validated AgriIntent, calls the correct adapter,
//  returns a typed AdapterResponse.
//
//  To add a new intent:
//    1. Add the type to intentSchemas.ts
//    2. Add an adapter in adapters.ts
//    3. Add one case here
// ============================================================

import type { AgriIntent } from "./intentSchemas.js";
import type { AdapterResponse } from "./adapters.js";
import {
  weatherAdapter,
  marketPriceAdapter,
  cropDiseaseAdapter,
  advisoryAdapter,
  fallbackAdapter,
} from "./adapters.js";

export function routeIntent(intent: AgriIntent): AdapterResponse {
  switch (intent.intent) {
    case "weather":
      return weatherAdapter(intent.entities);

    case "market_price":
      return marketPriceAdapter(intent.entities);

    case "crop_disease":
      return cropDiseaseAdapter(intent.entities);

    case "advisory":
      return advisoryAdapter(intent.entities);

    case "unsupported":
      return fallbackAdapter(intent);

    default:
      // TypeScript exhaustiveness check — this should never be reached
      const _exhaustive: never = intent;
      return fallbackAdapter({ intent: "unsupported", message: "Unknown intent received." });
  }
}
