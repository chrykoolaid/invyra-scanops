import {
  assertBridgeRuntimeCapabilityBlocked,
} from "../runtime/bridgeRuntimeCapabilityGuard";

import {
  createBridgeRuntimeSafetyReport,
} from "../runtime/bridgeRuntimeSafetyReport";

import {
  type BridgeRecoveryActionContract,
  type BridgeRecoveryContractSnapshot,
} from "./bridgeRecoveryContractTypes";

export function createDisabledBridgeRecoveryActionContract(
  actionId = "recovery-disabled-placeholder"
): BridgeRecoveryActionContract {

  return {
    actionId,
    source: "disabledPlaceholder",
    displayName: "Recovery disabled placeholder",
    evaluated: false,
    scheduled: false,
    retryReady: false,
    rollbackReady: false,
    queueReady: false,
    inboxReady: false,
    persistenceReady: false,
    mutationReady: false,
    operationalCapability: false,
    reason:
      "Recovery action is a disabled placeholder only. No evaluation, scheduling, retry, rollback, queue handling, inbox handling, persistence, transport, or mutation is allowed in Phase 32 B10.",
  };
}

export function createBridgeRecoveryContractSnapshot(): BridgeRecoveryContractSnapshot {

  const safetyReport = createBridgeRuntimeSafetyReport();
  const recoveryDecision = assertBridgeRuntimeCapabilityBlocked(
    "recovery",
    safetyReport.runtimeSnapshot.featureGates
  );

  if (
    recoveryDecision.allowed !== false ||
    recoveryDecision.blocked !== true ||
    safetyReport.safeToRunOperationalBridge !== false
  ) {
    throw new Error(
      "Bridge recovery contract attempted to become operational."
    );
  }

  return {
    phase: "32.B10",
    enabled: false,
    executionAllowed: false,
    recoveryActive: false,
    evaluationAllowed: false,
    schedulingAllowed: false,
    retryAllowed: false,
    rollbackAllowed: false,
    queueProcessingAllowed: false,
    inboxProcessingAllowed: false,
    receiptProcessingAllowed: false,
    acknowledgementProcessingAllowed: false,
    diagnosticsExecutionAllowed: false,
    transportAllowed: false,
    persistenceAllowed: false,
    mutationAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    actions: [],
    reason:
      "Recovery contract skeleton is disabled in Phase 32 B10. It defines shape only and performs no recovery execution.",
  };
}
