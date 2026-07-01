import type {
  BridgePhase33PlanningBundle,
} from "./bridgePhase33PlanningBundleTypes";

export type BridgePhase33ActivationReadinessReviewPhase = "33.A6";

export type BridgePhase33ActivationReadinessStatus = "not-ready-for-activation";

export type BridgePhase33ReadinessDecision = "blocked";

export interface BridgePhase33ReadinessCheck {
  readonly name: string;

  readonly ready: boolean;

  readonly blocking: boolean;

  readonly reason: string;
}

export interface BridgePhase33ActivationReadinessReviewTotals {
  readonly readinessChecks: 10;

  readonly readyChecks: 3;

  readonly blockingChecks: 7;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33ActivationReadinessReview {
  readonly phase: BridgePhase33ActivationReadinessReviewPhase;

  readonly status: BridgePhase33ActivationReadinessStatus;

  readonly decision: BridgePhase33ReadinessDecision;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly planningBundle: BridgePhase33PlanningBundle;

  readonly readinessChecks: readonly BridgePhase33ReadinessCheck[];

  readonly totals: BridgePhase33ActivationReadinessReviewTotals;

  readonly phase33PlanningComplete: true;

  readonly inventoryCounterpartRequired: true;

  readonly inventoryCounterpartConfirmed: false;

  readonly crossRepoValidationRequired: true;

  readonly crossRepoValidationConfirmed: false;

  readonly activationGateRequired: true;

  readonly activationGateApproved: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly executionAllowed: false;

  readonly persistenceAllowed: false;

  readonly inventoryMutationAllowed: false;

  readonly scanOpsMutationAllowed: false;

  readonly nextAllowedStep: "phase-33-a7-inventory-counterpart-baseline";

  readonly reason: string;
}
