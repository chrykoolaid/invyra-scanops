import {
  createBridgePhase33ActivationReadinessReview,
} from "./bridgePhase33ActivationReadinessReview";

import type {
  BridgePhase33InventoryCounterpartBaseline,
  BridgePhase33RequiredInventoryCounterpart,
} from "./bridgePhase33InventoryCounterpartBaselineTypes";

export const BRIDGE_PHASE_33_REQUIRED_INVENTORY_COUNTERPARTS: readonly BridgePhase33RequiredInventoryCounterpart[] = Object.freeze([
  {
    name: "Inventory Desktop bridge availability descriptor",
    requiredForActivation: true,
    confirmedInScanOps: true,
    confirmedInInventoryRepo: false,
    scanOpsCanMutateInventory: false,
  },
  {
    name: "Inventory Desktop pairing offer and approval policy",
    requiredForActivation: true,
    confirmedInScanOps: true,
    confirmedInInventoryRepo: false,
    scanOpsCanMutateInventory: false,
  },
  {
    name: "Inventory Desktop device trust registry",
    requiredForActivation: true,
    confirmedInScanOps: true,
    confirmedInInventoryRepo: false,
    scanOpsCanMutateInventory: false,
  },
  {
    name: "Inventory Desktop bridge receive endpoint",
    requiredForActivation: true,
    confirmedInScanOps: true,
    confirmedInInventoryRepo: false,
    scanOpsCanMutateInventory: false,
  },
  {
    name: "Inventory Desktop bridge inbox admission policy",
    requiredForActivation: true,
    confirmedInScanOps: true,
    confirmedInInventoryRepo: false,
    scanOpsCanMutateInventory: false,
  },
  {
    name: "Inventory Desktop receipt review and application boundary",
    requiredForActivation: true,
    confirmedInScanOps: true,
    confirmedInInventoryRepo: false,
    scanOpsCanMutateInventory: false,
  },
  {
    name: "Inventory Desktop acknowledgement contract",
    requiredForActivation: true,
    confirmedInScanOps: true,
    confirmedInInventoryRepo: false,
    scanOpsCanMutateInventory: false,
  },
  {
    name: "Inventory Desktop recovery and audit policy",
    requiredForActivation: true,
    confirmedInScanOps: true,
    confirmedInInventoryRepo: false,
    scanOpsCanMutateInventory: false,
  },
]);

export function createBridgePhase33InventoryCounterpartBaseline(): BridgePhase33InventoryCounterpartBaseline {

  const activationReadinessReview = createBridgePhase33ActivationReadinessReview();

  if (
    activationReadinessReview.decision !== "blocked" ||
    activationReadinessReview.inventoryCounterpartRequired !== true ||
    activationReadinessReview.inventoryCounterpartConfirmed !== false ||
    activationReadinessReview.crossRepoValidationConfirmed !== false ||
    activationReadinessReview.bridgeActivationAllowed !== false ||
    activationReadinessReview.safeToRunOperationalBridge !== false ||
    activationReadinessReview.executionAllowed !== false ||
    activationReadinessReview.persistenceAllowed !== false ||
    activationReadinessReview.inventoryMutationAllowed !== false ||
    activationReadinessReview.scanOpsMutationAllowed !== false
  ) {
    throw new Error(
      "Bridge Phase 33 Inventory counterpart baseline detected activation readiness drift."
    );
  }

  if (
    BRIDGE_PHASE_33_REQUIRED_INVENTORY_COUNTERPARTS.length !== 8 ||
    BRIDGE_PHASE_33_REQUIRED_INVENTORY_COUNTERPARTS.some(
      (counterpart) =>
        counterpart.requiredForActivation !== true ||
        counterpart.confirmedInScanOps !== true ||
        counterpart.confirmedInInventoryRepo !== false ||
        counterpart.scanOpsCanMutateInventory !== false
    )
  ) {
    throw new Error(
      "Bridge Phase 33 Inventory counterpart baseline detected counterpart drift."
    );
  }

  return {
    phase: "33.A7",
    status: "inventory-counterpart-baseline-required",
    confirmationStatus: "scanops-baseline-only-inventory-not-confirmed",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    activationReadinessReview,
    requiredInventoryCounterparts: BRIDGE_PHASE_33_REQUIRED_INVENTORY_COUNTERPARTS,
    totals: {
      requiredCounterparts: 8,
      confirmedInScanOps: 8,
      confirmedInInventoryRepo: 0,
      activationStepsAllowed: 0,
    },
    inventoryCounterpartRequired: true,
    inventoryCounterpartConfirmedInScanOps: true,
    inventoryCounterpartConfirmedInInventoryRepo: false,
    crossRepoValidationRequired: true,
    crossRepoValidationConfirmed: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    executionAllowed: false,
    persistenceAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    nextAllowedStep: "inventory-repo-counterpart-phase",
    reason:
      "Phase 33 A7 records the ScanOps-side Inventory counterpart baseline only. Inventory repository confirmation and cross-repo validation remain required before any activation work.",
  };
}
