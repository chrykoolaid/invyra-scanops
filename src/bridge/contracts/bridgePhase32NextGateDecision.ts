import {
  createBridgePhase32ClosureSnapshot,
} from "./bridgePhase32ClosureSnapshot";

import type {
  BridgePhase32MergedExternalSurface,
  BridgePhase32NextGateDecision,
  BridgePhase32PendingExternalDraftSurface,
} from "./bridgePhase32NextGateDecisionTypes";

export const BRIDGE_PHASE_32_MERGED_EXTERNAL_SURFACES: readonly BridgePhase32MergedExternalSurface[] = Object.freeze([
  { phase: "8", label: "Manual sync execution layer", phase32Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "9", label: "Sync control surface", phase32Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "10", label: "Receipt application boundary", phase32Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "11", label: "Receipt review decision surface", phase32Owned: false, requiresSeparateGovernanceReview: true },
  { phase: "12", label: "Receipt decision intent surface", phase32Owned: false, requiresSeparateGovernanceReview: true },
]);

export const BRIDGE_PHASE_32_PENDING_EXTERNAL_DRAFT_SURFACES: readonly BridgePhase32PendingExternalDraftSurface[] = Object.freeze([]);

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
    BRIDGE_PHASE_32_MERGED_EXTERNAL_SURFACES.length !== 5 ||
    BRIDGE_PHASE_32_MERGED_EXTERNAL_SURFACES.some(
      (surface) =>
        surface.phase32Owned !== false ||
        surface.requiresSeparateGovernanceReview !== true
    ) ||
    BRIDGE_PHASE_32_PENDING_EXTERNAL_DRAFT_SURFACES.length !== 0
  ) {
    throw new Error(
      "Bridge Phase 32 next gate decision detected external surface drift."
    );
  }

  return {
    phase: "32.C10",
    outcome: "closed-cleanup-required-no-activation",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    closureSnapshot,
    nextAllowedStep: "phase-32-cleanup-pass",
    mergedExternalSurfaces: BRIDGE_PHASE_32_MERGED_EXTERNAL_SURFACES,
    pendingExternalDraftSurfaces: BRIDGE_PHASE_32_PENDING_EXTERNAL_DRAFT_SURFACES,
    totals: {
      mergedExternalSurfaceCount: 5,
      pendingExternalDraftSurfaceCount: 0,
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
      "Phase 32 C10 closes the Phase 32 scaffold for cleanup pass only. Bridge activation and Phase 33 progression remain blocked until the cleanup pass is completed and reviewed. External Bridge Phases 8 through 12 remain outside Phase 32 ownership.",
  };
}
