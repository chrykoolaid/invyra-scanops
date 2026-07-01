import type {
  BridgePhase33ValidationFixtureSkeletonReport,
} from "./bridgePhase33ValidationFixtureSkeletonTypes";

export type BridgePhase33FixtureSkeletonIndexPhase = "33.A11";

export type BridgePhase33FixtureSkeletonIndexStatus = "fixture-skeleton-index-defined-read-only";

export interface BridgePhase33FixtureSkeletonIndexEntry {
  readonly name: string;

  readonly scanOpsFixtureKey: string;

  readonly inventoryFixtureKey: string;

  readonly assertionKey: string;

  readonly indexed: true;

  readonly active: false;
}

export interface BridgePhase33FixtureSkeletonIndexTotals {
  readonly indexedEntries: 8;

  readonly scanOpsKeys: 8;

  readonly inventoryKeys: 8;

  readonly assertionKeys: 8;

  readonly activeEntries: 0;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33FixtureSkeletonIndexReport {
  readonly phase: BridgePhase33FixtureSkeletonIndexPhase;

  readonly status: BridgePhase33FixtureSkeletonIndexStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly skeletonReport: BridgePhase33ValidationFixtureSkeletonReport;

  readonly indexEntries: readonly BridgePhase33FixtureSkeletonIndexEntry[];

  readonly totals: BridgePhase33FixtureSkeletonIndexTotals;

  readonly indexDefined: true;

  readonly skeletonsDefined: true;

  readonly crossRepoValidationConfirmed: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly persistenceAllowed: false;

  readonly inventoryMutationAllowed: false;

  readonly scanOpsMutationAllowed: false;

  readonly nextAllowedStep: "phase-33-a12-cross-repo-validation-readiness-snapshot";

  readonly reason: string;
}
