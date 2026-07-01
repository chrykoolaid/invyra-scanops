import {
  createBridgePhase32ClosureSnapshot,
} from "./bridgePhase32ClosureSnapshot";

import type {
  BridgePhase32NextGateDecision,
  BridgePhase32PendingExternalDraftSurface,
} from "./bridgePhase32NextGateDecisionTypes";

export const BRIDGE_PHASE_32_PENDING_EXTERNAL_DRAFT_SURFACES: readonly BridgePhase32PendingExternalDraftSurface[] = Object.freeze([
  {
    phase: "12",
    label: "Receipt decision intent surface",
    pullRequest: 199,
    draft: true,
    merged: false,
    phase32Owned: false,
    requiresSeparateGovernanceReview: true,
  },
]);

export function createBridgePhase32NextGateDecision(): BridgePhase32NextGateDecision {

  const closureSnapshot = createBridgePhase32ClosureSnapshot();

  if (
    closureSnapshot.safeToRunOperationalBridge !== false ||
    closureSnapshot.bridgeActivationAllowed !== false ||
    closureSnapshot.phase32ReadyForActivation !== false ||
    closureSnapshot.phase32RuntimeStillInactive !== true ||
    closureSnapshot.cleanupPassDeferred !== true ||
    closureSnapshot.closureAccepted !== true ||
    closureSnapshot.c10GateReviewRequired !== true ||
    closureSnapshot.totals.packageRegistrationChangesApplied !== false ||
    closureSnapshot.totals.currentExternalSurfaceCount !== 4
  ) {
    throw new Error(
      "Bridge Phase 32 next gate decision detected closure drift."
    );
  }

  if (
    BRIDGE_PHASE_32_PENDING_EXTERNAL_DRAFT_SURFACES.length !== 1 ||
    BRIDGE_PHASE_32_PENDING_EXTERNAL_DRAFT_SURFACES.some(
      (surface) =>
        surface.draft !== true ||
        surface.merged !== false ||
        surface.phase32Owned !== false ||
        surface.requiresSeparateGovernanceReview !== true
    )
  ) {
    throw new Error(
      "Bridge Phase 32 next gate decision detected pending external draft drift."
    );
  }

  return {
    phase: "32.C10",
    outcome: "closed-cleanup-required-no-activation",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    closureSnapshot,
    nextAllowedStep: "phase-32-cleanup-pass",
    pendingExternalDraftSurfaces: BRIDGE_PHASE_32_PENDING_EXTERNAL_DRAFT_SURFACES,
    totals: {
      mergedExternalSurfaceCount: 4,
      pendingExternalDraftSurfaceCount: 1,
      packageRegistrationChangesApplied: false,
    },
    phase32Closed: true,
    phase32RuntimeStillInactive: true,
    phase32ReadyForActivation: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    cleanupPassRequired: true,
    phase33GateBlockedUntilCleanup: true,
    reason:
      "Phase 32 C10 closes the Phase 32 scaffold for cleanup pass only. Bridge activation and Phase 33 progression remain blocked until the cleanup pass is completed and reviewed.",
  };
}
