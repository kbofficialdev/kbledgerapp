import { TestResult, TestSuiteResult } from "../types";

// Biometric mathematical distance & similarity models
export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    if (isNaN(a) || isNaN(b) || !isFinite(a) || !isFinite(b)) return 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function computeEuclideanDistance(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 999;
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    if (isNaN(a) || isNaN(b) || !isFinite(a) || !isFinite(b)) return 999;
    const diff = a - b;
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function evaluateBiometricMatch(
  liveDescriptor: number[],
  enrolledDescriptor: number[],
  cosineThreshold = 0.80,
  euclideanThreshold = 0.45
): { match: boolean; similarity: number; distance: number; error?: string } {
  if (!Array.isArray(liveDescriptor) || liveDescriptor.length < 32) {
    return { match: false, similarity: 0, distance: 999, error: "Invalid live biometric descriptor format" };
  }
  if (!Array.isArray(enrolledDescriptor) || enrolledDescriptor.length < 32) {
    return { match: false, similarity: 0, distance: 999, error: "Invalid enrolled biometric descriptor format" };
  }
  if (liveDescriptor.length !== enrolledDescriptor.length) {
    return { match: false, similarity: 0, distance: 999, error: "Descriptor dimensionality mismatch" };
  }

  // Anti-spoofing: Check for all-zero or degenerate vectors
  const liveNorm = Math.sqrt(liveDescriptor.reduce((acc, v) => acc + v * v, 0));
  if (liveNorm < 0.001) {
    return { match: false, similarity: 0, distance: 999, error: "Degenerate zero-vector detected (possible sensor occlusion or spoof)" };
  }

  const similarity = computeCosineSimilarity(liveDescriptor, enrolledDescriptor);
  const distance = computeEuclideanDistance(liveDescriptor, enrolledDescriptor);
  const match = similarity >= cosineThreshold || distance <= euclideanThreshold;

  return { match, similarity, distance };
}

export async function runBiometricsTests(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];
  const suiteStart = performance.now();

  // Helper: create normalized mock 128-d descriptor
  const makeVector = (seed: number, length = 128): number[] => {
    const vec: number[] = [];
    for (let i = 0; i < length; i++) {
      vec.push(Math.sin(seed * (i + 1)));
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return vec.map((v) => v / norm);
  };

  // Test 1: Identical 128-d facial vector produces unit cosine similarity (1.0)
  (() => {
    const start = performance.now();
    try {
      const v = makeVector(1.5);
      const sim = computeCosineSimilarity(v, v);
      if (Math.abs(sim - 1.0) > 0.0001) {
        throw new Error(`Expected cosine similarity ~1.0, got ${sim}`);
      }
      tests.push({
        name: "Identical 128-d face vector yields unit similarity (1.000)",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Cosine similarity precisely matched 1.0000 on identical vectors.",
      });
    } catch (e: any) {
      tests.push({
        name: "Identical 128-d face vector yields unit similarity (1.000)",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 2: Perturbed face vector within threshold (sim >= 0.80) matches
  (() => {
    const start = performance.now();
    try {
      const v1 = makeVector(1.5);
      // Small 5% noise simulating ambient lighting variation
      const v2 = v1.map((val) => val + 0.04 * (Math.random() - 0.5));
      const res = evaluateBiometricMatch(v2, v1);
      if (!res.match || res.similarity < 0.80) {
        throw new Error(`Expected match with similarity >= 0.80, got sim=${res.similarity}, dist=${res.distance}`);
      }
      tests.push({
        name: "Slight perturbation (lighting/angle) accepts with similarity >= 0.80",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: `Live similarity ${res.similarity.toFixed(4)} exceeded strict 0.80 threshold.`,
      });
    } catch (e: any) {
      tests.push({
        name: "Slight perturbation (lighting/angle) accepts with similarity >= 0.80",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 3: Unenrolled different face vector rejected
  (() => {
    const start = performance.now();
    try {
      const adminFace = makeVector(1.234);
      const intruderFace = makeVector(8.765);
      const res = evaluateBiometricMatch(intruderFace, adminFace);
      if (res.match) {
        throw new Error(`Security breach: Intruder face matched admin profile! sim=${res.similarity}, dist=${res.distance}`);
      }
      tests.push({
        name: "Intruder / distinct face vector rejected (similarity < 0.80 & distance > 0.45)",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: `Properly repelled with similarity ${res.similarity.toFixed(4)} and distance ${res.distance.toFixed(4)}.`,
      });
    } catch (e: any) {
      tests.push({
        name: "Intruder / distinct face vector rejected (similarity < 0.80 & distance > 0.45)",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 4: Euclidean distance calculation accuracy
  (() => {
    const start = performance.now();
    try {
      const v1 = [0.2, 0.4, 0.4, 0.8];
      const v2 = [0.2, 0.4, 0.4, 0.8];
      const distZero = computeEuclideanDistance(v1, v2);
      const distDiff = computeEuclideanDistance([0, 0, 0], [1, 2, 2]); // sqrt(1+4+4) = 3
      if (distZero !== 0 || distDiff !== 3) {
        throw new Error(`Euclidean calculation incorrect: zero=${distZero}, diff=${distDiff}`);
      }
      tests.push({
        name: "Euclidean L2 distance calculation mathematically verified",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "L2 norm verified: exact zero for identical, sqrt(9)=3.0 for test vectors.",
      });
    } catch (e: any) {
      tests.push({
        name: "Euclidean L2 distance calculation mathematically verified",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 5: Dimensionality mismatch handling
  (() => {
    const start = performance.now();
    try {
      const v128 = makeVector(1.5, 128);
      const v64 = makeVector(1.5, 64);
      const res = evaluateBiometricMatch(v64, v128);
      if (res.match || !res.error?.includes("mismatch")) {
        throw new Error("Failed to reject dimension mismatch (64 vs 128)");
      }
      tests.push({
        name: "Reject descriptor dimensionality mismatch (64-d vs 128-d)",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Blocked vector size mismatch with structured exception.",
      });
    } catch (e: any) {
      tests.push({
        name: "Reject descriptor dimensionality mismatch (64-d vs 128-d)",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 6: Anti-spoofing zero-vector rejection
  (() => {
    const start = performance.now();
    try {
      const zeros = new Array(128).fill(0);
      const valid = makeVector(2.0, 128);
      const res = evaluateBiometricMatch(zeros, valid);
      if (res.match || !res.error?.includes("zero-vector")) {
        throw new Error("Anti-spoofing failed: Allowed all-zero descriptor");
      }
      tests.push({
        name: "Anti-spoofing: Reject degenerate all-zero descriptor (black frame / covered lens)",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Detected and rejected black frame occlusion vector with norm < 0.001.",
      });
    } catch (e: any) {
      tests.push({
        name: "Anti-spoofing: Reject degenerate all-zero descriptor (black frame / covered lens)",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 7: NaN and Infinity injection resilience
  (() => {
    const start = performance.now();
    try {
      const corrupt = makeVector(3.0, 128);
      corrupt[10] = NaN;
      corrupt[20] = Infinity;
      const valid = makeVector(3.0, 128);
      const sim = computeCosineSimilarity(corrupt, valid);
      const dist = computeEuclideanDistance(corrupt, valid);
      if (sim !== 0 || dist !== 999) {
        throw new Error(`Corrupt numeric input not sanitized: sim=${sim}, dist=${dist}`);
      }
      tests.push({
        name: "Input sanitization: Guard against NaN and Infinity floating-point poisoning",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Safely sanitized NaN and Inf vectors to safe failure states (sim=0, dist=999).",
      });
    } catch (e: any) {
      tests.push({
        name: "Input sanitization: Guard against NaN and Infinity floating-point poisoning",
        suite: "Biometric Authentication Engine",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  const passed = tests.filter((t) => t.passed).length;
  return {
    suite: "Biometric Authentication Engine",
    category: "UNIT",
    tests,
    passed,
    failed: tests.length - passed,
    totalDurationMs: performance.now() - suiteStart,
  };
}
