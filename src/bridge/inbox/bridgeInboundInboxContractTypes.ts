export type BridgeInboundInboxContractPhase = "32.B6";

export type BridgeInboundInboxEntrySource = "disabledPlaceholder";

export interface BridgeInboundInboxEntryContract {
  entryId: string;

  source: BridgeInboundInboxEntrySource;

  displayName: string;

  received: false;

  validated: false;

  persisted: false;

  applied: false;

  receiptReady: false;

  acknowledgementReady: false;

  mutationReady: false;

  operationalCapability: false;

  reason: string;
}

export interface BridgeInboundInboxContractSnapshot {
  phase: BridgeInboundInboxContractPhase;

  enabled: false;

  executionAllowed: false;

  inboundInboxActive: false;

  receiveAllowed: false;

  validationAllowed: false;

  persistenceAllowed: false;

  applyAllowed: false;

  receiptProcessingAllowed: false;

  acknowledgementProcessingAllowed: false;

  queueProcessingAllowed: false;

  transportAllowed: false;

  mutationAllowed: false;

  inventoryMutationAllowed: false;

  scanOpsMutationAllowed: false;

  entries: readonly BridgeInboundInboxEntryContract[];

  reason: string;
}
