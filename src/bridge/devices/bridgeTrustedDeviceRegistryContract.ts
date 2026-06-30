import {
  assertBridgeRuntimeCapabilityBlocked,
} from "../runtime/bridgeRuntimeCapabilityGuard";

import {
  createBridgeRuntimeSafetyReport,
} from "../runtime/bridgeRuntimeSafetyReport";

import {
  type BridgeTrustedDeviceRecordContract,
  type BridgeTrustedDeviceRegistryContractSnapshot,
} from "./bridgeTrustedDeviceRegistryContractTypes";

export function createDisabledBridgeTrustedDeviceRecordContract(
  deviceId = "trusted-device-registry-disabled-placeholder"
): BridgeTrustedDeviceRecordContract {

  return {
    deviceId,
    source: "disabledPlaceholder",
    displayName: "Trusted device registry disabled placeholder",
    registered: false,
    trusted: false,
    verified: false,
    reconnectAllowed: false,
    endpointResolved: false,
    transportReady: false,
    persistenceReady: false,
    mutationReady: false,
    operationalCapability: false,
    reason:
      "Trusted device record is a disabled placeholder only. No registration, trust evaluation, reconnect, endpoint resolution, transport, persistence, or mutation is allowed in Phase 32 B3.",
  };
}

export function createBridgeTrustedDeviceRegistryContractSnapshot(): BridgeTrustedDeviceRegistryContractSnapshot {

  const safetyReport = createBridgeRuntimeSafetyReport();
  const trustedDeviceDecision = assertBridgeRuntimeCapabilityBlocked(
    "trustedDeviceRegistry",
    safetyReport.runtimeSnapshot.featureGates
  );

  if (
    trustedDeviceDecision.allowed !== false ||
    trustedDeviceDecision.blocked !== true ||
    safetyReport.safeToRunOperationalBridge !== false
  ) {
    throw new Error(
      "Bridge trusted device registry contract attempted to become operational."
    );
  }

  return {
    phase: "32.B3",
    enabled: false,
    executionAllowed: false,
    registryActive: false,
    deviceRegistrationAllowed: false,
    trustEvaluationAllowed: false,
    deviceVerificationAllowed: false,
    reconnectAllowed: false,
    endpointResolutionAllowed: false,
    trustedDevicePersistenceAllowed: false,
    transportAllowed: false,
    queueProcessingAllowed: false,
    inboxProcessingAllowed: false,
    persistenceAllowed: false,
    mutationAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    records: [],
    reason:
      "Trusted device registry contract skeleton is disabled in Phase 32 B3. It defines shape only and performs no registry execution.",
  };
}
