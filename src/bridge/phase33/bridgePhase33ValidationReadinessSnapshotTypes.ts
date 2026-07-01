import type {
  BridgePhase33FixtureSkeletonIndexReport,
} from "./bridgePhase33FixtureSkeletonIndexTypes";

export type BridgePhase33ValidationReadinessSnapshotPhase = "33.A12";

export type BridgePhase33ValidationReadinessSnapshotStatus = "ready-for-fixture-implementation-not-execution";

export interface BridgePhase33ValidationReadinessCheck {
  readonly name: string;

  readonly ready: boolean;

  readonly blocking: boolean;

  readonly reason: string;
}

export interface BridgePhase33ValidationReadinessSnapshotTotals {
  readonly readinessChecks: 8;

  readonly readyChecks: 5;

  readonly blockingChecks: 3;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33ValidationReadinessSnapshot {
  readonly phase: BridgePhase33ValidationReadinessSnapshotPhase;

  readonly status: BridgePhase33ValidationReadinessSnapshotStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly fixtureSkeletonIndex: BridgePhase33FixtureSkeletonIndexReport;

  readonly readinessChecks: readonly BridgePhase33ValidationReadinessCheck[];

  readonly totals: BridgePhase33ValidationReadinessSnapshotTotals;

  readonly fixturePlanDefined: true;

  readonly fixtureSkeletonsDefined: true;

  readonly fixtureIndexDefined: true;

  readonly readyForFixtureImplementation: true;

  readonly readyForFixtureExecution: false;

  readonly crossRepoValidationConfirmed: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly persistenceAllowed: false;

  readonly inventoryMutationAllowed: false;

  readonly scanOpsMutationAllowed: false;

  readonly nextAllowedStep: "phase-33-a13-fixture-implementation-plan";

  readonly reason: string;
}
