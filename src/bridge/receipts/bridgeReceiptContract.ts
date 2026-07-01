import {
  assertBridgeRuntimeCapabilityBlocked,
} from "../runtime/bridgeRuntimeCapabilityGuard";

import {
  createBridgeRuntimeSafetyReport,
} from "../runtime/bridgeRuntimeSafetyReport";

import {
  type BridgeReceiptContractSnapshot,
  type BridgeReceiptRecordContract,
} from "./bridgeReceiptContractTypes";

export function createDisabledBridgeReceiptRecordContract(
  receiptId = "receipt-disabled-placeholder"
): BridgeReceiptRecordContract {

  return {
    receiptId,
    source: "disabledPlaceholder",
    displayName: "Receipt disabled placeholder",
    accepted: false,
    correlated: false,
    persisted: false,
    applied: false,
    outboundQueueReady: false,
    acknowledgementReady: false,
    mutationReady: false,
    operationalCapability: false,
    reason:
      "Receipt record is a disabled placeholder only. No acceptance, correlation, persistence, apply, outbound queue update, acknowledgement handling, transport, or mutation is allowed in Phase 32 B7.",
  };
}

export function createBridgeReceiptContractSnapshot(): BridgeReceiptContractSnapshot {

  const safetyReport = createBridgeRuntimeSafetyReport();
  const receiptDecision = assertBridgeRuntimeCapabilityBlocked(
    "receipts",
    safetyReport.runtimeSnapshot.featureGates
  );

  if (
    receiptDecision.allowed !== false ||
    receiptDecision.blocked !== true ||
    safetyReport.safeToRunOperationalBridge !== false
  ) {
    throw new Error(
      "Bridge receipt contract attempted to become operational."
    );
  }

  return {
    phase: "32.B7",
    enabled: false,
    executionAllowed: false,
    receiptsActive: false,
    acceptanceAllowed: false,
    correlationAllowed: false,
    persistenceAllowed: false,
    applyAllowed: false,
    outboundQueueUpdateAllowed: false,
    acknowledgementAllowed: false,
    acknowledgementProcessingAllowed: false,
    queueProcessingAllowed: false,
    inboxProcessingAllowed: false,
    transportAllowed: false,
    mutationAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    records: [],
    reason:
      "Receipt contract skeleton is disabled in Phase 32 B7. It defines shape only and performs no receipt execution.",
  };
}
