import {
  assertBridgeRuntimeCapabilityBlocked,
} from "../runtime/bridgeRuntimeCapabilityGuard";

import {
  createBridgeRuntimeSafetyReport,
} from "../runtime/bridgeRuntimeSafetyReport";

import {
  type BridgeDiagnosticsCheckContract,
  type BridgeDiagnosticsContractSnapshot,
  type BridgeDiagnosticsSeverity,
} from "./bridgeDiagnosticsContractTypes";

export function createDisabledBridgeDiagnosticsCheckContract(
  diagnosticId = "diagnostic-disabled-placeholder",
  severity: BridgeDiagnosticsSeverity = "info"
): BridgeDiagnosticsCheckContract {

  return {
    diagnosticId,
    source: "disabledPlaceholder",
    displayName: "Diagnostics disabled placeholder",
    severity,
    evaluated: false,
    emitted: false,
    persisted: false,
    exported: false,
    transportReady: false,
    mutationReady: false,
    operationalCapability: false,
    reason:
      "Diagnostics check is a disabled placeholder only. No evaluation, emission, persistence, export, transport, recovery trigger, queue processing, inbox processing, receipt processing, acknowledgement processing, or mutation is allowed in Phase 32 B9.",
  };
}

export function createBridgeDiagnosticsContractSnapshot(): BridgeDiagnosticsContractSnapshot {

  const safetyReport = createBridgeRuntimeSafetyReport();
  const diagnosticsDecision = assertBridgeRuntimeCapabilityBlocked(
    "diagnostics",
    safetyReport.runtimeSnapshot.featureGates
  );

  if (
    diagnosticsDecision.allowed !== false ||
    diagnosticsDecision.blocked !== true ||
    safetyReport.safeToRunOperationalBridge !== false
  ) {
    throw new Error(
      "Bridge diagnostics contract attempted to become operational."
    );
  }

  return {
    phase: "32.B9",
    enabled: false,
    executionAllowed: false,
    diagnosticsActive: false,
    evaluationAllowed: false,
    eventEmissionAllowed: false,
    persistenceAllowed: false,
    exportAllowed: false,
    transportAllowed: false,
    recoveryTriggerAllowed: false,
    queueProcessingAllowed: false,
    inboxProcessingAllowed: false,
    receiptProcessingAllowed: false,
    acknowledgementProcessingAllowed: false,
    mutationAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    checks: [],
    reason:
      "Diagnostics contract skeleton is disabled in Phase 32 B9. It defines shape only and performs no diagnostics execution.",
  };
}
