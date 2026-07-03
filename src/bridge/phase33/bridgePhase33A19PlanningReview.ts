import {
  createBridgePhase33A18Report,
} from "./bridgePhase33A18";

import type {
  BridgePhase33A19PlanningReviewItem,
  BridgePhase33A19PlanningReviewReport,
} from "./bridgePhase33A19PlanningReviewTypes";

export const BRIDGE_PHASE_33_A19_PLANNING_REVIEW_ITEMS: readonly BridgePhase33A19PlanningReviewItem[] = Object.freeze([
  { name: "A18 snapshot available", ready: true, blocked: false },
  { name: "Review chain available", ready: true, blocked: false },
  { name: "Descriptor chain available", ready: true, blocked: false },
  { name: "Next planning allowed", ready: true, blocked: false },
  { name: "Fixture run gate pending", ready: false, blocked: true },
  { name: "Operational gate pending", ready: false, blocked: true },
]);

export function createBridgePhase33A19PlanningReviewReport(): BridgePhase33A19PlanningReviewReport {
  const a18Snapshot = createBridgePhase33A18Report();

  return Object.freeze({
    phase: "33.A19",
    status: "a19-planning-review-defined-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    a18Snapshot,
    reviewItems: BRIDGE_PHASE_33_A19_PLANNING_REVIEW_ITEMS,
    totals: Object.freeze({
      reviewItems: 6,
      readyItems: 4,
      blockedItems: 2,
      activationStepsAllowed: 0,
    }),
    planningReviewDefined: true,
    readyForNextPlanning: true,
    readyForFixtureExecution: false,
    crossRepoValidationConfirmed: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    nextAllowedStep: "phase-33-a20-cross-repo-fixture-readiness-index",
  });
}
