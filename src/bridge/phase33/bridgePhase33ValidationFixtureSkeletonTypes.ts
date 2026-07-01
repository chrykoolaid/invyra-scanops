import type {
  BridgePhase33CrossRepoValidationFixturePlan,
} from "./bridgePhase33CrossRepoValidationFixturePlanTypes";

export type BridgePhase33ValidationFixtureSkeletonPhase = "33.A10";

export type BridgePhase33ValidationFixtureSkeletonStatus = "fixture-skeletons-defined-read-only";

export interface BridgePhase33ValidationFixtureSkeleton {
  readonly name: string;

  readonly scanOpsFixtureKey: string;

  readonly inventoryFixtureKey: string;

  readonly assertionKey: string;

  readonly active: false;
}

export interface BridgePhase33ValidationFixtureSkeletonTotals {
  readonly skeletons: 8;

  readonly scanOpsFixtureKeys: 8;

  readonly inventoryFixtureKeys: 8;

  readonly assertionKeys: 8;

  readonly activeSkeletons: 0;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33ValidationFixtureSkeletonReport {
  readonly phase: BridgePhase33ValidationFixtureSkeletonPhase;

  readonly status: BridgePhase33ValidationFixtureSkeletonStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly fixturePlan: BridgePhase33CrossRepoValidationFixturePlan;

  readonly skeletons: readonly BridgePhase33ValidationFixtureSkeleton[];

  readonly totals: BridgePhase33ValidationFixtureSkeletonTotals;

  readonly skeletonsDefined: true;

  readonly fixturePlanActive: false;

  readonly crossRepoValidationConfirmed: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly persistenceAllowed: false;

  readonly inventoryMutationAllowed: false;

  readonly scanOpsMutationAllowed: false;

  readonly nextAllowedStep: "phase-33-a11-fixture-skeleton-index";

  readonly reason: string;
}
