export type BridgeOutboundQueueContractPhase = "32.B5";

export type BridgeOutboundQueueEntrySource = "disabledPlaceholder";

export interface BridgeOutboundQueueEntryContract {
  entryId: string;

  source: BridgeOutboundQueueEntrySource;

  displayName: string;

  queued: false;

  validated: false;

  persisted: false;

  dispatchReady: false;

  replayReady: false;

  receiptReady: false;

  acknowledgementReady: false;

  mutationReady: false;

  operationalCapability: false;

  reason: string;
}

export interface BridgeOutboundQueueContractSnapshot {
  phase: BridgeOutboundQueueContractPhase;

  enabled: false;

  executionAllowed: false;

  outboundQueueActive: false;

  enqueueAllowed: false;

  validationAllowed: false;

  persistenceAllowed: false;

  dequeueAllowed: false;

  replayAllowed: false;

  dispatchAllowed: false;

  transportAllowed: false;

  receiptProcessingAllowed: false;

  acknowledgementProcessingAllowed: false;

  inboxProcessingAllowed: false;

  mutationAllowed: false;

  inventoryMutationAllowed: false;

  scanOpsMutationAllowed: false;

  entries: readonly BridgeOutboundQueueEntryContract[];

  reason: string;
}
