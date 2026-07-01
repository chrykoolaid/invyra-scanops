import {
  assertBridgeRuntimeCapabilityBlocked,
} from "../runtime/bridgeRuntimeCapabilityGuard";

import {
  createBridgeRuntimeSafetyReport,
} from "../runtime/bridgeRuntimeSafetyReport";

import {
  type BridgeAcknowledgementContractSnapshot,
  type BridgeAcknowledgementRecordContract,
} from "./bridgeAcknowledgementContractTypes";

export function createDisabledBridgeAcknowledgementRecordContract(
  acknowledgementId = "acknowledgement-disabled-placeholder",
  receiptId: string | null = null
): BridgeAcknowledgementRecordContract {

  return {
    acknowledgementId,
    receiptId,
    source: "disabledPlaceholder",
    displayName: "Acknowledgement disabled placeholder",
    prepared: false,
    correlated: false,
    sent: false,
    persisted: false,
    retried: false,
    transportReady: false,
    queueUpdateReady: false,
    mutationReady: false,
    operationalCapability: false,
    reason:
      "Acknowledgement record is a disabled placeholder only. No preparation, correlation, send, retry, persistence, receipt update, queue update, transport, or mutation is allowed in Phase 32 B8.",
  };
}

export function createBridgeAcknowledgementContractSnapshot(): BridgeAcknowledgementContractSnapshot {

  const safetyReport = createBridgeRuntimeSafetyReport();
  const acknowledgementDecision = assertBridgeRuntimeCapabilityBlocked(
    "acknowledgements",
    safetyReport.runtimeSnapshot.featureGates
  );

  if (
    acknowledgementDecision.allowed !== false ||
    acknowledgementDecision.blocked !== true ||
    safetyReport.safeToRunOperationalBridge !== false
  ) {
    throw new Error(
      "Bridge acknowledgement contract attempted to become operational."
    );
  }

  return {
    phase: "32.B8",
    enabled: false,
    executionAllowed: false,
    acknowledgementsActive: false,
    preparationAllowed: false,
    correlationAllowed: false,
    sendAllowed: false,
    retryAllowed: false,
    persistenceAllowed: false,
    receiptMutationAllowed: false,
    outboundQueueUpdateAllowed: false,
    inboxUpdateAllowed: false,
    transportAllowed: false,
    mutationAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    records: [],
    reason:
      "Acknowledgement contract skeleton is disabled in Phase 32 B8. It defines shape only and performs no acknowledgement handling.",
  };
}
