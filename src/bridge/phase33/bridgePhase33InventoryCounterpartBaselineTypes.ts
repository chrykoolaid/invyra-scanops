import type {
  BridgePhase33ActivationReadinessReview,
} from "./bridgePhase33ActivationReadinessReviewTypes";

export type BridgePhase33InventoryCounterpartBaselinePhase = "33.A7";

export type BridgePhase33InventoryCounterpartBaselineStatus = "inventory-counterpart-baseline-required";

export type BridgePhase33InventoryCounterpartConfirmationStatus = "scanops-baseline-only-inventory-not-confirmed";

export interface BridgePhase33RequiredInventoryCounterpart {
  readonly name: string;

  readonly requiredForActivation: true;

  readonly confirmedInScanOps: true;

  readonly confirmedInInventoryRepo: false;

  readonly scanOpsCanMutateInventory: false;
}

export interface BridgePhase33InventoryCounterpartBaselineTotals {
  readonly requiredCounterparts: 8;

  readonly confirmedInScanOps: 8;

  readonly confirmedInInventoryRepo: 0;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33InventoryCounterpartBaseline {
  readonly phase: BridgePhase33InventoryCounterpartBaselinePhase;

  readonly status: BridgePhase33InventoryCounterpartBaselineStatus;

  readonly confirmationStatus: BridgePhase33InventoryCounterpartConfirmationStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly activationReadinessReview: BridgePhase33ActivationReadinessReview;

  readonly requiredInventoryCounterparts: readonly BridgePhase33RequiredInventoryCounterpart[];

  readonly totals: BridgePhase33InventoryCounterpartBaselineTotals;

  readonly inventoryCounterpartRequired: true;

  readonly inventoryCounterpartConfirmedInScanOps: true;

  readonly inventoryCounterpartConfirmedInInventoryRepo: false;

  readonly crossRepoValidationRequired: true;

  readonly crossRepoValidationConfirmed: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly executionAllowed: false;

  readonly persistenceAllowed: false;

  readonly inventoryMutationAllowed: false;

  readonly scanOpsMutationAllowed: false;

  readonly nextAllowedStep: "inventory-repo-counterpart-phase";

  readonly reason: string;
}
