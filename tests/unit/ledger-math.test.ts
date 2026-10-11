import { TestResult, TestSuiteResult } from "../types";

export interface LineItemInput {
  name: string;
  qty: number;
  pricePerUnit: number;
}

export function computeOrderTotals(
  items: LineItemInput[],
  paymentType: "DEBIT" | "CREDIT" | "PARTIAL",
  paidAmountInput?: number
): {
  subtotal: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  lineTotals: number[];
} {
  const lineTotals = items.map((item) => {
    // Round to 2 decimal places (paise) to prevent IEEE 754 float drift
    return Math.round(item.qty * item.pricePerUnit * 100) / 100;
  });

  const totalAmount = lineTotals.reduce((sum, val) => Math.round((sum + val) * 100) / 100, 0);

  let paidAmount = 0;
  if (paymentType === "DEBIT") {
    paidAmount = totalAmount;
  } else if (paymentType === "CREDIT") {
    paidAmount = 0;
  } else if (paymentType === "PARTIAL") {
    paidAmount = Math.min(totalAmount, Math.max(0, Math.round((paidAmountInput || 0) * 100) / 100));
  }

  const balanceAmount = Math.round((totalAmount - paidAmount) * 100) / 100;

  return {
    subtotal: totalAmount,
    totalAmount,
    paidAmount,
    balanceAmount,
    lineTotals,
  };
}

export async function runLedgerMathTests(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];
  const suiteStart = performance.now();

  // Test 1: Full Debit / Nagathu - zero remaining balance
  (() => {
    const start = performance.now();
    try {
      const items: LineItemInput[] = [
        { name: "Pattu Saree", qty: 2, pricePerUnit: 1250 },
        { name: "Cotton Kurti", qty: 3, pricePerUnit: 450 },
      ];
      const res = computeOrderTotals(items, "DEBIT");
      if (res.totalAmount !== 3850 || res.paidAmount !== 3850 || res.balanceAmount !== 0) {
        throw new Error(`Debit ledger mismatch: total=${res.totalAmount}, paid=${res.paidAmount}, bal=${res.balanceAmount}`);
      }
      tests.push({
        name: "DEBIT (నగదు / Nagathu) settlement leaves zero outstanding balance",
        suite: "Bahi-Khata Ledger Mathematics",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Total ₹3,850.00 fully paid, resulting balance: ₹0.00.",
      });
    } catch (e: any) {
      tests.push({
        name: "DEBIT (నగదు / Nagathu) settlement leaves zero outstanding balance",
        suite: "Bahi-Khata Ledger Mathematics",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 2: Full Credit / Udhaar - 100% outstanding balance
  (() => {
    const start = performance.now();
    try {
      const items: LineItemInput[] = [
        { name: "Banarasi Dupatta", qty: 4, pricePerUnit: 600 },
        { name: "Men's Dhoti", qty: 2, pricePerUnit: 550 },
      ];
      const res = computeOrderTotals(items, "CREDIT");
      if (res.totalAmount !== 3500 || res.paidAmount !== 0 || res.balanceAmount !== 3500) {
        throw new Error(`Credit ledger mismatch: total=${res.totalAmount}, paid=${res.paidAmount}, bal=${res.balanceAmount}`);
      }
      tests.push({
        name: "CREDIT (ఉద్ధార / Udhaar) transfers full transaction value to customer ledger debit",
        suite: "Bahi-Khata Ledger Mathematics",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Total ₹3,500.00 unpaid, resulting balance: ₹3,500.00.",
      });
    } catch (e: any) {
      tests.push({
        name: "CREDIT (ఉద్ధార / Udhaar) transfers full transaction value to customer ledger debit",
        suite: "Bahi-Khata Ledger Mathematics",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 3: Partial Settlement - accurate split between cash and ledger debt
  (() => {
    const start = performance.now();
    try {
      const items: LineItemInput[] = [
        { name: "Zari Silk Border", qty: 5, pricePerUnit: 1000 },
      ];
      const res = computeOrderTotals(items, "PARTIAL", 2000);
      if (res.totalAmount !== 5000 || res.paidAmount !== 2000 || res.balanceAmount !== 3000) {
        throw new Error(`Partial ledger mismatch: total=${res.totalAmount}, paid=${res.paidAmount}, bal=${res.balanceAmount}`);
      }
      tests.push({
        name: "PARTIAL (పాక్షిక) correctly splits cash paid vs remaining Udhaar ledger",
        suite: "Bahi-Khata Ledger Mathematics",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Total ₹5,000.00, Paid: ₹2,000.00, Balance: ₹3,000.00.",
      });
    } catch (e: any) {
      tests.push({
        name: "PARTIAL (పాక్షిక) correctly splits cash paid vs remaining Udhaar ledger",
        suite: "Bahi-Khata Ledger Mathematics",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  // Test 4: Floating point paise precision (prevent IEEE 754 rounding errors)
  (() => {
    const start = performance.now();
    try {
      const items: LineItemInput[] = [
        { name: "Item A", qty: 3, pricePerUnit: 19.99 },
        { name: "Item B", qty: 7, pricePerUnit: 33.33 },
      ];
      // 3 * 19.99 = 59.97, 7 * 33.33 = 233.31 => total = 293.28
      const res = computeOrderTotals(items, "PARTIAL", 100.28);
      // In naive floats 293.28 - 100.28 can equal 192.99999999999997
      if (res.totalAmount !== 293.28 || res.balanceAmount !== 193.00) {
        throw new Error(`Float drift detected: total=${res.totalAmount}, bal=${res.balanceAmount}`);
      }
      tests.push({
        name: "Floating-point paise precision (prevents IEEE-754 currency drift)",
        suite: "Bahi-Khata Ledger Mathematics",
        category: "UNIT",
        passed: true,
        durationMs: performance.now() - start,
        details: "Verified exact cents/paise arithmetic on fractional values without float leaks.",
      });
    } catch (e: any) {
      tests.push({
        name: "Floating-point paise precision (prevents IEEE-754 currency drift)",
        suite: "Bahi-Khata Ledger Mathematics",
        category: "UNIT",
        passed: false,
        durationMs: performance.now() - start,
        error: e.message,
      });
    }
  })();

  const passed = tests.filter((t) => t.passed).length;
  return {
    suite: "Bahi-Khata Ledger Mathematics",
    category: "UNIT",
    tests,
    passed,
    failed: tests.length - passed,
    totalDurationMs: performance.now() - suiteStart,
  };
}
