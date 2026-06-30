import {
  assertBridgeRuntimeCapabilityBlocked,
} from "../runtime/bridgeRuntimeCapabilityGuard";

import {
  createBridgeRuntimeSafetyReport,
} from "../runtime/bridgeRuntimeSafetyReport";

import {
  type BridgeQrPairingContractSnapshot,
  type BridgeQrPairingOfferContract,
} from "./bridgeQrPairingContractTypes";

export function createDisabledBridgeQrPairingOfferContract(
  offerId = "qr-pairing-disabled-placeholder"
): BridgeQrPairingOfferContract {

  return {
    offerId,
    source: "disabledPlaceholder",
    displayName: "QR pairing disabled placeholder",
    parsed: false,
    verified: false,
    pairingAccepted: false,
    deviceTrusted: false,
    endpointResolved: false,
    transportReady: false,
    persistenceReady: false,
    mutationReady: false,
    operationalCapability: false,
    reason:
      "QR pairing offer is a disabled placeholder only. No parsing, acceptance, endpoint resolution, transport, persistence, or mutation is allowed in Phase 32 B2.",
  };
}

export function createBridgeQrPairingContractSnapshot(): BridgeQrPairingContractSnapshot {

  const safetyReport = createBridgeRuntimeSafetyReport();
  const qrPairingDecision = assertBridgeRuntimeCapabilityBlocked(
    "qrPairing",
    safetyReport.runtimeSnapshot.featureGates
  );

  if (
    qrPairingDecision.allowed !== false ||
    qrPairingDecision.blocked !== true ||
    safetyReport.safeToRunOperationalBridge !== false
  ) {
    throw new Error(
      "Bridge QR pairing contract attempted to become operational."
    );
  }

  return {
    phase: "32.B2",
    enabled: false,
    executionAllowed: false,
    qrPairingActive: false,
    qrParsingAllowed: false,
    qrCaptureAllowed: false,
    pairingAcceptanceAllowed: false,
    trustedDevicePersistenceAllowed: false,
    endpointResolutionAllowed: false,
    transportAllowed: false,
    queueProcessingAllowed: false,
    inboxProcessingAllowed: false,
    persistenceAllowed: false,
    mutationAllowed: false,
    inventoryMutationAllowed: false,
    scanOpsMutationAllowed: false,
    offers: [],
    reason:
      "QR pairing contract skeleton is disabled in Phase 32 B2. It defines shape only and performs no pairing execution.",
  };
}
