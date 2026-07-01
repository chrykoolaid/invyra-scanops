import type {
  BridgePhase33CrossRepoCounterpartAlignmentReview,
} from "./bridgePhase33CrossRepoCounterpartAlignmentTypes";

export type BridgePhase33CrossRepoValidationFixturePlanPhase = "33.A9";

export type BridgePhase33CrossRepoValidationFixturePlanStatus = "fixture-plan-defined-read-only";

export interface BridgePhase33ValidationFixturePlanEntry {
  readonly name: string;

  readonly scanOpsFixtureRequired: true;

  readonly inventoryFixtureRequired: true;

  readonly assertionRequired: true;

  readonly active: false;
}

export interface BridgePhase33CrossRepoValidationFixturePlanTotals {
  readonly plannedFixtureGroups: 8;

  readonly scanOpsFixturesRequired: 8;

  readonly inventoryFixturesRequired: 8;

  readonly activeFixtures: 0;

  readonly activationStepsAllowed: 0;
}

export interface BridgePhase33CrossRepoValidationFixturePlan {
  readonly phase: BridgePhase33CrossRepoValidationFixturePlanPhase;

  readonly status: BridgePhase33CrossRepoValidationFixturePlanStatus;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly counterpartAlignmentReview: BridgePhase33CrossRepoCounterpartAlignmentReview;

  readonly plannedFixtures: readonly BridgePhase33ValidationFixturePlanEntry[];

  readonly totals: BridgePhase33CrossRepoValidationFixturePlanTotals;

  readonly fixturePlanDefined: true;

  readonly crossRepoCounterpartAlignmentConfirmed: true;

  readonly crossRepoValidationRequired: true;

  readonly crossRepoValidationConfirmed: false;

  readonly fixturePlanActive: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly persistenceAllowed: false;

  readonly inventoryMutationAllowed: false;

  readonly scanOpsMutationAllowed: false;

  readonly nextAllowedStep: "phase-33-a10-cross-repo-validation-fixture-skeletons";

  readonly reason: string;
}
