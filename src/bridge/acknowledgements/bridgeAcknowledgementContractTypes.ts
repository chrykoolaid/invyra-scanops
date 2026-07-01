export type BridgeAcknowledgementContractPhase = "32.B8";

export type BridgeAcknowledgementRecordSource = "disabledPlaceholder";

export interface BridgeAcknowledgementRecordContract {
  acknowledgementId: string;

  receiptId: string | null;

  source: BridgeAcknowledgementRecordSource;

  displayName: string;

  prepared: false;

  correlated: false;

  sent: false;

  persisted: false;

  retried: false;

  transportReady: false;

  queueUpdateReady: false;

  mutationReady: false;

  operationalCapability: false;

  reason: string;
}

export interface BridgeAcknowledgementContractSnapshot {
  phase: BridgeAcknowledgementContractPhase;

  enabled: false;

  executionAllowed: false;

  acknowledgementsActive: false;

  preparationAllowed: false;

  correlationAllowed: false;

  sendAllowed: false;

  retryAllowed: false;

  persistenceAllowed: false;

  receiptMutationAllowed: false;

  outboundQueueUpdateAllowed: false;

  inboxUpdateAllowed: false;

  transportAllowed: false;

  mutationAllowed: false;

  inventoryMutationAllowed: false;

  scanOpsMutationAllowed: false;

  records: readonly BridgeAcknowledgementRecordContract[];

  reason: string;
}
