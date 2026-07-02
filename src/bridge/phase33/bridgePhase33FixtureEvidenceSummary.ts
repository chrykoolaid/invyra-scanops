import {
  createBridgePhase33FixtureImplementationIndexReport,
} from "./bridgePhase33FixtureImplementationIndex";

import type {
  BridgePhase33FixtureEvidenceSummaryEntry,
  BridgePhase33FixtureEvidenceSummaryReport,
} from "./bridgePhase33FixtureEvidenceSummaryTypes";

export function createBridgePhase33FixtureEvidenceSummaryReport(): BridgePhase33FixtureEvidenceSummaryReport {

  const implementationIndex = createBridgePhase33FixtureImplementationIndexReport();

  if (
    implementationIndex.implementationIndexDefined !== true ||
    implementationIndex.implementationSkeletonsDefined !== true ||
    implementationIndex.descriptorOnly !== true ||
    implementationIndex.readyForFixtureExecution !== false ||
    implementationIndex.crossRepoValidationConfirmed !== false ||
    implementationIndex.bridgeActivationAllowed !== false ||
    implementationIndex.safeToRunOperationalBridge !== false ||
    implementationIndex.persistenceAllowed !== false ||
    implementationIndex.inventoryMutationAllowed !== false ||
    implementationIndex.scanOpsMutationAllowed !== false ||
    implementationIndex.totals.indexedEntries !== 8 ||
    implementationIndex.totals.activeEntries !== 0
  ) {
    throw new Error(
      "Bridge Phase 33 fixture evidence summary detected implementation index drift."
    );
  }

  const summaryEntries: readonly BridgePhase33FixtureEvidenceSummaryEntry[] = Object.freeze(
    implementationIndex.indexEntries.map((entry) => Object.freeze({
      name: entry.name,
      summaryKey: `summary.${entry.assertionKey}`,
      sourceKey: entry.sourceKey,
      targetKey: entry.targetKey,
      assertionKey: entry.assertionKey,
      descriptorOnly: true,
      active: false,
    }))
  );

  if (
    summaryEntries.length !== 8 ||
    summaryEntries.some(
      (entry) =>
        entry.summaryKey.length === 0 ||
        entry.sourceKey.length === 0 ||
        entry.targetKey.length === 0 ||
        entry.assertionKey.length === 0 ||
        entry.descriptorOnly !== true ||
        entry.active !== false
    )
  ) {
    throw new Error(
      "Bridge Phase 33 fixture evidence summary detected summary drift."
    );
  }

  return {
    phase: "33.A16",
    status: "fixture-summary-defined-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    implementationIndex,
    summaryEntries,
    totals: {
      summaryEntries: 8,
      descriptorOnlyEntries: 8,
      activeEntries: 0,
      activationStepsAllowed: 0,
    },
    summaryDefined: true,
    implementationIndexDefined: true,
    descriptorOnly: true,
    readyForFixtureExecution: false,
    crossRepoValidationConfirmed: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    persistenceAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    nextAllowedStep: "phase-33-a17-fixture-evidence-readiness-review",
    reason:
      "Phase 33 A16 summarizes descriptor-only fixture implementation index entries while keeping fixture execution and bridge activation blocked.",
  };
}
