import { buildTeluguCalloutSentence } from "../../src/lib/voice";
import { TestResult, TestSuiteResult } from "../types";

export async function runTeluguVoiceTests(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];
  const suiteStart = performance.now();

  // Test 1: Full Debit / Nagathu callout
  (() => {
    const start = performance.now();
    try {
      const sentence = buildTeluguCalloutSentence({
        customerName: "శివ రావు",
        villageName: "వేములవాడ",
        amount: 1450,
        paymentType: "DEBIT",
      });
      const hasCustomer = sentence.includes("శివ రావు");
      const hasVillage = sentence.includes("వేములవాడ");
      const hasAmount = sentence.includes("1450 రూపాయలు");
      const hasDebit = sentence.includes("నగదు చెల్లింపు (Nagathu / Debit)");

      if (!hasCustomer || !hasVillage || !hasAmount || !hasDebit) {
        throw new Error(`Telugu callout missing key tokens: "${sentence}"`);
      }
      tests.push({
        name: "Construct Telugu Debit / నగదు (Nagathu) voice callout with village & amount",
        suite: "Telugu Voice Synthesis Engine",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: `Generated: "${sentence}"`,
      });
    } catch (e: any) {
      tests.push({
        name: "Construct Telugu Debit / నగదు (Nagathu) voice callout with village & amount",
        suite: "Telugu Voice Synthesis Engine",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 2: Credit / Udhaar callout
  (() => {
    const start = performance.now();
    try {
      const sentence = buildTeluguCalloutSentence({
        customerName: "రమేష్ రెడ్డి",
        villageName: "సిరిసిల్ల",
        amount: 3200,
        paymentType: "CREDIT",
      });
      const hasCredit = sentence.includes("ఉద్ధార బకాయి (Udhaar / Credit)");
      if (!hasCredit) {
        throw new Error(`Telugu callout missing Udhaar token: "${sentence}"`);
      }
      tests.push({
        name: "Construct Telugu Credit / ఉద్ధార (Udhaar) debt warning callout",
        suite: "Telugu Voice Synthesis Engine",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: `Generated: "${sentence}"`,
      });
    } catch (e: any) {
      tests.push({
        name: "Construct Telugu Credit / ఉద్ధార (Udhaar) debt warning callout",
        suite: "Telugu Voice Synthesis Engine",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 3: Partial / పాక్షిక callout
  (() => {
    const start = performance.now();
    try {
      const sentence = buildTeluguCalloutSentence({
        customerName: "లక్ష్మి నారాయణ",
        villageName: "బోయిన్‌పల్లి",
        amount: 850,
        paymentType: "PARTIAL",
      });
      const hasPartial = sentence.includes("పాక్షిక చెల్లింపు మరియు ఉద్ధార (Partial)");
      if (!hasPartial) {
        throw new Error(`Telugu callout missing Partial token: "${sentence}"`);
      }
      tests.push({
        name: "Construct Telugu Partial / పాక్షిక mixed-settlement callout",
        suite: "Telugu Voice Synthesis Engine",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: `Generated: "${sentence}"`,
      });
    } catch (e: any) {
      tests.push({
        name: "Construct Telugu Partial / పాక్షిక mixed-settlement callout",
        suite: "Telugu Voice Synthesis Engine",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 4: Graceful handling of omitted optional parameters
  (() => {
    const start = performance.now();
    try {
      const sentence = buildTeluguCalloutSentence({
        customerName: "వెంకటేష్",
      });
      if (!sentence.includes("గౌరవనీయులు వెంకటేష్ గారు") || sentence.includes("గ్రామం:") || sentence.includes("రూపాయలు")) {
        throw new Error(`Unexpected sentence structure when optional fields omitted: "${sentence}"`);
      }
      tests.push({
        name: "Handle omitted optional attributes without syntax or placeholder defects",
        suite: "Telugu Voice Synthesis Engine",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: `Clean minimal sentence: "${sentence}"`,
      });
    } catch (e: any) {
      tests.push({
        name: "Handle omitted optional attributes without syntax or placeholder defects",
        suite: "Telugu Voice Synthesis Engine",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  const passed = tests.filter((t) => t.passed).length;
  return {
    suite: "Telugu Voice Synthesis Engine",
    category: "UNIT",
    tests,
    passed,
    failed: tests.length - passed,
    totalDurationMs: performance.now() - suiteStart,
  };
}
