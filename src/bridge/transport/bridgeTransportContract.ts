import {
  assertBridgeRuntimeCapabilityBlocked,
} from "../runtime/bridgeRuntimeCapabilityGuard";

import {
  createBridgeRuntimeSafetyReport,
} from "../runtime/bridgeRuntimeSafetyReport";

import {
  type BridgeTransportContractSnapshot,
  type BridgeTransportEndpointContract,
} from "./bridgeTransportContractTypes";

export function createDisabledBridgeTransportEndpointContract(
  endpointId = "transport-disabled-placeholder"
): BridgeTransportEndpointContract {

  return {
    endpointId,
    source: "disabledPlaceholder",
    displayName: "Transport disabled placeholder",
    resolved: false,
    reachable: false,
    authenticated: false,
    dispatchReady: false,
    receiveReady: false,
    retryReady: false,
    persistenceReady: false,
    mutationReady: false,
    operationalCapability: false,
    reason:
      "Transport endpoint is a disabled placeholder only. No endpoint resolution, network dispatch, response receiving, retry, persistence, or mutation is allowed in Phase 32 B4.",
  };
}

export function createBridgeTransportContractSnapshot(): BridgeTransportContractSnapshot {

  const safetyReport = createBridgeRuntimeSafetyReport();
  const transportDecision = assertBridgeRuntimeCapabilityBlocked(
    "transport",
    safetyReport.runtimeSnapshot.featureGates
  );

  if (
    transportDecision.allowed !== false ||
    transportDecision.blocked !== true ||
    safetyReport.safeToRunOperationalBridge !== false
  ) {
    throw new Error(
      "Bridge transport contract attempted to become operational."
    );
  }

  return {
    phase: "32.B4",
    enabled: false,
    executionAllowed: false,
    transportActive: false,
    endpointResolutionAllowed: false,
    networkDispatchAllowed: false,
    networkReceiveAllowed: false,
    requestSendAllowed: false,
    responseReceiveAllowed: false,
    retryAllowed: false,
    queueProcessingAllowed: false,
    inboxProcessingAllowed: false,
    receiptProcessingAllowed: false,
    acknowledgementProcessingAllowed: false,
    persistenceAllowed: false,
    mutationAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    endpoints: [],
    reason:
      "Transport contract skeleton is disabled in Phase 32 B4. It defines shape only and performs no transport execution.",
  };
}
