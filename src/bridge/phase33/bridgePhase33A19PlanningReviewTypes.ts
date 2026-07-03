import type {
  BridgePhase33A18SnapshotReport,
} from "./bridgePhase33A18SnapshotTypes";

export type BridgePhase33A19PlanningReviewPhase = "33.A19";

export type BridgePhase33A19PlanningReviewStatus = "a19-planning-review-defined-read-only";

export interface BridgePhase33A19PlanningReviewItem {
  readonly name: string;

  readonly ready: boolean;

  readonly blocked: boolean;
}

export interface BridgePhase33A19PlanningReviewTotals {
  readonly reviewItems: 6;

  readonly readyItems: 4;

  readonly blockedItems: 2;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33A19PlanningReviewReport {
  readonly phase: BridgePhase33A19PlanningReviewPhase;

  readonly status: BridgePhase33A19PlanningReviewStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly a18Snapshot: BridgePhase33A18SnapshotReport;

  readonly reviewItems: readonly BridgePhase33A19PlanningReviewItem[];

  readonly totals: BridgePhase33A19PlanningReviewTotals;

  readonly planningReviewDefined: true;

  readonly readyForNextPlanning: true;

  readonly readyForFixtureExecution: false;

  readonly crossRepoValidationConfirmed: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly nextAllowedStep: "phase-33-a20-cross-repo-fixture-readiness-index";
}
