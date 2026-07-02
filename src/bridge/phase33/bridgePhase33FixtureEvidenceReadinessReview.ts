import {
  createBridgePhase33FixtureEvidenceSummaryReport,
} from "./bridgePhase33FixtureEvidenceSummary";

import type {
  BridgePhase33FixtureEvidenceReadinessReviewReport,
  BridgePhase33FixtureReadinessCheck,
} from "./bridgePhase33FixtureEvidenceReadinessReviewTypes";

export const BRIDGE_PHASE_33_FIXTURE_READINESS_CHECKS: readonly BridgePhase33FixtureReadinessCheck[] = Object.freeze([
  { name: "A15 index available", ready: true, blocking: false, reason: "Ready." },
  { name: "A16 summary available", ready: true, blocking: false, reason: "Ready." },
  { name: "Entries complete", ready: true, blocking: false, reason: "Ready." },
  { name: "Entries inactive", ready: true, blocking: false, reason: "Ready." },
  { name: "Next planning available", ready: true, blocking: false, reason: "Ready." },
  { name: "Run gate pending", ready: false, blocking: true, reason: "Pending." },
  { name: "Storage gate pending", ready: false, blocking: true, reason: "Pending." },
  { name: "Operational gate pending", ready: false, blocking: true, reason: "Pending." },
]);

export function createBridgePhase33FixtureEvidenceReadinessReviewReport(): BridgePhase33FixtureEvidenceReadinessReviewReport {
  const summaryReport = createBridgePhase33FixtureEvidenceSummaryReport();

  return {
    phase: "33.A17",
    status: "fixture-readiness-review-complete-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    summaryReport,
    checks: BRIDGE_PHASE_33_FIXTURE_READINESS_CHECKS,
    totals: {
      checks: 8,
      readyChecks: 5,
      blockingChecks: 3,
      activationStepsAllowed: 0,
    },
    reviewComplete: true,
    summaryDefined: true,
    descriptorOnly: true,
    readyForNextPlanning: true,
    readyForFixtureExecution: false,
    crossRepoValidationConfirmed: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    persistenceAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    nextAllowedStep: "phase-33-a18-fixture-evidence-closure-snapshot",
    reason: "Phase 33 A17 records descriptor readiness status.",
  };
}
