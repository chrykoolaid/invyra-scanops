export type BridgeReceiptContractPhase = "32.B7";

export type BridgeReceiptRecordSource = "disabledPlaceholder";

export interface BridgeReceiptRecordContract {
  receiptId: string;

  source: BridgeReceiptRecordSource;

  displayName: string;

  accepted: false;

  correlated: false;

  persisted: false;

  applied: false;

  outboundQueueReady: false;

  acknowledgementReady: false;

  mutationReady: false;

  operationalCapability: false;

  reason: string;
}

export interface BridgeReceiptContractSnapshot {
  phase: BridgeReceiptContractPhase;

  enabled: false;

  executionAllowed: false;

  receiptsActive: false;

  acceptanceAllowed: false;

  correlationAllowed: false;

  persistenceAllowed: false;

  applyAllowed: false;

  outboundQueueUpdateAllowed: false;

  acknowledgementAllowed: false;

  acknowledgementProcessingAllowed: false;

  queueProcessingAllowed: false;

  inboxProcessingAllowed: false;

  transportAllowed: false;

  mutationAllowed: false;

  inventoryMutationAllowed: false;

  scanOpsMutationAllowed: false;

  records: readonly BridgeReceiptRecordContract[];

  reason: string;
}
