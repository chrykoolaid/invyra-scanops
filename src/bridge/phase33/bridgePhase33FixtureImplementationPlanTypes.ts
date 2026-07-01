import type {
  BridgePhase33ValidationReadinessSnapshot,
} from "./bridgePhase33ValidationReadinessSnapshotTypes";

export type BridgePhase33FixtureImplementationPlanPhase = "33.A13";

export type BridgePhase33FixtureImplementationPlanStatus = "fixture-implementation-plan-defined-read-only";

export interface BridgePhase33FixtureImplementationPlanStep {
  readonly name: string;

  readonly planned: true;

  readonly active: false;
}

export interface BridgePhase33FixtureImplementationPlanTotals {
  readonly plannedSteps: 8;

  readonly activeSteps: 0;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33FixtureImplementationPlan {
  readonly phase: BridgePhase33FixtureImplementationPlanPhase;

  readonly status: BridgePhase33FixtureImplementationPlanStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly readinessSnapshot: BridgePhase33ValidationReadinessSnapshot;

  readonly plannedSteps: readonly BridgePhase33FixtureImplementationPlanStep[];

  readonly totals: BridgePhase33FixtureImplementationPlanTotals;

  readonly implementationPlanDefined: true;

  readonly readyForFixtureImplementation: true;

  readonly readyForFixtureExecution: false;

  readonly crossRepoValidationConfirmed: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly persistenceAllowed: false;

  readonly inventoryMutationAllowed: false;

  readonly scanOpsMutationAllowed: false;

  readonly nextAllowedStep: "phase-33-a14-fixture-implementation-skeletons";

  readonly reason: string;
}
