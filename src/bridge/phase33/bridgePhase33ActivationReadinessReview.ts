import {
  createBridgePhase33PlanningBundle,
} from "./bridgePhase33PlanningBundle";

import type {
  BridgePhase33ActivationReadinessReview,
  BridgePhase33ReadinessCheck,
} from "./bridgePhase33ActivationReadinessReviewTypes";

export const BRIDGE_PHASE_33_ACTIVATION_READINESS_CHECKS: readonly BridgePhase33ReadinessCheck[] = Object.freeze([
  {
    name: "Phase 32 cleanup complete",
    ready: true,
    blocking: false,
    reason: "Phase 32 cleanup report is available and Phase 33 A1 baseline was established.",
  },
  {
    name: "Phase 33 planning bundle complete",
    ready: true,
    blocking: false,
    reason: "Phase 33 A2-A5 planning, dependency, counterpart, and end-to-end path maps are present.",
  },
  {
    name: "External ScanOps bridge surfaces acknowledged",
    ready: true,
    blocking: false,
    reason: "Bridge Phases 8 through 13 are acknowledged as external surfaces outside Phase 33 ownership.",
  },
  {
    name: "Inventory counterpart baseline confirmed",
    ready: false,
    blocking: true,
    reason: "Inventory repository counterpart contracts must be confirmed before activation work can proceed.",
  },
  {
    name: "Cross-repo validation fixtures confirmed",
    ready: false,
    blocking: true,
    reason: "End-to-end fixtures across ScanOps and Inventory are not yet confirmed.",
  },
  {
    name: "Transport activation gate approved",
    ready: false,
    blocking: true,
    reason: "Transport remains planning-only until a separate activation gate is approved.",
  },
  {
    name: "Persistence policy approved",
    ready: false,
    blocking: true,
    reason: "Queue and inbox persistence policy must be approved before writes are introduced.",
  },
  {
    name: "Receipt application authority confirmed",
    ready: false,
    blocking: true,
    reason: "Inventory Desktop must remain the authority for receipt application and mutation decisions.",
  },
  {
    name: "Audit and rollback plan confirmed",
    ready: false,
    blocking: true,
    reason: "Cross-repo audit evidence and rollback behavior must be confirmed before activation.",
  },
  {
    name: "Operational activation approval granted",
    ready: false,
    blocking: true,
    reason: "No operational activation approval has been granted in Phase 33 A6.",
  },
]);

export function createBridgePhase33ActivationReadinessReview(): BridgePhase33ActivationReadinessReview {

  const planningBundle = createBridgePhase33PlanningBundle();

  if (
    planningBundle.planningOnly !== true ||
    planningBundle.phase33OperationalActivationAllowed !== false ||
    planningBundle.bridgeActivationAllowed !== false ||
    planningBundle.safeToRunOperationalBridge !== false ||
    planningBundle.executionAllowed !== false ||
    planningBundle.persistenceAllowed !== false ||
    planningBundle.inventoryMutationAllowed !== false ||
    planningBundle.scanOpsMutationAllowed !== false ||
    planningBundle.totals.activationStepsAllowed !== 0
  ) {
    throw new Error(
      "Bridge Phase 33 activation readiness review detected planning bundle drift."
    );
  }

  const readyChecks = BRIDGE_PHASE_33_ACTIVATION_READINESS_CHECKS.filter(
    (check) => check.ready === true
  );

  const blockingChecks = BRIDGE_PHASE_33_ACTIVATION_READINESS_CHECKS.filter(
    (check) => check.blocking === true
  );

  if (
    BRIDGE_PHASE_33_ACTIVATION_READINESS_CHECKS.length !== 10 ||
    readyChecks.length !== 3 ||
    blockingChecks.length !== 7
  ) {
    throw new Error(
      "Bridge Phase 33 activation readiness review detected readiness check drift."
    );
  }

  return {
    phase: "33.A6",
    status: "not-ready-for-activation",
    decision: "blocked",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    planningBundle,
    readinessChecks: BRIDGE_PHASE_33_ACTIVATION_READINESS_CHECKS,
    totals: {
      readinessChecks: 10,
      readyChecks: 3,
      blockingChecks: 7,
      activationStepsAllowed: 0,
    },
    phase33PlanningComplete: true,
    inventoryCounterpartRequired: true,
    inventoryCounterpartConfirmed: false,
    crossRepoValidationRequired: true,
    crossRepoValidationConfirmed: false,
    activationGateRequired: true,
    activationGateApproved: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    executionAllowed: false,
    persistenceAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    nextAllowedStep: "phase-33-a7-inventory-counterpart-baseline",
    reason:
      "Phase 33 A6 confirms planning readiness but blocks activation until Inventory counterpart, cross-repo validation, persistence, audit, rollback, and explicit activation gates are completed.",
  };
}
