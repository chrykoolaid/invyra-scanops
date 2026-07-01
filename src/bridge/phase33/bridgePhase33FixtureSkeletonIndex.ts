import {
  createBridgePhase33ValidationFixtureSkeletonReport,
} from "./bridgePhase33ValidationFixtureSkeletons";

import type {
  BridgePhase33FixtureSkeletonIndexEntry,
  BridgePhase33FixtureSkeletonIndexReport,
} from "./bridgePhase33FixtureSkeletonIndexTypes";

export function createBridgePhase33FixtureSkeletonIndexReport(): BridgePhase33FixtureSkeletonIndexReport {

  const skeletonReport = createBridgePhase33ValidationFixtureSkeletonReport();

  if (
    skeletonReport.skeletonsDefined !== true ||
    skeletonReport.fixturePlanActive !== false ||
    skeletonReport.crossRepoValidationConfirmed !== false ||
    skeletonReport.bridgeActivationAllowed !== false ||
    skeletonReport.safeToRunOperationalBridge !== false ||
    skeletonReport.persistenceAllowed !== false ||
    skeletonReport.inventoryMutationAllowed !== false ||
    skeletonReport.scanOpsMutationAllowed !== false ||
    skeletonReport.totals.skeletons !== 8 ||
    skeletonReport.totals.activeSkeletons !== 0
  ) {
    throw new Error(
      "Bridge Phase 33 fixture skeleton index detected skeleton report drift."
    );
  }

  const indexEntries: readonly BridgePhase33FixtureSkeletonIndexEntry[] = Object.freeze(
    skeletonReport.skeletons.map((skeleton) => Object.freeze({
      name: skeleton.name,
      scanOpsFixtureKey: skeleton.scanOpsFixtureKey,
      inventoryFixtureKey: skeleton.inventoryFixtureKey,
      assertionKey: skeleton.assertionKey,
      indexed: true,
      active: false,
    }))
  );

  if (
    indexEntries.length !== 8 ||
    indexEntries.some(
      (entry) =>
        entry.scanOpsFixtureKey.length === 0 ||
        entry.inventoryFixtureKey.length === 0 ||
        entry.assertionKey.length === 0 ||
        entry.indexed !== true ||
        entry.active !== false
    )
  ) {
    throw new Error(
      "Bridge Phase 33 fixture skeleton index detected index drift."
    );
  }

  return {
    phase: "33.A11",
    status: "fixture-skeleton-index-defined-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    skeletonReport,
    indexEntries,
    totals: {
      indexedEntries: 8,
      scanOpsKeys: 8,
      inventoryKeys: 8,
      assertionKeys: 8,
      activeEntries: 0,
      activationStepsAllowed: 0,
    },
    indexDefined: true,
    skeletonsDefined: true,
    crossRepoValidationConfirmed: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    persistenceAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    nextAllowedStep: "phase-33-a12-cross-repo-validation-readiness-snapshot",
    reason:
      "Phase 33 A11 indexes fixture skeleton keys for later validation planning while keeping the bridge inactive.",
  };
}
