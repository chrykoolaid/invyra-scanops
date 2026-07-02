import type {
  BridgePhase33FixtureImplementationSkeletonReport,
} from "./bridgePhase33FixtureImplementationSkeletonTypes";

export type BridgePhase33FixtureImplementationIndexPhase = "33.A15";

export type BridgePhase33FixtureImplementationIndexStatus = "fixture-implementation-index-defined-read-only";

export interface BridgePhase33FixtureImplementationIndexEntry {
  readonly name: string;

  readonly sourceKey: string;

  readonly targetKey: string;

  readonly assertionKey: string;

  readonly indexed: true;

  readonly descriptorOnly: true;

  readonly active: false;
}

export interface BridgePhase33FixtureImplementationIndexTotals {
  readonly indexedEntries: 8;

  readonly descriptorOnlyEntries: 8;

  readonly activeEntries: 0;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33FixtureImplementationIndexReport {
  readonly phase: BridgePhase33FixtureImplementationIndexPhase;

  readonly status: BridgePhase33FixtureImplementationIndexStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly skeletonReport: BridgePhase33FixtureImplementationSkeletonReport;

  readonly indexEntries: readonly BridgePhase33FixtureImplementationIndexEntry[];

  readonly totals: BridgePhase33FixtureImplementationIndexTotals;

  readonly implementationIndexDefined: true;

  readonly implementationSkeletonsDefined: true;

  readonly descriptorOnly: true;

  readonly readyForFixtureExecution: false;

  readonly crossRepoValidationConfirmed: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly persistenceAllowed: false;

  readonly inventoryMutationAllowed: false;

  readonly scanOpsMutationAllowed: false;

  readonly nextAllowedStep: "phase-33-a16-fixture-evidence-summary";

  readonly reason: string;
}
