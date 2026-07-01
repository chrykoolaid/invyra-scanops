import {
  createBridgeRuntimeSafetyReport,
} from "../runtime/bridgeRuntimeSafetyReport";

import {
  getBridgeContractRegistrySnapshot,
} from "./bridgeContractRegistryAccessors";

import type {
  BridgeContractRegistryReadinessReport,
} from "./bridgeContractRegistryReadinessReportTypes";

export function createBridgeContractRegistryReadinessReport(): BridgeContractRegistryReadinessReport {

  const runtimeSafetyReport = createBridgeRuntimeSafetyReport();
  const registrySnapshot = getBridgeContractRegistrySnapshot();

  const enabledContracts = registrySnapshot.contracts.filter(
    (contract) => contract.enabled !== false
  );

  const executableContracts = registrySnapshot.contracts.filter(
    (contract) => contract.executionAllowed !== false
  );

  const operationalContracts = registrySnapshot.contracts.filter(
    (contract) => contract.operationalCapabilityActive !== false
  );

  if (
    runtimeSafetyReport.safeToRunOperationalBridge !== false ||
    registrySnapshot.safeToRunOperationalBridge !== false ||
    registrySnapshot.enabled !== false ||
    registrySnapshot.executionAllowed !== false ||
    registrySnapshot.registryActive !== false ||
    registrySnapshot.allContractsDisabled !== true ||
    registrySnapshot.activeContracts !== 0 ||
    registrySnapshot.operationalCapabilityActive !== false ||
    registrySnapshot.contracts.length !== 10 ||
    enabledContracts.length !== 0 ||
    executableContracts.length !== 0 ||
    operationalContracts.length !== 0
  ) {
    throw new Error(
      "Bridge contract registry readiness report detected activation drift."
    );
  }

  return {
    phase: "32.C4",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    runtimeSafetyReport,
    registrySnapshot,
    contracts: registrySnapshot.contracts,
    totals: {
      contractCount: 10,
      activeContracts: 0,
      enabledContracts: 0,
      executableContracts: 0,
      operationalContracts: 0,
    },
    registryEnabled: false,
    registryExecutionAllowed: false,
    registryActive: false,
    allContractsDisabled: true,
    operationalCapabilityActive: false,
    safeToRunOperationalBridge: false,
    readyForActivation: false,
    reason:
      "Contract registry readiness report is read-only in Phase 32 C4. It summarizes disabled bridge contracts only and does not activate the bridge.",
  };
}
