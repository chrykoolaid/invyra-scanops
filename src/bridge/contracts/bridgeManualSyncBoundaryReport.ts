import {
  createBridgeContractRegistryReadinessReport,
} from "./bridgeContractRegistryReadinessReport";

import type {
  BridgeManualSyncBoundaryReport,
} from "./bridgeManualSyncBoundaryReportTypes";

export function createBridgeManualSyncBoundaryReport(): BridgeManualSyncBoundaryReport {

  const registryReadinessReport = createBridgeContractRegistryReadinessReport();

  if (
    registryReadinessReport.safeToRunOperationalBridge !== false ||
    registryReadinessReport.readyForActivation !== false ||
    registryReadinessReport.registryEnabled !== false ||
    registryReadinessReport.registryExecutionAllowed !== false ||
    registryReadinessReport.registryActive !== false ||
    registryReadinessReport.operationalCapabilityActive !== false ||
    registryReadinessReport.totals.activeContracts !== 0 ||
    registryReadinessReport.totals.enabledContracts !== 0 ||
    registryReadinessReport.totals.executableContracts !== 0 ||
    registryReadinessReport.totals.operationalContracts !== 0
  ) {
    throw new Error(
      "Bridge manual sync boundary report detected Phase 32 activation drift."
    );
  }

  return {
    phase: "32.C6",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    registryReadinessReport,
    manualSyncLayer: {
      name: "Bridge Phase 8 Manual Sync",
      componentPath: "src/inventory-bridge/manualSync",
      phase32Owned: false,
      manualOnly: true,
      automaticSyncAllowed: false,
      backgroundReplayAllowed: false,
      directInventoryMutationAllowed: false,
      directScanOpsMutationAllowed: false,
      stockMutationAllowed: false,
      priceMutationAllowed: false,
      approvalMutationAllowed: false,
      phase32RuntimeActivationAllowed: false,
      requiresSeparateGovernanceReview: true,
      reason:
        "Bridge Phase 8 manual sync exists outside the Phase 32 registry scaffold and requires separate governance before any wider activation decision.",
    },
    phase32RegistryEnabled: false,
    phase32RegistryExecutionAllowed: false,
    phase32RuntimeStillInactive: true,
    phase32ReadyForActivation: false,
    bridgeActivationAllowed: false,
    safeToRunOperationalBridge: false,
    externalManualSyncLayerPresent: true,
    phase32BoundaryAcknowledged: true,
    reason:
      "Phase 32 C6 acknowledges the external manual sync layer while keeping the Phase 32 runtime, registry, and bridge activation decision blocked.",
  };
}
