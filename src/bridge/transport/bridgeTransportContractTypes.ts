export type BridgeTransportContractPhase = "32.B4";

export type BridgeTransportEndpointSource = "disabledPlaceholder";

export interface BridgeTransportEndpointContract {
  endpointId: string;

  source: BridgeTransportEndpointSource;

  displayName: string;

  resolved: false;

  reachable: false;

  authenticated: false;

  dispatchReady: false;

  receiveReady: false;

  retryReady: false;

  persistenceReady: false;

  mutationReady: false;

  operationalCapability: false;

  reason: string;
}

export interface BridgeTransportContractSnapshot {
  phase: BridgeTransportContractPhase;

  enabled: false;

  executionAllowed: false;

  transportActive: false;

  endpointResolutionAllowed: false;

  networkDispatchAllowed: false;

  networkReceiveAllowed: false;

  requestSendAllowed: false;

  responseReceiveAllowed: false;

  retryAllowed: false;

  queueProcessingAllowed: false;

  inboxProcessingAllowed: false;

  receiptProcessingAllowed: false;

  acknowledgementProcessingAllowed: false;

  persistenceAllowed: false;

  mutationAllowed: false;

  inventoryMutationAllowed: false;

  scanOpsMutationAllowed: false;

  endpoints: readonly BridgeTransportEndpointContract[];

  reason: string;
}
