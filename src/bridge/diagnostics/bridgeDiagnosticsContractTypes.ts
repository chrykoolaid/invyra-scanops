export type BridgeDiagnosticsContractPhase = "32.B9";

export type BridgeDiagnosticsCheckSource = "disabledPlaceholder";

export type BridgeDiagnosticsSeverity = "info" | "warning" | "blocked";

export interface BridgeDiagnosticsCheckContract {
  diagnosticId: string;

  source: BridgeDiagnosticsCheckSource;

  displayName: string;

  severity: BridgeDiagnosticsSeverity;

  evaluated: false;

  emitted: false;

  persisted: false;

  exported: false;

  transportReady: false;

  mutationReady: false;

  operationalCapability: false;

  reason: string;
}

export interface BridgeDiagnosticsContractSnapshot {
  phase: BridgeDiagnosticsContractPhase;

  enabled: false;

  executionAllowed: false;

  diagnosticsActive: false;

  evaluationAllowed: false;

  eventEmissionAllowed: false;

  persistenceAllowed: false;

  exportAllowed: false;

  transportAllowed: false;

  recoveryTriggerAllowed: false;

  queueProcessingAllowed: false;

  inboxProcessingAllowed: false;

  receiptProcessingAllowed: false;

  acknowledgementProcessingAllowed: false;

  mutationAllowed: false;

  inventoryMutationAllowed: false;

  scanOpsMutationAllowed: false;

  checks: readonly BridgeDiagnosticsCheckContract[];

  reason: string;
}
