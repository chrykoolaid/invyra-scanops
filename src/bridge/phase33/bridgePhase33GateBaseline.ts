import {
  createBridgePhase32CleanupReport,
} from "../contracts/bridgePhase32CleanupReport";

import type {
  BridgePhase33GateBaseline,
} from "./bridgePhase33GateBaselineTypes";

export function createBridgePhase33GateBaseline(): BridgePhase33GateBaseline {

  const phase32CleanupReport = createBridgePhase32CleanupReport();

  if (
    phase32CleanupReport.phase32Closed !== true ||
    phase32CleanupReport.phase32RuntimeStillInactive !== true ||
    phase32CleanupReport.phase32ReadyForActivation !== false ||
    phase32CleanupReport.bridgeActivationAllowed !== false ||
    phase32CleanupReport.safeToRunOperationalBridge !== false ||
    phase32CleanupReport.totals.mergedExternalSurfaceCount !== 5 ||
    phase32CleanupReport.totals.pendingExternalDraftSurfaceCount !== 0 ||
    phase32CleanupReport.phase33GateRequiresSeparateDecision !== true
  ) {
    throw new Error(
      "Bridge Phase 33 gate baseline detected Phase 32 cleanup drift."
    );
  }

  return {
    phase: "33.A1",
    status: "baseline-established-no-activation",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    phase32CleanupReport,
    totals: {
      mergedExternalSurfaceCount: 5,
      phase32CleanupComplete: true,
      activationStepsAllowed: 0,
    },
    phase32Closed: true,
    phase32CleanupComplete: true,
    phase33GateOpened: true,
    phase33OperationalActivationAllowed: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    discoveryActivationAllowed: false,
    pairingActivationAllowed: false,
    transportActivationAllowed: false,
    queueExecutionAllowed: false,
    inboxExecutionAllowed: false,
    persistenceAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    nextAllowedStep: "phase-33-a2-scope-map",
    reason:
      "Phase 33 A1 establishes a clean baseline after Phase 32 cleanup. It opens planning only and does not allow operational bridge activation.",
  };
}
