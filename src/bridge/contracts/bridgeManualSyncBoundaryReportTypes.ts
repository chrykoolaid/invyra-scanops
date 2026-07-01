import type {
  BridgeContractRegistryReadinessReport,
} from "./bridgeContractRegistryReadinessReportTypes";

export type BridgeManualSyncBoundaryReportPhase = "32.C6";

export interface BridgeManualSyncBoundaryLayer {
  readonly name: "Bridge Phase 8 Manual Sync";

  readonly componentPath: "src/inventory-bridge/manualSync";

  readonly phase32Owned: false;

  readonly manualOnly: true;

  readonly automaticSyncAllowed: false;

  readonly backgroundReplayAllowed: false;

  readonly directInventoryMutationAllowed: false;

  readonly directScanOpsMutationAllowed: false;

  readonly stockMutationAllowed: false;

  readonly priceMutationAllowed: false;

  readonly approvalMutationAllowed: false;

  readonly phase32RuntimeActivationAllowed: false;

  readonly requiresSeparateGovernanceReview: true;

  readonly reason: string;
}

export interface BridgeManualSyncBoundaryReport {
  readonly phase: BridgeManualSyncBoundaryReportPhase;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly registryReadinessReport: BridgeContractRegistryReadinessReport;

  readonly manualSyncLayer: BridgeManualSyncBoundaryLayer;

  readonly phase32RegistryEnabled: false;

  readonly phase32RegistryExecutionAllowed: false;

  readonly phase32RuntimeStillInactive: true;

  readonly phase32ReadyForActivation: false;

  readonly bridgeActivationAllowed: false;

  readonly safeToRunOperationalBridge: false;

  readonly externalManualSyncLayerPresent: true;

  readonly phase32BoundaryAcknowledged: true;

  readonly reason: string;
}
