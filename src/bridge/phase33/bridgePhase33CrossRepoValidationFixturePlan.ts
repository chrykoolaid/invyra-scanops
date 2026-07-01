import {
  createBridgePhase33CrossRepoCounterpartAlignmentReview,
} from "./bridgePhase33CrossRepoCounterpartAlignment";

import type {
  BridgePhase33CrossRepoValidationFixturePlan,
  BridgePhase33ValidationFixturePlanEntry,
} from "./bridgePhase33CrossRepoValidationFixturePlanTypes";

export const BRIDGE_PHASE_33_CROSS_REPO_VALIDATION_FIXTURE_PLAN: readonly BridgePhase33ValidationFixturePlanEntry[] = Object.freeze([
  { name: "Bridge availability descriptor alignment", scanOpsFixtureRequired: true, inventoryFixtureRequired: true, assertionRequired: true, active: false },
  { name: "Pairing offer and request alignment", scanOpsFixtureRequired: true, inventoryFixtureRequired: true, assertionRequired: true, active: false },
  { name: "Trusted device registry alignment", scanOpsFixtureRequired: true, inventoryFixtureRequired: true, assertionRequired: true, active: false },
  { name: "Bridge receive endpoint envelope alignment", scanOpsFixtureRequired: true, inventoryFixtureRequired: true, assertionRequired: true, active: false },
  { name: "Inbox admission policy alignment", scanOpsFixtureRequired: true, inventoryFixtureRequired: true, assertionRequired: true, active: false },
  { name: "Receipt review boundary alignment", scanOpsFixtureRequired: true, inventoryFixtureRequired: true, assertionRequired: true, active: false },
  { name: "Acknowledgement contract alignment", scanOpsFixtureRequired: true, inventoryFixtureRequired: true, assertionRequired: true, active: false },
  { name: "Recovery and audit policy alignment", scanOpsFixtureRequired: true, inventoryFixtureRequired: true, assertionRequired: true, active: false },
]);

export function createBridgePhase33CrossRepoValidationFixturePlan(): BridgePhase33CrossRepoValidationFixturePlan {

  const counterpartAlignmentReview = createBridgePhase33CrossRepoCounterpartAlignmentReview();

  if (
    counterpartAlignmentReview.crossRepoCounterpartAlignmentConfirmed !== true ||
    counterpartAlignmentReview.crossRepoValidationConfirmed !== false ||
    counterpartAlignmentReview.bridgeActivationAllowed !== false ||
    counterpartAlignmentReview.safeToRunOperationalBridge !== false ||
    counterpartAlignmentReview.persistenceAllowed !== false ||
    counterpartAlignmentReview.inventoryMutationAllowed !== false ||
    counterpartAlignmentReview.scanOpsMutationAllowed !== false ||
    counterpartAlignmentReview.totals.alignedCounterparts !== 8
  ) {
    throw new Error(
      "Bridge Phase 33 validation fixture plan detected counterpart alignment drift."
    );
  }

  if (
    BRIDGE_PHASE_33_CROSS_REPO_VALIDATION_FIXTURE_PLAN.length !== 8 ||
    BRIDGE_PHASE_33_CROSS_REPO_VALIDATION_FIXTURE_PLAN.some(
      (fixture) =>
        fixture.scanOpsFixtureRequired !== true ||
        fixture.inventoryFixtureRequired !== true ||
        fixture.assertionRequired !== true ||
        fixture.active !== false
    )
  ) {
    throw new Error(
      "Bridge Phase 33 validation fixture plan detected fixture plan drift."
    );
  }

  return {
    phase: "33.A9",
    status: "fixture-plan-defined-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    counterpartAlignmentReview,
    plannedFixtures: BRIDGE_PHASE_33_CROSS_REPO_VALIDATION_FIXTURE_PLAN,
    totals: {
      plannedFixtureGroups: 8,
      scanOpsFixturesRequired: 8,
      inventoryFixturesRequired: 8,
      activeFixtures: 0,
      activationStepsAllowed: 0,
    },
    fixturePlanDefined: true,
    crossRepoCounterpartAlignmentConfirmed: true,
    crossRepoValidationRequired: true,
    crossRepoValidationConfirmed: false,
    fixturePlanActive: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    persistenceAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    nextAllowedStep: "phase-33-a10-cross-repo-validation-fixture-skeletons",
    reason:
      "Phase 33 A9 defines the cross-repo validation fixture plan while keeping the bridge inactive and waiting for separate fixture skeleton work.",
  };
}
