import {
  createBridgePhase33GateBaseline,
} from "./bridgePhase33GateBaseline";

import type {
  BridgePhase33CurrentExternalSurfaceEntry,
  BridgePhase33DependencyMatrixEntry,
  BridgePhase33EndToEndPathStep,
  BridgePhase33InventoryCounterpartEntry,
  BridgePhase33PlanningBundle,
  BridgePhase33PlanningScopeEntry,
} from "./bridgePhase33PlanningBundleTypes";

export const BRIDGE_PHASE_33_PLANNING_SCOPE: readonly BridgePhase33PlanningScopeEntry[] = Object.freeze([
  { phase: "33.A2", name: "Scope map", planningOnly: true, activationAllowed: false },
  { phase: "33.A3", name: "Activation dependency matrix", planningOnly: true, activationAllowed: false },
  { phase: "33.A4", name: "Inventory counterpart map", planningOnly: true, activationAllowed: false },
  { phase: "33.A5", name: "End-to-end bridge path plan", planningOnly: true, activationAllowed: false },
]);

export const BRIDGE_PHASE_33_DEPENDENCY_MATRIX: readonly BridgePhase33DependencyMatrixEntry[] = Object.freeze([
  { capability: "discovery", requiresInventoryCounterpart: true, requiresSeparateActivationGate: true, executionAllowed: false },
  { capability: "qrPairing", requiresInventoryCounterpart: true, requiresSeparateActivationGate: true, executionAllowed: false },
  { capability: "trustedDeviceRegistry", requiresInventoryCounterpart: true, requiresSeparateActivationGate: true, executionAllowed: false },
  { capability: "transport", requiresInventoryCounterpart: true, requiresSeparateActivationGate: true, executionAllowed: false },
  { capability: "outboundQueue", requiresInventoryCounterpart: true, requiresSeparateActivationGate: true, executionAllowed: false },
  { capability: "inboundInbox", requiresInventoryCounterpart: true, requiresSeparateActivationGate: true, executionAllowed: false },
  { capability: "receipts", requiresInventoryCounterpart: true, requiresSeparateActivationGate: true, executionAllowed: false },
  { capability: "acknowledgements", requiresInventoryCounterpart: true, requiresSeparateActivationGate: true, executionAllowed: false },
  { capability: "diagnostics", requiresInventoryCounterpart: true, requiresSeparateActivationGate: true, executionAllowed: false },
  { capability: "recovery", requiresInventoryCounterpart: true, requiresSeparateActivationGate: true, executionAllowed: false },
]);

export const BRIDGE_PHASE_33_INVENTORY_COUNTERPART_MAP: readonly BridgePhase33InventoryCounterpartEntry[] = Object.freeze([
  { scanOpsSurface: "Discovery candidate", inventoryCounterpart: "Inventory Desktop bridge availability descriptor", inventorySystemOfRecord: true, mutationAllowedFromScanOps: false },
  { scanOpsSurface: "QR pairing request", inventoryCounterpart: "Inventory Desktop pairing offer and approval policy", inventorySystemOfRecord: true, mutationAllowedFromScanOps: false },
  { scanOpsSurface: "Trusted device projection", inventoryCounterpart: "Inventory Desktop device trust registry", inventorySystemOfRecord: true, mutationAllowedFromScanOps: false },
  { scanOpsSurface: "Transport envelope", inventoryCounterpart: "Inventory Desktop bridge receive endpoint", inventorySystemOfRecord: true, mutationAllowedFromScanOps: false },
  { scanOpsSurface: "Outbound queue entry", inventoryCounterpart: "Inventory Desktop bridge inbox admission policy", inventorySystemOfRecord: true, mutationAllowedFromScanOps: false },
  { scanOpsSurface: "Receipt projection", inventoryCounterpart: "Inventory Desktop receipt review and application boundary", inventorySystemOfRecord: true, mutationAllowedFromScanOps: false },
  { scanOpsSurface: "Acknowledgement projection", inventoryCounterpart: "Inventory Desktop acknowledgement contract", inventorySystemOfRecord: true, mutationAllowedFromScanOps: false },
  { scanOpsSurface: "Recovery request projection", inventoryCounterpart: "Inventory Desktop recovery and audit policy", inventorySystemOfRecord: true, mutationAllowedFromScanOps: false },
]);

