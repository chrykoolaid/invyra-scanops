import {
  createBridgePhase33FixtureImplementationPlan,
} from "./bridgePhase33FixtureImplementationPlan";

import type {
  BridgePhase33FixtureImplementationSkeleton,
  BridgePhase33FixtureImplementationSkeletonReport,
} from "./bridgePhase33FixtureImplementationSkeletonTypes";

export const BRIDGE_PHASE_33_FIXTURE_IMPLEMENTATION_SKELETONS: readonly BridgePhase33FixtureImplementationSkeleton[] = Object.freeze([
  { name: "Availability descriptor skeleton", sourceKey: "scanops.fixture.availability", targetKey: "inventory.fixture.availability", assertionKey: "fixture.availability.match", descriptorOnly: true, active: false },
  { name: "Pairing descriptor skeleton", sourceKey: "scanops.fixture.pairing", targetKey: "inventory.fixture.pairing", assertionKey: "fixture.pairing.match", descriptorOnly: true, active: false },
  { name: "Device descriptor skeleton", sourceKey: "scanops.fixture.device", targetKey: "inventory.fixture.device", assertionKey: "fixture.device.match", descriptorOnly: true, active: false },
  { name: "Envelope descriptor skeleton", sourceKey: "scanops.fixture.envelope", targetKey: "inventory.fixture.envelope", assertionKey: "fixture.envelope.match", descriptorOnly: true, active: false },
  { name: "Inbox policy descriptor skeleton", sourceKey: "scanops.fixture.inbox", targetKey: "inventory.fixture.inbox", assertionKey: "fixture.inbox.match", descriptorOnly: true, active: false },
  { name: "Receipt descriptor skeleton", sourceKey: "scanops.fixture.receipt", targetKey: "inventory.fixture.receipt", assertionKey: "fixture.receipt.match", descriptorOnly: true, active: false },
  { name: "Acknowledgement descriptor skeleton", sourceKey: "scanops.fixture.acknowledgement", targetKey: "inventory.fixture.acknowledgement", assertionKey: "fixture.acknowledgement.match", descriptorOnly: true, active: false },
  { name: "Recovery audit descriptor skeleton", sourceKey: "scanops.fixture.recoveryAudit", targetKey: "inventory.fixture.recoveryAudit", assertionKey: "fixture.recoveryAudit.match", descriptorOnly: true, active: false },
]);

export function createBridgePhase33FixtureImplementationSkeletonReport(): BridgePhase33FixtureImplementationSkeletonReport {

  const implementationPlan = createBridgePhase33FixtureImplementationPlan();

  if (
    implementationPlan.implementationPlanDefined !== true ||
    implementationPlan.readyForFixtureExecution !== false ||
    implementationPlan.totals.activeSteps !== 0
  ) {
    throw new Error("Bridge Phase 33 fixture skeleton report detected plan drift.");
  }

  if (
    BRIDGE_PHASE_33_FIXTURE_IMPLEMENTATION_SKELETONS.length !== 8 ||
    BRIDGE_PHASE_33_FIXTURE_IMPLEMENTATION_SKELETONS.some(
      (skeleton) =>
        skeleton.sourceKey.length === 0 ||
        skeleton.targetKey.length === 0 ||
        skeleton.assertionKey.length === 0 ||
        skeleton.descriptorOnly !== true ||
        skeleton.active !== false
    )
  ) {
    throw new Error("Bridge Phase 33 fixture skeleton report detected skeleton drift.");
  }

  return {
    phase: "33.A14",
    status: "fixture-implementation-skeletons-defined-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    implementationPlan,
    skeletons: BRIDGE_PHASE_33_FIXTURE_IMPLEMENTATION_SKELETONS,
    totals: {
      skeletons: 8,
      descriptorOnlySkeletons: 8,
      activeSkeletons: 0,
      activationStepsAllowed: 0,
    },
    implementationSkeletonsDefined: true,
    implementationPlanDefined: true,
    descriptorOnly: true,
    readyForFixtureExecution: false,
    crossRepoValidationConfirmed: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    persistenceAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    nextAllowedStep: "phase-33-a15-fixture-implementation-index",
    reason:
      "Phase 33 A14 defines descriptor-only fixture skeletons for later review.",
  };
}
