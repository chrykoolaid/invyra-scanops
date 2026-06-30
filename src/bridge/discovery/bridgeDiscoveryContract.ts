import {
  assertBridgeRuntimeCapabilityBlocked,
} from "../runtime/bridgeRuntimeCapabilityGuard";

import {
  createBridgeRuntimeSafetyReport,
} from "../runtime/bridgeRuntimeSafetyReport";

import {
  type BridgeDiscoveryCandidateContract,
  type BridgeDiscoveryContractSnapshot,
} from "./bridgeDiscoveryContractTypes";

export function createDisabledBridgeDiscoveryCandidateContract(
  candidateId = "discovery-disabled-placeholder"
): BridgeDiscoveryCandidateContract {

  return {
    candidateId,
    source: "disabledPlaceholder",
    displayName: "Discovery disabled placeholder",
    endpointResolved: false,
    networkReachable: false,
    paired: false,
    trusted: false,
    transportReady: false,
    persistenceReady: false,
    mutationReady: false,
    operationalCapability: false,
    reason:
      "Discovery candidate is a disabled placeholder only. No network, pairing, transport, persistence, or mutation is allowed in Phase 32 B1.",
  };
}

export function createBridgeDiscoveryContractSnapshot(): BridgeDiscoveryContractSnapshot {

  const safetyReport = createBridgeRuntimeSafetyReport();
  const discoveryDecision = assertBridgeRuntimeCapabilityBlocked(
    "discovery",
    safetyReport.runtimeSnapshot.featureGates
  );

  if (
    discoveryDecision.allowed !== false ||
    discoveryDecision.blocked !== true ||
    safetyReport.safeToRunOperationalBridge !== false
  ) {
    throw new Error(
      "Bridge discovery contract attempted to become operational."
    );
  }

  return {
    phase: "32.B1",
    enabled: false,
    executionAllowed: false,
    discoveryActive: false,
    networkScanAllowed: false,
    mdnsAllowed: false,
    ipScanAllowed: false,
    qrPairingAllowed: false,
    manualConnectAllowed: false,
    trustedDevicePersistenceAllowed: false,
    transportAllowed: false,
    queueProcessingAllowed: false,
    inboxProcessingAllowed: false,
    persistenceAllowed: false,
    mutationAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    candidates: [],
    reason:
      "Discovery contract skeleton is disabled in Phase 32 B1. It defines shape only and performs no discovery execution.",
  };
}
