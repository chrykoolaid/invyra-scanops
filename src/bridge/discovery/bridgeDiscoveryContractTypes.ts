export type BridgeDiscoveryContractPhase = "32.B1";

export type BridgeDiscoveryCandidateSource = "disabledPlaceholder";

export interface BridgeDiscoveryCandidateContract {
  candidateId: string;

  source: BridgeDiscoveryCandidateSource;

  displayName: string;

  endpointResolved: false;

  networkReachable: false;

  paired: false;

  trusted: false;

  transportReady: false;

  persistenceReady: false;

  mutationReady: false;

  operationalCapability: false;

  reason: string;
}

export interface BridgeDiscoveryContractSnapshot {
  phase: BridgeDiscoveryContractPhase;

  enabled: false;

  executionAllowed: false;

  discoveryActive: false;

  networkScanAllowed: false;

  mdnsAllowed: false;

  ipScanAllowed: false;

  qrPairingAllowed: false;

  manualConnectAllowed: false;

  trustedDevicePersistenceAllowed: false;

  transportAllowed: false;

  queueProcessingAllowed: false;

  inboxProcessingAllowed: false;

  persistenceAllowed: false;

  mutationAllowed: false;

  inventoryMutationAllowed: false;

  scanOpsMutationAllowed: false;

  candidates: readonly BridgeDiscoveryCandidateContract[];

  reason: string;
}
