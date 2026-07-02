import {
  createBridgePhase33FixtureImplementationSkeletonReport,
} from "./bridgePhase33FixtureImplementationSkeletons";

import type {
  BridgePhase33FixtureImplementationIndexEntry,
  BridgePhase33FixtureImplementationIndexReport,
} from "./bridgePhase33FixtureImplementationIndexTypes";

export function createBridgePhase33FixtureImplementationIndexReport(): BridgePhase33FixtureImplementationIndexReport {

  const skeletonReport = createBridgePhase33FixtureImplementationSkeletonReport();

  if (
    skeletonReport.implementationSkeletonsDefined !== true ||
    skeletonReport.implementationPlanDefined !== true ||
    skeletonReport.descriptorOnly !== true ||
    skeletonReport.readyForFixtureExecution !== false ||
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
      "Bridge Phase 33 fixture implementation index detected skeleton report drift."
    );
  }

  const indexEntries: readonly BridgePhase33FixtureImplementationIndexEntry[] = Object.freeze(
    skeletonReport.skeletons.map((skeleton) => Object.freeze({
      name: skeleton.name,
      sourceKey: skeleton.sourceKey,
      targetKey: skeleton.targetKey,
      assertionKey: skeleton.assertionKey,
      indexed: true,
      descriptorOnly: true,
      active: false,
    }))
  );

  if (
    indexEntries.length !== 8 ||
    indexEntries.some(
      (entry) =>
        entry.sourceKey.length === 0 ||
        entry.targetKey.length === 0 ||
        entry.assertionKey.length === 0 ||
        entry.indexed !== true ||
        entry.descriptorOnly !== true ||
        entry.active !== false
    )
  ) {
    throw new Error(
      "Bridge Phase 33 fixture implementation index detected index drift."
    );
  }

  return {
    phase: "33.A15",
    status: "fixture-implementation-index-defined-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    skeletonReport,
    indexEntries,
    totals: {
      indexedEntries: 8,
      descriptorOnlyEntries: 8,
      activeEntries: 0,
      activationStepsAllowed: 0,
    },
    implementationIndexDefined: true,
    implementationSkeletonsDefined: true,
    descriptorOnly: true,
    readyForFixtureExecution: false,
    crossRepoValidationConfirmed: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    persistenceAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    nextAllowedStep: "phase-33-a16-fixture-evidence-summary",
    reason:
      "Phase 33 A15 indexes descriptor-only fixture implementation skeletons while keeping later fixture execution and bridge activation blocked.",
  };
}
