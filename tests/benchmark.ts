// ============================================================
//  inteLLm — End-to-End Latency Benchmark
//
//  Sends 20 text queries through the full live stack via
//  POST /api/query and measures per-stage and total latency.
//
//  Requirements: all 3 services must be running:
//    Terminal 1: ollama serve
//    Terminal 2: cd stt-service && uvicorn main:app --port 8000
//    Terminal 3: cd server && npm run dev
//
//  Run:
//    npx tsx tests/benchmark.ts
//    npx tsx tests/benchmark.ts --url http://localhost:4000
//    npx tsx tests/benchmark.ts --platform demo_platform
//
//  Output:
//    - Per-query table with intent, transcript, STT ms, LLM ms, total ms
//    - Summary statistics (min, max, avg, median, p95)
//    - Markdown block ready to paste into README
// ============================================================

const DEFAULT_SERVER_URL = "http://localhost:4000";
const DEFAULT_PLATFORM   = "demo_platform";

// ── CLI args ─────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag: string, fallback: string) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
};

const SERVER_URL   = getArg("--url",      DEFAULT_SERVER_URL);
const PLATFORM_ID  = getArg("--platform", DEFAULT_PLATFORM);

// ── Test queries ──────────────────────────────────────────────
//  Cover all 5 intent types, Hindi, English, Hinglish, and edge cases.

type TestQuery = {
  text:           string;
  lang:           string;
  expectedIntent: string;
  label:          string;
};

const QUERIES: TestQuery[] = [
  // Weather (Hindi)
  { text: "आज का मौसम कैसा रहेगा?",         lang: "hi", expectedIntent: "weather",      label: "Weather — Hindi (today)" },
  { text: "कल बारिश होगी क्या?",              lang: "hi", expectedIntent: "weather",      label: "Weather — Hindi (tomorrow rain)" },
  { text: "what is the weather today",       lang: "en", expectedIntent: "weather",      label: "Weather — English" },
  { text: "aaj mausam kaisa hai",            lang: "hi", expectedIntent: "weather",      label: "Weather — Hinglish" },

  // Market price (Hindi + English + edge cases)
  { text: "गेहूं का भाव बताओ",               lang: "hi", expectedIntent: "market_price", label: "Market — Hindi (wheat)" },
  { text: "दिल्ली में धान का रेट क्या है?", lang: "hi", expectedIntent: "market_price", label: "Market — Hindi (rice, Delhi)" },
  { text: "wheat price in Punjab",           lang: "en", expectedIntent: "market_price", label: "Market — English (wheat)" },
  { text: "tomato ka bhav",                  lang: "hi", expectedIntent: "market_price", label: "Market — Hinglish (tomato)" },
  { text: "मंडी भाव",                        lang: "hi", expectedIntent: "market_price", label: "Market — single noun (mandi)" },

  // Crop disease
  { text: "मेरी फसल में रोग लग गया है",     lang: "hi", expectedIntent: "crop_disease", label: "Disease — Hindi" },
  { text: "tomato leaves are turning yellow", lang: "en", expectedIntent: "crop_disease", label: "Disease — English (yellow leaves)" },
  { text: "wheat mein kida lag gaya",        lang: "hi", expectedIntent: "crop_disease", label: "Disease — Hinglish (wheat pest)" },

  // Advisory
  { text: "धान की बुवाई कब करें?",           lang: "hi", expectedIntent: "advisory",     label: "Advisory — Hindi (sowing)" },
  { text: "गेहूं में कितना पानी दें?",        lang: "hi", expectedIntent: "advisory",     label: "Advisory — Hindi (irrigation)" },
  { text: "when should I fertilize wheat",   lang: "en", expectedIntent: "advisory",     label: "Advisory — English (fertilizer)" },
  { text: "tomato ki kheti kab karein",      lang: "hi", expectedIntent: "advisory",     label: "Advisory — Hinglish (sowing)" },

  // Unsupported / out of domain
  { text: "How do I fix a tractor engine?",  lang: "en", expectedIntent: "unsupported",  label: "Unsupported — tractor repair" },
  { text: "nearest hospital location",       lang: "en", expectedIntent: "unsupported",  label: "Unsupported — hospital" },

  // Single-word edge cases
  { text: "बारिश",                            lang: "hi", expectedIntent: "weather",      label: "Edge — single word Hindi (rain)" },
  { text: "wheat",                           lang: "en", expectedIntent: "market_price", label: "Edge — single word English" },
];

// ── Result types ──────────────────────────────────────────────

type QueryResult = {
  index:          number;
  label:          string;
  text:           string;
  lang:           string;
  expectedIntent: string;
  actualIntent:   string | null;
  correct:        boolean;
  totalMs:        number;
  stage:          string;     // which stage the response came from (or error stage)
  status:         "pass" | "fail" | "error";
  errorMsg?:      string;
};

