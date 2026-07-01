import type {
  BridgePhase33GateBaseline,
} from "./bridgePhase33GateBaselineTypes";

export type BridgePhase33PlanningBundlePhase = "33.A2-A5";

export type BridgePhase33PlanningBundleStatus = "planning-bundle-established-no-activation";

export type BridgePhase33PlanningSubphase = "33.A2" | "33.A3" | "33.A4" | "33.A5";

export interface BridgePhase33PlanningScopeEntry {
  readonly phase: BridgePhase33PlanningSubphase;

  readonly name: string;

  readonly planningOnly: true;

  readonly activationAllowed: false;
}

export interface BridgePhase33DependencyMatrixEntry {
  readonly capability: string;

  readonly requiresInventoryCounterpart: true;

  readonly requiresSeparateActivationGate: true;

  readonly executionAllowed: false;
}

export interface BridgePhase33InventoryCounterpartEntry {
  readonly scanOpsSurface: string;

  readonly inventoryCounterpart: string;

  readonly inventorySystemOfRecord: true;

  readonly mutationAllowedFromScanOps: false;
}

export interface BridgePhase33EndToEndPathStep {
  readonly order: number;

  readonly label: string;

  readonly planningOnly: true;

  readonly executionAllowed: false;
}

export interface BridgePhase33CurrentExternalSurfaceEntry {
  readonly phase: "8" | "9" | "10" | "11" | "12" | "13";

  readonly label: string;

  readonly phase33Owned: false;

  readonly requiresSeparateGovernanceReview: true;
}

export interface BridgePhase33PlanningBundleTotals {
  readonly planningScopeEntries: 4;

  readonly dependencyMatrixEntries: 10;

  readonly inventoryCounterpartEntries: 8;

  readonly endToEndPathSteps: 8;

  readonly mergedExternalSurfaceCount: 6;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33PlanningBundle {
  readonly phase: BridgePhase33PlanningBundlePhase;

  readonly status: BridgePhase33PlanningBundleStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly gateBaseline: BridgePhase33GateBaseline;

  readonly planningScope: readonly BridgePhase33PlanningScopeEntry[];

  readonly dependencyMatrix: readonly BridgePhase33DependencyMatrixEntry[];

  readonly inventoryCounterpartMap: readonly BridgePhase33InventoryCounterpartEntry[];

  readonly endToEndBridgePath: readonly BridgePhase33EndToEndPathStep[];

  readonly currentExternalBridgeSurfaces: readonly BridgePhase33CurrentExternalSurfaceEntry[];

  readonly totals: BridgePhase33PlanningBundleTotals;

  readonly planningOnly: true;

  readonly phase33OperationalActivationAllowed: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly executionAllowed: false;

  readonly persistenceAllowed: false;

  readonly inventoryMutationAllowed: false;

  readonly scanOpsMutationAllowed: false;

  readonly nextAllowedStep: "phase-33-a6-activation-readiness-review";

  readonly reason: string;
}
