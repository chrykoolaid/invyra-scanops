import type { BridgeRuntimeSafetyReport } from "../runtime/bridgeRuntimeSafetyReport";

import type {
  BridgeContractRegistryEntry,
  BridgeContractRegistrySnapshot,
} from "./bridgeContractRegistryTypes";

export type BridgeContractRegistryReadinessReportPhase = "32.C4";

export interface BridgeContractRegistryReadinessReportTotals {
  readonly contractCount: 10;

  readonly activeContracts: 0;

  readonly enabledContracts: 0;

  readonly executableContracts: 0;

  readonly operationalContracts: 0;
}

export interface BridgeContractRegistryReadinessReport {
  readonly phase: BridgeContractRegistryReadinessReportPhase;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly runtimeSafetyReport: BridgeRuntimeSafetyReport;

  readonly registrySnapshot: BridgeContractRegistrySnapshot;

  readonly contracts: readonly BridgeContractRegistryEntry[];

  readonly totals: BridgeContractRegistryReadinessReportTotals;

  readonly registryEnabled: false;

  readonly registryExecutionAllowed: false;

  readonly registryActive: false;

  readonly allContractsDisabled: true;

  readonly operationalCapabilityActive: false;

  readonly safeToRunOperationalBridge: false;

  readonly readyForActivation: false;

  readonly reason: string;
}
