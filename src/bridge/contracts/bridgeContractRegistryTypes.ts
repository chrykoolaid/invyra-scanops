import type { BridgeFeatureGateName } from "../runtime/bridgeFeatureGateTypes";

export type BridgeContractRegistryPhase = "32.C1";

export type BridgeContractRegistryName =
  | "discovery"
  | "qrPairing"
  | "trustedDeviceRegistry"
  | "transport"
  | "outboundQueue"
  | "inboundInbox"
  | "receipts"
  | "acknowledgements"
  | "diagnostics"
  | "recovery";

export interface BridgeContractRegistrySnapshotValue {
  readonly phase: string;

  readonly enabled: false;

  readonly executionAllowed: false;

  readonly reason: string;

  readonly [key: string]: unknown;
}

export interface BridgeContractRegistryEntry {
  readonly name: BridgeContractRegistryName;

  readonly requiredGate: BridgeFeatureGateName;

  readonly phase: string;

  readonly enabled: false;

  readonly executionAllowed: false;

  readonly operationalCapabilityActive: false;

  readonly snapshot: BridgeContractRegistrySnapshotValue;

  readonly reason: string;
}

export interface BridgeContractRegistrySnapshot {
  readonly phase: BridgeContractRegistryPhase;

  readonly systemOfRecord: "Inventory Desktop";

  readonly operationalLayer: "ScanOps";

  readonly enabled: false;

  readonly executionAllowed: false;

  readonly registryActive: false;

  readonly allContractsDisabled: true;

  readonly activeContracts: 0;

  readonly operationalCapabilityActive: false;

  readonly safeToRunOperationalBridge: false;

  readonly contracts: readonly BridgeContractRegistryEntry[];

  readonly reason: string;
}
