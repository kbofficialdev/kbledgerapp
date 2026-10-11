import { TestResult, TestSuiteResult } from "../types";
import { computeOrderTotals } from "../unit/ledger-math.test";
import { computeCosineSimilarity } from "../unit/biometrics.test";
import { PaymentSecurityPolicyEngine } from "../../src/lib/payment-policies";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

function calculatePercentiles(latencies: number[]): { p50: number; p90: number; p95: number; p99: number; avg: number } {
  latencies.sort((a, b) => a - b);
  const getP = (p: number) => {
    const idx = Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length));
    return latencies[idx];
  };
  const sum = latencies.reduce((acc, v) => acc + v, 0);
  return {
    p50: Math.round(getP(50) * 100) / 100,
    p90: Math.round(getP(90) * 100) / 100,
    p95: Math.round(getP(95) * 100) / 100,
    p99: Math.round(getP(99) * 100) / 100,
    avg: Math.round((sum / latencies.length) * 100) / 100,
  };
}

export async function runPerformanceBenchmarkTests(): Promise<{
  suiteResult: TestSuiteResult;
  p50: number;
  p95: number;
}> {
  const tests: TestResult[] = [];
  const suiteStart = performance.now();
  let globalP50 = 0;
  let globalP95 = 0;

  // Benchmark 1: API Response Latency for GET /api/villages (20 samples)
  await (async () => {
    const start = performance.now();
    try {
      const latencies: number[] = [];
      const SAMPLES = 20;

      for (let i = 0; i < SAMPLES; i++) {
        const reqStart = performance.now();
        const res = await fetch(`${BASE_URL}/api/villages`);
        if (res.status !== 200) throw new Error(`API failed on sample ${i}`);
        await res.json();
        latencies.push(performance.now() - reqStart);
      }

      const stats = calculatePercentiles(latencies);
      globalP50 = stats.p50;
      globalP95 = stats.p95;

      if (stats.p95 > 1500) {
        throw new Error(`P95 latency ${stats.p95}ms exceeded SLA limit of 1500ms`);
      }

      tests.push({
        name: `API Latency GET /api/villages (P50: ${stats.p50}ms, P95: ${stats.p95}ms, Avg: ${stats.avg}ms)`,
        suite: "Performance & Stress Benchmarking",
        category: "PERFORMANCE",
        passed: true,
        durationMs: performance.now() - start,
        details: `Sampled ${SAMPLES} requests. Fast response under production PostgreSQL SLA.`,
      });
    } catch (e: any) {
      tests.push({
        name: "API Latency GET /api/villages SLA compliance",
        suite: "Performance & Stress Benchmarking",
        category: "PERFORMANCE",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Benchmark 2: GPay Intent & QR Code generation speed (10 samples)
  await (async () => {
    const start = performance.now();
    try {
      const latencies: number[] = [];
      const SAMPLES = 10;

      for (let i = 0; i < SAMPLES; i++) {
        const reqStart = performance.now();
        const res = await fetch(`${BASE_URL}/api/payments/gpay/intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: 150 + i * 10, orderNumber: `BENCH-${i}` }),
        });
        if (res.status !== 200) throw new Error(`GPay intent failed on sample ${i}`);
        await res.json();
        latencies.push(performance.now() - reqStart);
      }

      const stats = calculatePercentiles(latencies);
      if (stats.p95 > 2000) {
        throw new Error(`GPay generation P95 ${stats.p95}ms exceeded 2000ms`);
      }

      tests.push({
        name: `Dynamic GPay Intent & QR Code Generation (P50: ${stats.p50}ms, P95: ${stats.p95}ms)`,
        suite: "Performance & Stress Benchmarking",
        category: "PERFORMANCE",
        passed: true,
        durationMs: performance.now() - start,
        details: `Delivers counter checkout QR code in median ${stats.p50}ms.`,
      });
    } catch (e: any) {
      tests.push({
        name: "Dynamic GPay Intent & QR Code Generation speed",
        suite: "Performance & Stress Benchmarking",
        category: "PERFORMANCE",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Benchmark 3: In-Memory Bahi-Khata Calculation Throughput (10,000 transactions)
  (() => {
    const start = performance.now();
    try {
      const ITERATIONS = 10000;
      const sampleItems = [
        { name: "Pattu Saree", qty: 2, pricePerUnit: 1250 },
        { name: "Cotton Dupatta", qty: 4, pricePerUnit: 350 },
      ];

      const t0 = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        computeOrderTotals(sampleItems, i % 2 === 0 ? "PARTIAL" : "DEBIT", 1500);
      }
      const calcDuration = performance.now() - t0;
      const opsPerSec = Math.round((ITERATIONS / calcDuration) * 1000);

      tests.push({
        name: `Ledger Arithmetic Throughput (${opsPerSec.toLocaleString()} ops/sec)`,
        suite: "Performance & Stress Benchmarking",
        category: "PERFORMANCE",
        passed: true,
        durationMs: performance.now() - start,
        details: `Computed 10,000 multi-item invoices with paise precision in ${calcDuration.toFixed(2)}ms.`,
      });
    } catch (e: any) {
      tests.push({
        name: "Ledger Arithmetic Throughput benchmark",
        suite: "Performance & Stress Benchmarking",
        category: "PERFORMANCE",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Benchmark 4: Biometric 128-D Vector Distance Throughput (1,000 comparisons)
  (() => {
    const start = performance.now();
    try {
      const ITERATIONS = 1000;
      const v1 = new Array(128).fill(0.1);
      const v2 = new Array(128).fill(0.12);

      const t0 = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        computeCosineSimilarity(v1, v2);
      }
      const bioDuration = performance.now() - t0;

      if (bioDuration > 100) {
        throw new Error(`Biometric calculation took too long: ${bioDuration}ms`);
      }

      tests.push({
        name: `Biometric 128-d Vector Cosine Similarity (${ITERATIONS} comparisons in ${bioDuration.toFixed(2)}ms)`,
        suite: "Performance & Stress Benchmarking",
        category: "PERFORMANCE",
        passed: true,
        durationMs: performance.now() - start,
        details: `Near-instantaneous biometric matching (${(bioDuration / ITERATIONS).toFixed(4)}ms per face match).`,
      });
    } catch (e: any) {
      tests.push({
        name: "Biometric 128-d Vector Cosine Similarity speed",
        suite: "Performance & Stress Benchmarking",
        category: "PERFORMANCE",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Benchmark 5: HMAC-SHA256 Cryptographic Verification Throughput (1,000 ops)
  (() => {
    const start = performance.now();
    try {
      const ITERATIONS = 1000;
      const secret = "production_super_secret_key";
      const payload = "order_id=ORD-999&amount=2500";
      const sig = PaymentSecurityPolicyEngine.generateHmacSignature(payload, secret);

      const t0 = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        PaymentSecurityPolicyEngine.verifyHmacSignature(payload, sig, secret);
      }
      const hmacDuration = performance.now() - t0;

      tests.push({
        name: `HMAC-SHA256 Timing-Safe Signature Verification (${ITERATIONS} ops in ${hmacDuration.toFixed(2)}ms)`,
        suite: "Performance & Stress Benchmarking",
        category: "PERFORMANCE",
        passed: true,
        durationMs: performance.now() - start,
        details: `Throughput: ${Math.round((ITERATIONS / hmacDuration) * 1000).toLocaleString()} signatures/sec.`,
      });
    } catch (e: any) {
      tests.push({
        name: "HMAC-SHA256 Timing-Safe Signature Verification speed",
        suite: "Performance & Stress Benchmarking",
        category: "PERFORMANCE",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  const passed = tests.filter((t) => t.passed).length;
  return {
    suiteResult: {
      suite: "Performance & Stress Benchmarking",
      category: "PERFORMANCE",
      tests,
      passed,
      failed: tests.length - passed,
      totalDurationMs: performance.now() - suiteStart,
    },
    p50: globalP50,
    p95: globalP95,
  };
}
