import type {
  BridgePhase33FixtureEvidenceSummaryReport,
} from "./bridgePhase33FixtureEvidenceSummaryTypes";

export type BridgePhase33FixtureEvidenceReadinessReviewPhase = "33.A17";

export type BridgePhase33FixtureEvidenceReadinessReviewStatus = "fixture-readiness-review-complete-read-only";

export interface BridgePhase33FixtureReadinessCheck {
  readonly name: string;

  readonly ready: boolean;

  readonly blocking: boolean;

  readonly reason: string;
}

export interface BridgePhase33FixtureReadinessReviewTotals {
  readonly checks: 8;

  readonly readyChecks: 5;

  readonly blockingChecks: 3;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33FixtureEvidenceReadinessReviewReport {
  readonly phase: BridgePhase33FixtureEvidenceReadinessReviewPhase;

  readonly status: BridgePhase33FixtureEvidenceReadinessReviewStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly summaryReport: BridgePhase33FixtureEvidenceSummaryReport;

  readonly checks: readonly BridgePhase33FixtureReadinessCheck[];

  readonly totals: BridgePhase33FixtureReadinessReviewTotals;

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

  readonly nextAllowedStep: "phase-33-a18-fixture-evidence-closure-snapshot";

  readonly reason: string;
}
