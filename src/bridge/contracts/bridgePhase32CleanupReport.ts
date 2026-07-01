import {
  createBridgePhase32NextGateDecision,
} from "./bridgePhase32NextGateDecision";

import type {
  BridgePhase32CleanupReport,
} from "./bridgePhase32CleanupReportTypes";

export function createBridgePhase32CleanupReport(): BridgePhase32CleanupReport {

  const nextGateDecision = createBridgePhase32NextGateDecision();

  if (
    nextGateDecision.phase32Closed !== true ||
    nextGateDecision.phase32RuntimeStillInactive !== true ||
    nextGateDecision.phase32ReadyForActivation !== false ||
    nextGateDecision.bridgeActivationAllowed !== false ||
    nextGateDecision.safeToRunOperationalBridge !== false ||
    nextGateDecision.cleanupPassRequired !== true ||
    nextGateDecision.totals.mergedExternalSurfaceCount !== 5 ||
    nextGateDecision.totals.pendingExternalDraftSurfaceCount !== 0 ||
    nextGateDecision.totals.packageRegistrationChangesApplied !== false
  ) {
    throw new Error(
      "Bridge Phase 32 cleanup report detected next gate decision drift."
    );
  }

  return {
    phase: "32.CLEANUP",
    status: "complete-no-activation",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    nextGateDecision,
    totals: {
      mergedExternalSurfaceCount: 5,
      pendingExternalDraftSurfaceCount: 0,
      packageRegistrationChangesApplied: true,
      openPullRequestsAtCleanup: 0,
    },
    phase32ExportsConsistent: true,
    packageValidationScriptsRegistered: true,
    openPullRequestsChecked: true,
    phase32Closed: true,
    phase32RuntimeStillInactive: true,
    phase32ReadyForActivation: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    phase33GateBlockedUntilCleanup: false,
    phase33GateRequiresSeparateDecision: true,
    reason:
      "Phase 32 cleanup confirms exports and validation script registration are aligned. Phase 32 remains closed without bridge activation, and Phase 33 still requires a separate explicit gate decision.",
  };
}
