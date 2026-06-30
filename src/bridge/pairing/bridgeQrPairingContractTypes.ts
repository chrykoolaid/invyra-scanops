export type BridgeQrPairingContractPhase = "32.B2";

export type BridgeQrPairingOfferSource = "disabledPlaceholder";

export interface BridgeQrPairingOfferContract {
  offerId: string;

  source: BridgeQrPairingOfferSource;

  displayName: string;

  parsed: false;

  verified: false;

  pairingAccepted: false;

  deviceTrusted: false;

  endpointResolved: false;

  transportReady: false;

  persistenceReady: false;

  mutationReady: false;

  operationalCapability: false;

  reason: string;
}

export interface BridgeQrPairingContractSnapshot {
  phase: BridgeQrPairingContractPhase;

  enabled: false;

  executionAllowed: false;

  qrPairingActive: false;

  qrParsingAllowed: false;

  qrCaptureAllowed: false;

  pairingAcceptanceAllowed: false;

  trustedDevicePersistenceAllowed: false;

  endpointResolutionAllowed: false;

  transportAllowed: false;

  queueProcessingAllowed: false;

  inboxProcessingAllowed: false;

  persistenceAllowed: false;

  mutationAllowed: false;

  inventoryMutationAllowed: false;

  scanOpsMutationAllowed: false;

  offers: readonly BridgeQrPairingOfferContract[];

  reason: string;
}
