import {
  assertBridgeRuntimeCapabilityBlocked,
} from "../runtime/bridgeRuntimeCapabilityGuard";

import {
  createBridgeRuntimeSafetyReport,
} from "../runtime/bridgeRuntimeSafetyReport";

import {
  type BridgeOutboundQueueContractSnapshot,
  type BridgeOutboundQueueEntryContract,
} from "./bridgeOutboundQueueContractTypes";

export function createDisabledBridgeOutboundQueueEntryContract(
  entryId = "outbound-queue-disabled-placeholder"
): BridgeOutboundQueueEntryContract {

  return {
    entryId,
    source: "disabledPlaceholder",
    displayName: "Outbound queue disabled placeholder",
    queued: false,
    validated: false,
    persisted: false,
    dispatchReady: false,
    replayReady: false,
    receiptReady: false,
    acknowledgementReady: false,
    mutationReady: false,
    operationalCapability: false,
    reason:
      "Outbound queue entry is a disabled placeholder only. No enqueue, validation, persistence, dequeue, replay, dispatch, receipt processing, acknowledgement processing, or mutation is allowed in Phase 32 B5.",
  };
}

export function createBridgeOutboundQueueContractSnapshot(): BridgeOutboundQueueContractSnapshot {

  const safetyReport = createBridgeRuntimeSafetyReport();
  const outboundQueueDecision = assertBridgeRuntimeCapabilityBlocked(
    "outboundQueue",
    safetyReport.runtimeSnapshot.featureGates
  );

  if (
    outboundQueueDecision.allowed !== false ||
    outboundQueueDecision.blocked !== true ||
    safetyReport.safeToRunOperationalBridge !== false
  ) {
    throw new Error(
      "Bridge outbound queue contract attempted to become operational."
    );
  }

  return {
    phase: "32.B5",
    enabled: false,
    executionAllowed: false,
    outboundQueueActive: false,
    enqueueAllowed: false,
    validationAllowed: false,
    persistenceAllowed: false,
    dequeueAllowed: false,
    replayAllowed: false,
    dispatchAllowed: false,
    transportAllowed: false,
    receiptProcessingAllowed: false,
    acknowledgementProcessingAllowed: false,
    inboxProcessingAllowed: false,
    mutationAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    entries: [],
    reason:
      "Outbound queue contract skeleton is disabled in Phase 32 B5. It defines shape only and performs no outbound queue execution.",
  };
}
