import {
  createBridgePhase32ValidationManifest,
} from "./bridgePhase32ValidationManifest";

import type {
  BridgePhase32ClosureSnapshot,
  BridgePhase32CurrentExternalBridgeSurface,
} from "./bridgePhase32ClosureSnapshotTypes";

export const BRIDGE_PHASE_32_CURRENT_EXTERNAL_BRIDGE_SURFACES: readonly BridgePhase32CurrentExternalBridgeSurface[] = Object.freeze([
  { phase: "8", label: "Manual sync execution layer", phase32Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "9", label: "Sync control surface", phase32Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "10", label: "Receipt application boundary", phase32Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "11", label: "Receipt review decision surface", phase32Owned: false, requiresSeparateGovernanceReview: true },
]);

export function createBridgePhase32ClosureSnapshot(): BridgePhase32ClosureSnapshot {

  const validationManifest = createBridgePhase32ValidationManifest();

  if (
    validationManifest.safeToRunOperationalBridge !== false ||
    validationManifest.bridgeActivationAllowed !== false ||
    validationManifest.phase32ReadyForActivation !== false ||
    validationManifest.phase32RuntimeStillInactive !== true ||
    validationManifest.cleanupPassDeferred !== true ||
    validationManifest.totals.packageRegistrationChangesApplied !== false
  ) {
    throw new Error(
      "Bridge Phase 32 closure snapshot detected validation manifest drift."
    );
  }

  if (
    validationManifest.totals.externalSurfaceCount !== 3 ||
    BRIDGE_PHASE_32_CURRENT_EXTERNAL_BRIDGE_SURFACES.length !== 4 ||
    BRIDGE_PHASE_32_CURRENT_EXTERNAL_BRIDGE_SURFACES.some(
      (surface) => surface.phase32Owned !== false || surface.requiresSeparateGovernanceReview !== true
    )
  ) {
    throw new Error(
      "Bridge Phase 32 closure snapshot detected external bridge surface drift."
    );
  }

  return {
    phase: "32.C9",
    status: "accepted-for-c10-gate-review",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    validationManifest,
    currentExternalBridgeSurfaces: BRIDGE_PHASE_32_CURRENT_EXTERNAL_BRIDGE_SURFACES,
    totals: {
      manifestValidationCount: validationManifest.totals.validationCount,
      manifestExternalSurfaceCount: 3,
      currentExternalSurfaceCount: 4,
      packageRegistrationChangesApplied: false,
    },
    phase32RuntimeStillInactive: true,
    phase32ReadyForActivation: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    c10GateReviewRequired: true,
    cleanupPassDeferred: true,
    closureAccepted: true,
    reason:
      "Phase 32 C9 accepts the Phase 32 validation manifest for C10 gate review while recording that current external bridge surfaces through Phase 11 remain outside Phase 32 ownership.",
  };
}