export const BRIDGE_PHASE_33_END_TO_END_PATH: readonly BridgePhase33EndToEndPathStep[] = Object.freeze([
  { order: 1, label: "Confirm Inventory Desktop counterpart contracts", planningOnly: true, executionAllowed: false },
  { order: 2, label: "Map pairing and trust prerequisites", planningOnly: true, executionAllowed: false },
  { order: 3, label: "Map local transport readiness gates", planningOnly: true, executionAllowed: false },
  { order: 4, label: "Map outbound queue and inbox handoff boundaries", planningOnly: true, executionAllowed: false },
  { order: 5, label: "Map receipt review and acknowledgement flow", planningOnly: true, executionAllowed: false },
  { order: 6, label: "Map diagnostics, recovery, and audit evidence", planningOnly: true, executionAllowed: false },
  { order: 7, label: "Define cross-repo end-to-end validation fixtures", planningOnly: true, executionAllowed: false },
  { order: 8, label: "Prepare activation readiness review", planningOnly: true, executionAllowed: false },
]);

export const BRIDGE_PHASE_33_CURRENT_EXTERNAL_SURFACES: readonly BridgePhase33CurrentExternalSurfaceEntry[] = Object.freeze([
  { phase: "8", label: "Manual sync execution layer", phase33Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "9", label: "Sync control surface", phase33Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "10", label: "Receipt application boundary", phase33Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "11", label: "Receipt review decision surface", phase33Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "12", label: "Receipt decision intent surface", phase33Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "13", label: "Manual retry execution boundary", phase33Owned: false, requiresSeparateGovernanceReview: true },
]);

export function createBridgePhase33PlanningBundle(): BridgePhase33PlanningBundle {

  const gateBaseline = createBridgePhase33GateBaseline();

  if (
    gateBaseline.phase33OperationalActivationAllowed !== false ||
    gateBaseline.bridgeActivationAllowed !== false ||
    gateBaseline.safeToRunOperationalBridge !== false ||
    gateBaseline.totals.activationStepsAllowed !== 0
  ) {
    throw new Error(
      "Bridge Phase 33 planning bundle detected gate baseline drift."
    );
  }

  if (
    BRIDGE_PHASE_33_PLANNING_SCOPE.length !== 4 ||
    BRIDGE_PHASE_33_DEPENDENCY_MATRIX.length !== 10 ||
    BRIDGE_PHASE_33_INVENTORY_COUNTERPART_MAP.length !== 8 ||
    BRIDGE_PHASE_33_END_TO_END_PATH.length !== 8 ||
    BRIDGE_PHASE_33_CURRENT_EXTERNAL_SURFACES.length !== 6
  ) {
    throw new Error(
      "Bridge Phase 33 planning bundle detected planning surface drift."
    );
  }

  return {
    phase: "33.A2-A5",
    status: "planning-bundle-established-no-activation",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    gateBaseline,
    planningScope: BRIDGE_PHASE_33_PLANNING_SCOPE,
    dependencyMatrix: BRIDGE_PHASE_33_DEPENDENCY_MATRIX,
    inventoryCounterpartMap: BRIDGE_PHASE_33_INVENTORY_COUNTERPART_MAP,
    endToEndBridgePath: BRIDGE_PHASE_33_END_TO_END_PATH,
    currentExternalBridgeSurfaces: BRIDGE_PHASE_33_CURRENT_EXTERNAL_SURFACES,
    totals: {
      planningScopeEntries: 4,
      dependencyMatrixEntries: 10,
      inventoryCounterpartEntries: 8,
      endToEndPathSteps: 8,
      mergedExternalSurfaceCount: 6,
      activationStepsAllowed: 0,
    },
    planningOnly: true,
    phase33OperationalActivationAllowed: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    executionAllowed: false,
    persistenceAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    nextAllowedStep: "phase-33-a6-activation-readiness-review",
    reason:
      "Phase 33 A2-A5 accelerates planning, dependency mapping, Inventory counterpart mapping, and end-to-end path planning without allowing bridge activation.",
  };
}
