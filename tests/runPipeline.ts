// ============================================================
//  AGRI PLATFORM — Phase 1 Test Runner
//
//  Runs 20 agricultural queries through the full pipeline:
//    text → Ollama intent extraction → router → adapter
//
//  Usage:
//    npx tsx tests/runPipeline.ts
//
//  Before running:
//    1. Install Ollama: https://ollama.com
//    2. Pull the model: ollama pull llama3.1:8b
//    3. Start Ollama:   ollama serve
// ============================================================

import { extractIntent, checkOllamaHealth } from "../src/intentExtractor.js";
import { routeIntent } from "../src/router.js";

// ── Test cases ────────────────────────────────────────────────
//  Mix of Hindi, English, Hinglish, ambiguous, and invalid queries
//  to stress-test all intent types and the fallback.

const TEST_QUERIES = [
  // Weather
  { query: "आज का मौसम कैसा रहेगा?",              expect: "weather" },
  { query: "Will it rain tomorrow in my village?",  expect: "weather" },
  { query: "पूसा में कल मौसम कैसा होगा",          expect: "weather" },

  // Market price
  { query: "मुझे दिल्ली में गेहूं का भाव बताओ",    expect: "market_price" },
  { query: "What is today's tomato price in Pune?", expect: "market_price" },
  { query: "नागपुर मंडी में सोयाबीन का रेट क्या है?", expect: "market_price" },
  { query: "Cotton rate in Vidarbha mandi",         expect: "market_price" },

  // Crop disease
  { query: "My tomato leaves are turning yellow",   expect: "crop_disease" },
  { query: "गेहूं की फसल में काला धब्बा आ गया",    expect: "crop_disease" },
  { query: "Rice plants are wilting at base",       expect: "crop_disease" },
  { query: "मेरी प्याज की फसल सड़ रही है",         expect: "crop_disease" },

  // Advisory
  { query: "When should I irrigate my rice crop?",  expect: "advisory" },
  { query: "धान की बुवाई कब करें?",                 expect: "advisory" },
  { query: "How much fertilizer for wheat per acre?", expect: "advisory" },
  { query: "गन्ने में कौन सी खाद डालें?",          expect: "advisory" },

  // Unsupported / out of domain
  { query: "How do I fix my tractor engine?",       expect: "unsupported" },
  { query: "What is the capital of France?",        expect: "unsupported" },
  { query: "मुझे एक अच्छी फिल्म बताओ",             expect: "unsupported" },

  // Ambiguous / short
  { query: "wheat",                                 expect: "market_price" }, // reasonable guess
  { query: "बारिश",                                  expect: "weather" },       // just "rain"
];

// ── Colours for terminal output ───────────────────────────────

const C = {
  reset:  "\x1b[0m",
  green:  "\x1b[32m",
  red:    "\x1b[31m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
};

// ── Runner ────────────────────────────────────────────────────

async function run() {
  console.log(`\n${C.bold}╔════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}║   AGRI PLATFORM — Phase 1 Test Runner  ║${C.reset}`);
  console.log(`${C.bold}╚════════════════════════════════════════╝${C.reset}\n`);

  // Health check first
  console.log(`${C.cyan}Checking Ollama health...${C.reset}`);
  const health = await checkOllamaHealth();
  if (!health.ok) {
    console.error(`${C.red}✗ Ollama not ready: ${health.error}${C.reset}`);
    console.error(`\n  Fix: Make sure Ollama is running and the model is pulled.`);
    console.error(`  Commands:\n    ollama serve\n    ollama pull ${health.model}\n`);
    process.exit(1);
  }
  console.log(`${C.green}✓ Ollama running · model: ${health.model}${C.reset}\n`);

  let passed = 0;
  let failed = 0;
  const results: Array<{ query: string; expected: string; got: string; pass: boolean; latency: number; display: string }> = [];

  for (const { query, expect } of TEST_QUERIES) {
    process.stdout.write(`  ${C.dim}${query.padEnd(50)}${C.reset} `);

    const extractResult = await extractIntent(query);

    if (!extractResult.success) {
      failed++;
      console.log(`${C.red}✗ EXTRACT FAILED: ${extractResult.error}${C.reset}`);
      results.push({ query, expected: expect, got: "error", pass: false, latency: extractResult.latencyMs, display: extractResult.error });
      continue;
    }

    const adapterResult = routeIntent(extractResult.intent);
    const got  = extractResult.intent.intent;
    const pass = got === expect;

    if (pass) {
      passed++;
      console.log(`${C.green}✓${C.reset} ${C.dim}[${got}]${C.reset} ${C.dim}${extractResult.latencyMs}ms${C.reset}`);
    } else {
      failed++;
      console.log(`${C.red}✗ expected [${expect}] got [${got}]${C.reset} ${C.dim}${extractResult.latencyMs}ms${C.reset}`);
    }

    results.push({
      query,
      expected: expect,
      got,
      pass,
      latency:  extractResult.latencyMs,
      display:  adapterResult.display,
    });
  }

  // ── Summary ─────────────────────────────────────────────────
  const total    = TEST_QUERIES.length;
  const accuracy = ((passed / total) * 100).toFixed(1);
  const avgLatency = Math.round(results.reduce((s, r) => s + r.latency, 0) / total);

  console.log(`\n${C.bold}── Summary ──────────────────────────────────────${C.reset}`);
  console.log(`  Total:    ${total}`);
  console.log(`  ${C.green}Passed:   ${passed}${C.reset}`);
  console.log(`  ${C.red}Failed:   ${failed}${C.reset}`);
  console.log(`  Accuracy: ${Number(accuracy) >= 85 ? C.green : C.yellow}${accuracy}%${C.reset}`);
  console.log(`  Avg latency: ${avgLatency}ms`);

  // ── Sample adapter outputs ──────────────────────────────────
  console.log(`\n${C.bold}── Sample adapter outputs (first 5 passing) ────${C.reset}`);
  results.filter((r) => r.pass).slice(0, 5).forEach((r) => {
    console.log(`\n  ${C.cyan}Query:${C.reset} "${r.query}"`);
    console.log(`  ${C.cyan}Response:${C.reset} ${r.display}`);
  });

  console.log(`\n${Number(accuracy) >= 85
    ? `${C.green}✓ Pipeline looks healthy. Ready for Phase 2 (STT integration).${C.reset}`
    : `${C.yellow}⚠ Accuracy below 85%. Review system prompt and re-test before moving on.${C.reset}`
  }\n`);
}

run().catch((err) => {
  console.error(`${C.red}Unhandled error:${C.reset}`, err);
  process.exit(1);
});
