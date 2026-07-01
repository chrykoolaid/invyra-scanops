export type BridgeRecoveryContractPhase = "32.B10";

export type BridgeRecoveryActionSource = "disabledPlaceholder";

export interface BridgeRecoveryActionContract {
  actionId: string;

  source: BridgeRecoveryActionSource;

  displayName: string;

  evaluated: false;

  scheduled: false;

  retryReady: false;

  rollbackReady: false;

  queueReady: false;

  inboxReady: false;

  persistenceReady: false;

  mutationReady: false;

  operationalCapability: false;

  reason: string;
}

export interface BridgeRecoveryContractSnapshot {
  phase: BridgeRecoveryContractPhase;

  enabled: false;

  executionAllowed: false;

  recoveryActive: false;

  evaluationAllowed: false;

  schedulingAllowed: false;

  retryAllowed: false;

  rollbackAllowed: false;

  queueProcessingAllowed: false;

  inboxProcessingAllowed: false;

  receiptProcessingAllowed: false;

  acknowledgementProcessingAllowed: false;

  diagnosticsExecutionAllowed: false;

  transportAllowed: false;

  persistenceAllowed: false;

  mutationAllowed: false;

  inventoryMutationAllowed: false;

  scanOpsMutationAllowed: false;

  actions: readonly BridgeRecoveryActionContract[];

  reason: string;
}
