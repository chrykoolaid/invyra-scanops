import {
  createBridgePhase33A19PlanningReviewReport,
} from "./bridgePhase33A19PlanningReview";

import type {
  BridgePhase33A20ReadinessIndexEntry,
  BridgePhase33A20ReadinessIndexReport,
} from "./bridgePhase33A20ReadinessIndexTypes";

export function createBridgePhase33A20ReadinessIndexReport(): BridgePhase33A20ReadinessIndexReport {
  const planningReview = createBridgePhase33A19PlanningReviewReport();

  const indexEntries: readonly BridgePhase33A20ReadinessIndexEntry[] = Object.freeze(
    planningReview.reviewItems.map((item, index) => Object.freeze({
      name: item.name,
      indexKey: `a20:${index}:${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      ready: item.ready,
      blocked: item.blocked,
    }))
  );

  return Object.freeze({
    phase: "33.A20",
    status: "a20-readiness-index-defined-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    planningReview,
    indexEntries,
    totals: Object.freeze({
      indexedItems: 6,
      readyItems: 4,
      blockedItems: 2,
      activationStepsAllowed: 0,
    }),
    readinessIndexDefined: true,
    planningReviewDefined: true,
    readyForNextPlanning: true,
    readyForFixtureExecution: false,
    crossRepoValidationConfirmed: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    nextAllowedStep: "phase-33-a21-cross-repo-fixture-readiness-summary",
  });
}