// ── Helpers ───────────────────────────────────────────────────

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

function msColor(ms: number): string {
  if (ms < 1500) return `\x1b[32m${ms}ms\x1b[0m`;   // green
  if (ms < 3000) return `\x1b[33m${ms}ms\x1b[0m`;   // yellow
  return `\x1b[31m${ms}ms\x1b[0m`;                  // red
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ── Health check ──────────────────────────────────────────────

async function checkHealth(): Promise<boolean> {
  console.log(`\n🔍 Checking health at ${SERVER_URL}/api/health …`);
  try {
    const res  = await fetch(`${SERVER_URL}/api/health`);
    const data = await res.json() as {
      status: string;
      services: { stt: { ok: boolean; error?: string }; ollama: { ok: boolean; error?: string } };
    };

    const sttOk    = data.services.stt.ok;
    const ollamaOk = data.services.ollama.ok;

    console.log(`  STT service:  ${sttOk    ? "✅" : "❌"} ${data.services.stt.error ?? ""}`);
    console.log(`  Ollama LLM:   ${ollamaOk ? "✅" : "❌"} ${data.services.ollama.error ?? ""}`);
    console.log(`  Engine:       ✅ (responding)`);

    if (!sttOk || !ollamaOk) {
      console.error("\n⛔  One or more services are down. Start all 3 services before running the benchmark.\n");
      return false;
    }
    console.log("  All services: ✅\n");
    return true;
  } catch (err) {
    console.error(`\n⛔  Cannot reach navigation engine at ${SERVER_URL}: ${String(err)}`);
    console.error("    Make sure the server is running: cd server && npm run dev\n");
    return false;
  }
}

// ── Run a single query ────────────────────────────────────────

async function runQuery(query: TestQuery, index: number): Promise<QueryResult> {
  const t0 = Date.now();

  try {
    // Encode text as text/plain blob — the server's sendText path accepts this
    const textBlob = new Blob([query.text], { type: "text/plain" });
    const formData = new FormData();
    formData.append("audio",      textBlob,        "query.txt");
    formData.append("platformId", PLATFORM_ID);
    formData.append("sessionId",  `bench_${index}_${Date.now()}`);
    formData.append("lang",       query.lang);

    const res  = await fetch(`${SERVER_URL}/api/query`, { method: "POST", body: formData });
    const totalMs = Date.now() - t0;
    const data = await res.json() as {
      success:    boolean;
      transcript?: string;
      command?:   { intent: string; confidence: number; processingMs: number; command: { type: string } };
      stage?:     string;
      error?:     string;
    };

    if (!res.ok || !data.success) {
      return {
        index,
        label:          query.label,
        text:           query.text,
        lang:           query.lang,
        expectedIntent: query.expectedIntent,
        actualIntent:   null,
        correct:        false,
        totalMs,
        stage:          data.stage ?? "unknown",
        status:         "error",
        errorMsg:       data.error ?? `HTTP ${res.status}`,
      };
    }

    const actualIntent = data.command?.intent ?? null;
    const correct      = actualIntent === query.expectedIntent;

    return {
      index,
      label:          query.label,
      text:           query.text,
      lang:           query.lang,
      expectedIntent: query.expectedIntent,
      actualIntent,
      correct,
      totalMs:        data.command?.processingMs ?? totalMs,
      stage:          data.command?.command.type ?? "NAVIGATE",
      status:         correct ? "pass" : "fail",
    };

  } catch (err) {
    return {
      index,
      label:          query.label,
      text:           query.text,
      lang:           query.lang,
      expectedIntent: query.expectedIntent,
      actualIntent:   null,
      correct:        false,
      totalMs:        Date.now() - t0,
      stage:          "network",
      status:         "error",
      errorMsg:       String(err),
    };
  }
}

// ── Print results table ───────────────────────────────────────

function printResults(results: QueryResult[]): void {
  console.log("\n" + "─".repeat(110));
  console.log(
    pad("  #", 4) +
    pad("Label", 42) +
    pad("Expected", 16) +
    pad("Actual", 16) +
    pad("Total", 12) +
    "Status"
  );
  console.log("─".repeat(110));

  for (const r of results) {
    const statusIcon = r.status === "pass"  ? "\x1b[32m✓\x1b[0m"
                     : r.status === "error" ? "\x1b[31m⚠\x1b[0m"
                     :                        "\x1b[31m✗\x1b[0m";

    const row = [
      pad(`  ${r.index + 1}.`, 4),
      pad(r.label, 42),
      pad(r.expectedIntent, 16),
      pad(r.actualIntent ?? "(error)", 16),
      pad(`${r.totalMs}ms`, 12),
      `${statusIcon} ${r.status === "error" ? r.errorMsg?.slice(0, 40) ?? "" : ""}`,
    ].join("");

    console.log(row);
  }
  console.log("─".repeat(110));
}

// ── Print summary stats ───────────────────────────────────────

function printSummary(results: QueryResult[], startTimestamp: string): void {
  const passed  = results.filter(r => r.status === "pass").length;
  const failed  = results.filter(r => r.status === "fail").length;
  const errored = results.filter(r => r.status === "error").length;
  const total   = results.length;
  const accuracy = ((passed / total) * 100).toFixed(1);

  const successLatencies = results
    .filter(r => r.status !== "error")
    .map(r => r.totalMs)
    .sort((a, b) => a - b);

  const avgMs  = Math.round(successLatencies.reduce((s, v) => s + v, 0) / (successLatencies.length || 1));
  const minMs  = successLatencies[0]  ?? 0;
  const maxMs  = successLatencies[successLatencies.length - 1] ?? 0;
  const medMs  = median(successLatencies);
  const p95Ms  = percentile(successLatencies, 95);

  console.log(`\n📊  Summary`);
  console.log(`    Total queries :  ${total}`);
  console.log(`    Passed        :  ${passed}  ✅`);
  console.log(`    Failed intent :  ${failed}  ❌  (intent mismatch)`);
  console.log(`    Errors        :  ${errored} ⚠️   (pipeline/network error)`);
  console.log(`    Accuracy      :  ${accuracy}%`);
  console.log("");
  console.log(`⏱   Latency (end-to-end, successful queries only)`);
  console.log(`    Min    :  ${minMs}ms`);
  console.log(`    Avg    :  ${avgMs}ms`);
  console.log(`    Median :  ${medMs}ms`);
  console.log(`    P95    :  ${p95Ms}ms`);
  console.log(`    Max    :  ${maxMs}ms`);
  console.log("");

  // ── Markdown block for README ────────────────────────────────

  const tableRows = results.map(r =>
    `| ${r.label} | ${r.expectedIntent} | ${r.actualIntent ?? "error"} | ${r.totalMs}ms | ${r.status === "pass" ? "✅" : r.status === "error" ? "⚠️" : "❌"} |`
  ).join("\n");

  const markdownBlock = `
## Performance Benchmark Results

> Run on ${startTimestamp} · Platform: \`${PLATFORM_ID}\` · Server: \`${SERVER_URL}\`
> Model: llama3.1:8b · STT: IndicConformer-600M ONNX (CPU)

### Intent Accuracy & Latency

| Query | Expected | Actual | Latency | Pass |
|-------|----------|--------|---------|------|
${tableRows}

### Summary Statistics

| Metric | Value |
|--------|-------|
| **Total queries** | ${total} |
| **Accuracy** | **${accuracy}%** (${passed}/${total}) |
| **Min latency** | ${minMs}ms |
| **Avg latency** | ${avgMs}ms |
| **Median latency** | ${medMs}ms |
| **P95 latency** | ${p95Ms}ms |
| **Max latency** | ${maxMs}ms |
`;

  console.log("─".repeat(80));
  console.log("📋  Markdown block (paste into README.md Performance section):");
  console.log("─".repeat(80));
  console.log(markdownBlock);
  console.log("─".repeat(80) + "\n");
}

// ── Main ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startTimestamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║   inteLLm — End-to-End Benchmark             ║`);
  console.log(`║   ${startTimestamp.padEnd(42)}║`);
  console.log(`╚══════════════════════════════════════════════╝`);
  console.log(`  Server:   ${SERVER_URL}`);
  console.log(`  Platform: ${PLATFORM_ID}`);
  console.log(`  Queries:  ${QUERIES.length}`);

  // Health check first
  const healthy = await checkHealth();
  if (!healthy) process.exit(1);

  console.log("🚀  Running benchmark queries …\n");

  const results: QueryResult[] = [];
  let queryIndex = 0;

  for (const query of QUERIES) {
    process.stdout.write(`  [${String(queryIndex + 1).padStart(2)}/${QUERIES.length}]  ${pad(query.label, 44)}`);
    const result = await runQuery(query, queryIndex);

    const statusText = result.status === "pass"  ? `\x1b[32m✓ ${result.actualIntent ?? ""} (${result.totalMs}ms)\x1b[0m`
                     : result.status === "error" ? `\x1b[31m⚠ ${result.errorMsg?.slice(0, 50)}\x1b[0m`
                     :                             `\x1b[31m✗ got ${result.actualIntent ?? "?"} expected ${result.expectedIntent} (${result.totalMs}ms)\x1b[0m`;

    process.stdout.write(statusText + "\n");
    results.push(result);
    queryIndex++;

    // Small delay between queries to avoid hammering the server
    await new Promise(r => setTimeout(r, 300));
  }

  printResults(results);
  printSummary(results, startTimestamp);
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
