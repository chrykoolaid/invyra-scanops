import type {
  BridgePhase33FixtureEvidenceReadinessReviewReport,
} from "./bridgePhase33FixtureEvidenceReadinessReviewTypes";

export type BridgePhase33A18SnapshotPhase = "33.A18";

export type BridgePhase33A18SnapshotStatus = "a18-snapshot-defined-read-only";

export interface BridgePhase33A18SnapshotTotals {
  readonly checks: 8;

  readonly readyChecks: 5;

  readonly blockingChecks: 3;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33A18SnapshotReport {
  readonly phase: BridgePhase33A18SnapshotPhase;

  readonly status: BridgePhase33A18SnapshotStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly readinessReview: BridgePhase33FixtureEvidenceReadinessReviewReport;

  readonly totals: BridgePhase33A18SnapshotTotals;

  readonly snapshotDefined: true;

  readonly reviewComplete: true;

  readonly summaryDefined: true;

  readonly descriptorOnly: true;

  readonly readyForNextPlanning: true;

  readonly readyForFixtureExecution: false;

  readonly crossRepoValidationConfirmed: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly persistenceAllowed: false;

  readonly inventoryMutationAllowed: false;

  readonly scanOpsMutationAllowed: false;

  readonly nextAllowedStep: "phase-33-a19-cross-repo-fixture-planning-review";

  readonly reason: string;
}
