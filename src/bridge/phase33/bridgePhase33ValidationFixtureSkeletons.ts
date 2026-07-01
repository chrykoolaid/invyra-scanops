import {
  createBridgePhase33CrossRepoValidationFixturePlan,
} from "./bridgePhase33CrossRepoValidationFixturePlan";

import type {
  BridgePhase33ValidationFixtureSkeleton,
  BridgePhase33ValidationFixtureSkeletonReport,
} from "./bridgePhase33ValidationFixtureSkeletonTypes";

export const BRIDGE_PHASE_33_VALIDATION_FIXTURE_SKELETONS: readonly BridgePhase33ValidationFixtureSkeleton[] = Object.freeze([
  {
    name: "Bridge availability descriptor alignment",
    scanOpsFixtureKey: "scanops.bridge.availability.descriptor",
    inventoryFixtureKey: "inventory.bridge.availability.descriptor",
    assertionKey: "bridge.availability.descriptor.alignment",
    active: false,
  },
  {
    name: "Pairing offer and request alignment",
    scanOpsFixtureKey: "scanops.bridge.pairing.request",
    inventoryFixtureKey: "inventory.bridge.pairing.offer",
    assertionKey: "bridge.pairing.offer.request.alignment",
    active: false,
  },
  {
    name: "Trusted device registry alignment",
    scanOpsFixtureKey: "scanops.bridge.device.projection",
    inventoryFixtureKey: "inventory.bridge.device.registry",
    assertionKey: "bridge.device.registry.alignment",
    active: false,
  },
  {
    name: "Bridge receive endpoint envelope alignment",
    scanOpsFixtureKey: "scanops.bridge.transport.envelope",
    inventoryFixtureKey: "inventory.bridge.receive.endpoint",
    assertionKey: "bridge.receive.endpoint.envelope.alignment",
    active: false,
  },
  {
    name: "Inbox admission policy alignment",
    scanOpsFixtureKey: "scanops.bridge.outbound.queue.entry",
    inventoryFixtureKey: "inventory.bridge.inbox.admission.policy",
    assertionKey: "bridge.inbox.admission.alignment",
    active: false,
  },
  {
    name: "Receipt review boundary alignment",
    scanOpsFixtureKey: "scanops.bridge.receipt.projection",
    inventoryFixtureKey: "inventory.bridge.receipt.review.boundary",
    assertionKey: "bridge.receipt.review.alignment",
    active: false,
  },
  {
    name: "Acknowledgement contract alignment",
    scanOpsFixtureKey: "scanops.bridge.acknowledgement.projection",
    inventoryFixtureKey: "inventory.bridge.acknowledgement.contract",
    assertionKey: "bridge.acknowledgement.alignment",
    active: false,
  },
  {
    name: "Recovery and audit policy alignment",
    scanOpsFixtureKey: "scanops.bridge.recovery.projection",
    inventoryFixtureKey: "inventory.bridge.recovery.audit.policy",
    assertionKey: "bridge.recovery.audit.alignment",
    active: false,
  },
]);

export function createBridgePhase33ValidationFixtureSkeletonReport(): BridgePhase33ValidationFixtureSkeletonReport {

  const fixturePlan = createBridgePhase33CrossRepoValidationFixturePlan();

  if (
    fixturePlan.fixturePlanDefined !== true ||
    fixturePlan.fixturePlanActive !== false ||
    fixturePlan.crossRepoValidationConfirmed !== false ||
    fixturePlan.bridgeActivationAllowed !== false ||
    fixturePlan.safeToRunOperationalBridge !== false ||
    fixturePlan.persistenceAllowed !== false ||
    fixturePlan.inventoryMutationAllowed !== false ||
    fixturePlan.scanOpsMutationAllowed !== false ||
    fixturePlan.totals.plannedFixtureGroups !== 8
  ) {
    throw new Error(
      "Bridge Phase 33 fixture skeleton report detected fixture plan drift."
    );
  }

  if (
    BRIDGE_PHASE_33_VALIDATION_FIXTURE_SKELETONS.length !== 8 ||
    BRIDGE_PHASE_33_VALIDATION_FIXTURE_SKELETONS.some(
      (skeleton) =>
        skeleton.scanOpsFixtureKey.length === 0 ||
        skeleton.inventoryFixtureKey.length === 0 ||
        skeleton.assertionKey.length === 0 ||
        skeleton.active !== false
    )
  ) {
    throw new Error(
      "Bridge Phase 33 fixture skeleton report detected skeleton drift."
    );
  }

  return {
    phase: "33.A10",
    status: "fixture-skeletons-defined-read-only",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    fixturePlan,
    skeletons: BRIDGE_PHASE_33_VALIDATION_FIXTURE_SKELETONS,
    totals: {
      skeletons: 8,
      scanOpsFixtureKeys: 8,
      inventoryFixtureKeys: 8,
      assertionKeys: 8,
      activeSkeletons: 0,
      activationStepsAllowed: 0,
    },
    skeletonsDefined: true,
    fixturePlanActive: false,
    crossRepoValidationConfirmed: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    persistenceAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    nextAllowedStep: "phase-33-a11-fixture-skeleton-index",
    reason:
      "Phase 33 A10 defines fixture skeleton keys only. Cross-repo validation and activation remain separate future gates.",
  };
}
