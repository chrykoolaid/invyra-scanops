import {
  assertBridgeRuntimeCapabilityBlocked,
} from "../runtime/bridgeRuntimeCapabilityGuard";

import {
  createBridgeRuntimeSafetyReport,
} from "../runtime/bridgeRuntimeSafetyReport";

import {
  type BridgeInboundInboxContractSnapshot,
  type BridgeInboundInboxEntryContract,
} from "./bridgeInboundInboxContractTypes";

export function createDisabledBridgeInboundInboxEntryContract(
  entryId = "inbound-inbox-disabled-placeholder"
): BridgeInboundInboxEntryContract {

  return {
    entryId,
    source: "disabledPlaceholder",
    displayName: "Inbound inbox disabled placeholder",
    received: false,
    validated: false,
    persisted: false,
    applied: false,
    receiptReady: false,
    acknowledgementReady: false,
    mutationReady: false,
    operationalCapability: false,
    reason:
      "Inbound inbox entry is a disabled placeholder only. No receive, validation, persistence, apply, receipt processing, acknowledgement processing, transport, or mutation is allowed in Phase 32 B6.",
  };
}

export function createBridgeInboundInboxContractSnapshot(): BridgeInboundInboxContractSnapshot {

  const safetyReport = createBridgeRuntimeSafetyReport();
  const inboundInboxDecision = assertBridgeRuntimeCapabilityBlocked(
    "inboundInbox",
    safetyReport.runtimeSnapshot.featureGates
  );

  if (
    inboundInboxDecision.allowed !== false ||
    inboundInboxDecision.blocked !== true ||
    safetyReport.safeToRunOperationalBridge !== false
  ) {
    throw new Error(
      "Bridge inbound inbox contract attempted to become operational."
    );
  }

  return {
    phase: "32.B6",
    enabled: false,
    executionAllowed: false,
    inboundInboxActive: false,
    receiveAllowed: false,
    validationAllowed: false,
    persistenceAllowed: false,
    applyAllowed: false,
    receiptProcessingAllowed: false,
    acknowledgementProcessingAllowed: false,
    queueProcessingAllowed: false,
    transportAllowed: false,
    mutationAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    entries: [],
    reason:
      "Inbound inbox contract skeleton is disabled in Phase 32 B6. It defines shape only and performs no inbound inbox execution.",
  };
}
