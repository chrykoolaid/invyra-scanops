import type {
  BridgePhase33A19PlanningReviewReport,
} from "./bridgePhase33A19PlanningReviewTypes";

export type BridgePhase33A20ReadinessIndexPhase = "33.A20";

export type BridgePhase33A20ReadinessIndexStatus = "a20-readiness-index-defined-read-only";

export interface BridgePhase33A20ReadinessIndexEntry {
  readonly name: string;

  readonly indexKey: string;

  readonly ready: boolean;

  readonly blocked: boolean;
}

export interface BridgePhase33A20ReadinessIndexTotals {
  readonly indexedItems: 6;

  readonly readyItems: 4;

  readonly blockedItems: 2;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33A20ReadinessIndexReport {
  readonly phase: BridgePhase33A20ReadinessIndexPhase;

  readonly status: BridgePhase33A20ReadinessIndexStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly planningReview: BridgePhase33A19PlanningReviewReport;

  readonly indexEntries: readonly BridgePhase33A20ReadinessIndexEntry[];

  readonly totals: BridgePhase33A20ReadinessIndexTotals;

  readonly readinessIndexDefined: true;

  readonly planningReviewDefined: true;

  readonly readyForNextPlanning: true;

  readonly readyForFixtureExecution: false;

  readonly crossRepoValidationConfirmed: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly nextAllowedStep: "phase-33-a21-cross-repo-fixture-readiness-summary";
}
