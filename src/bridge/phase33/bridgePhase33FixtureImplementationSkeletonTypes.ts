import type {
  BridgePhase33FixtureImplementationPlan,
} from "./bridgePhase33FixtureImplementationPlanTypes";

export type BridgePhase33FixtureImplementationSkeletonPhase = "33.A14";

export type BridgePhase33FixtureImplementationSkeletonStatus = "fixture-implementation-skeletons-defined-read-only";

export interface BridgePhase33FixtureImplementationSkeleton {
  readonly name: string;

  readonly sourceKey: string;

  readonly targetKey: string;

  readonly assertionKey: string;

  readonly descriptorOnly: true;

  readonly active: false;
}

export interface BridgePhase33FixtureImplementationSkeletonTotals {
  readonly skeletons: 8;

  readonly descriptorOnlySkeletons: 8;

  readonly activeSkeletons: 0;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33FixtureImplementationSkeletonReport {
  readonly phase: BridgePhase33FixtureImplementationSkeletonPhase;

  readonly status: BridgePhase33FixtureImplementationSkeletonStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly implementationPlan: BridgePhase33FixtureImplementationPlan;

  readonly skeletons: readonly BridgePhase33FixtureImplementationSkeleton[];

  readonly totals: BridgePhase33FixtureImplementationSkeletonTotals;

  readonly implementationSkeletonsDefined: true;

  readonly implementationPlanDefined: true;

  readonly descriptorOnly: true;

  readonly readyForFixtureExecution: false;

  readonly crossRepoValidationConfirmed: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly persistenceAllowed: false;

  readonly inventoryMutationAllowed: false;

  readonly scanOpsMutationAllowed: false;

  readonly nextAllowedStep: "phase-33-a15-fixture-implementation-index";

  readonly reason: string;
}
