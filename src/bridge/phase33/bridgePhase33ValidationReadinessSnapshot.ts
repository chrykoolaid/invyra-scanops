import {
  createBridgePhase33FixtureSkeletonIndexReport,
} from "./bridgePhase33FixtureSkeletonIndex";

import type {
  BridgePhase33ValidationReadinessCheck,
  BridgePhase33ValidationReadinessSnapshot,
} from "./bridgePhase33ValidationReadinessSnapshotTypes";

export const BRIDGE_PHASE_33_VALIDATION_READINESS_CHECKS: readonly BridgePhase33ValidationReadinessCheck[] = Object.freeze([
  {
    name: "Counterpart alignment confirmed",
    ready: true,
    blocking: false,
    reason: "ScanOps and Inventory counterpart baselines are aligned.",
  },
  {
    name: "Fixture plan defined",
    ready: true,
    blocking: false,
    reason: "The cross-repo validation fixture plan is defined.",
  },
  {
    name: "Fixture skeletons defined",
    ready: true,
    blocking: false,
    reason: "The fixture skeleton keys are defined.",
  },
  {
    name: "Fixture index defined",
    ready: true,
    blocking: false,
    reason: "The fixture skeleton index is defined.",
  },
  {
    name: "Fixture implementation may be planned",
    ready: true,
    blocking: false,
    reason: "A follow-up implementation plan may be prepared without running bridge behavior.",
  },
  {
    name: "Fixture execution approval pending",
    ready: false,
    blocking: true,
    reason: "Fixture execution remains pending and requires a separate approval gate.",
  },
  {
    name: "Persistence approval pending",
    ready: false,
    blocking: true,
    reason: "Persistence remains unavailable until a separate persistence policy is approved.",
  },
  {
    name: "Operational bridge approval pending",
    ready: false,
    blocking: true,
    reason: "The operational bridge remains inactive until a separate activation gate is approved.",
  },
]);

export function createBridgePhase33ValidationReadinessSnapshot(): BridgePhase33ValidationReadinessSnapshot {

  const fixtureSkeletonIndex = createBridgePhase33FixtureSkeletonIndexReport();

  if (
    fixtureSkeletonIndex.indexDefined !== true ||
    fixtureSkeletonIndex.skeletonsDefined !== true ||
    fixtureSkeletonIndex.crossRepoValidationConfirmed !== false ||
    fixtureSkeletonIndex.bridgeActivationAllowed !== false ||
    fixtureSkeletonIndex.safeToRunOperationalBridge !== false ||
    fixtureSkeletonIndex.persistenceAllowed !== false ||
    fixtureSkeletonIndex.inventoryMutationAllowed !== false ||
    fixtureSkeletonIndex.scanOpsMutationAllowed !== false ||
    fixtureSkeletonIndex.totals.indexedEntries !== 8 ||
    fixtureSkeletonIndex.totals.activeEntries !== 0
  ) {
    throw new Error(
      "Bridge Phase 33 validation readiness snapshot detected fixture index drift."
    );
  }

  const readyChecks = BRIDGE_PHASE_33_VALIDATION_READINESS_CHECKS.filter(
    (check) => check.ready === true
  );

  const blockingChecks = BRIDGE_PHASE_33_VALIDATION_READINESS_CHECKS.filter(
    (check) => check.blocking === true
  );

  if (
    BRIDGE_PHASE_33_VALIDATION_READINESS_CHECKS.length !== 8 ||
    readyChecks.length !== 5 ||
    blockingChecks.length !== 3
  ) {
    throw new Error(
      "Bridge Phase 33 validation readiness snapshot detected readiness drift."
    );
  }

  return {
    phase: "33.A12",
    status: "ready-for-fixture-implementation-not-execution",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    fixtureSkeletonIndex,
    readinessChecks: BRIDGE_PHASE_33_VALIDATION_READINESS_CHECKS,
    totals: {
      readinessChecks: 8,
      readyChecks: 5,
      blockingChecks: 3,
      activationStepsAllowed: 0,
    },
    fixturePlanDefined: true,
    fixtureSkeletonsDefined: true,
    fixtureIndexDefined: true,
    readyForFixtureImplementation: true,
    readyForFixtureExecution: false,
    crossRepoValidationConfirmed: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    persistenceAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    nextAllowedStep: "phase-33-a13-fixture-implementation-plan",
    reason:
      "Phase 33 A12 confirms the bridge is ready to plan fixture implementation only. Fixture execution, persistence, mutation, and operational activation remain blocked.",
  };
}
