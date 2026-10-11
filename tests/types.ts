export type TestCategory = "UNIT" | "INTEGRATION" | "SECURITY" | "PERFORMANCE";

export interface TestResult {
  name: string;
  suite: string;
  category: TestCategory;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

export interface TestSuiteResult {
  suite: string;
  category: TestCategory;
  tests: TestResult[];
  passed: number;
  failed: number;
  totalDurationMs: number;
}

export interface TestReportSummary {
  timestamp: string;
  systemName: string;
  version: string;
  environment: string;
  totalSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  totalDurationMs: number;
  suites: TestSuiteResult[];
  metrics: {
    unitTestsPassed: number;
    integrationTestsPassed: number;
    securityTestsPassed: number;
    performanceP50Ms: number;
    performanceP95Ms: number;
    vulnerabilitiesDetected: number;
    criticalFailures: number;
  };
}
