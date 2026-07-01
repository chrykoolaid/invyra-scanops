import { createBridgeDiscoveryContractSnapshot } from "../discovery/bridgeDiscoveryContract";
import { createBridgeQrPairingContractSnapshot } from "../pairing/bridgeQrPairingContract";
import { createBridgeTrustedDeviceRegistryContractSnapshot } from "../devices/bridgeTrustedDeviceRegistryContract";
import { createBridgeTransportContractSnapshot } from "../transport/bridgeTransportContract";
import { createBridgeOutboundQueueContractSnapshot } from "../queue/bridgeOutboundQueueContract";
import { createBridgeInboundInboxContractSnapshot } from "../inbox/bridgeInboundInboxContract";
import { createBridgeReceiptContractSnapshot } from "../receipts/bridgeReceiptContract";
import { createBridgeAcknowledgementContractSnapshot } from "../acknowledgements/bridgeAcknowledgementContract";
import { createBridgeDiagnosticsContractSnapshot } from "../diagnostics/bridgeDiagnosticsContract";
import { createBridgeRecoveryContractSnapshot } from "../recovery/bridgeRecoveryContract";

import { createBridgeRuntimeSafetyReport } from "../runtime/bridgeRuntimeSafetyReport";

import type { BridgeFeatureGateName } from "../runtime/bridgeFeatureGateTypes";

import type {
  BridgeContractRegistryEntry,
  BridgeContractRegistryName,
  BridgeContractRegistrySnapshot,
  BridgeContractRegistrySnapshotValue,
} from "./bridgeContractRegistryTypes";

interface BridgeContractRegistrySource {
  readonly name: BridgeContractRegistryName;

  readonly requiredGate: BridgeFeatureGateName;

  readonly createSnapshot: () => BridgeContractRegistrySnapshotValue;
}

const BRIDGE_CONTRACT_REGISTRY_SOURCES: readonly BridgeContractRegistrySource[] = [
  {
    name: "discovery",
    requiredGate: "discovery",
    createSnapshot: createBridgeDiscoveryContractSnapshot,
  },
  {
    name: "qrPairing",
    requiredGate: "qrPairing",
    createSnapshot: createBridgeQrPairingContractSnapshot,
  },
  {
    name: "trustedDeviceRegistry",
    requiredGate: "trustedDeviceRegistry",
    createSnapshot: createBridgeTrustedDeviceRegistryContractSnapshot,
  },
  {
    name: "transport",
    requiredGate: "transport",
    createSnapshot: createBridgeTransportContractSnapshot,
  },
  {
    name: "outboundQueue",
    requiredGate: "outboundQueue",
    createSnapshot: createBridgeOutboundQueueContractSnapshot,
  },
  {
    name: "inboundInbox",
    requiredGate: "inboundInbox",
    createSnapshot: createBridgeInboundInboxContractSnapshot,
  },
  {
    name: "receipts",
    requiredGate: "receipts",
    createSnapshot: createBridgeReceiptContractSnapshot,
  },
  {
    name: "acknowledgements",
    requiredGate: "acknowledgements",
    createSnapshot: createBridgeAcknowledgementContractSnapshot,
  },
  {
    name: "diagnostics",
    requiredGate: "diagnostics",
    createSnapshot: createBridgeDiagnosticsContractSnapshot,
  },
  {
    name: "recovery",
    requiredGate: "recovery",
    createSnapshot: createBridgeRecoveryContractSnapshot,
  },
];

function createDisabledRegistryEntry(
  source: BridgeContractRegistrySource
): BridgeContractRegistryEntry {

  const snapshot = source.createSnapshot();

  if (
    snapshot.enabled !== false ||
    snapshot.executionAllowed !== false
  ) {
    throw new Error(
      `Bridge contract registry detected an active contract: ${source.name}`
    );
  }

  return {
    name: source.name,
    requiredGate: source.requiredGate,
    phase: snapshot.phase,
    enabled: false,
    executionAllowed: false,
    operationalCapabilityActive: false,
    snapshot,
    reason: `Bridge contract "${source.name}" remains disabled in Phase 32 C1.`,
  };
}

export function createBridgeContractRegistrySnapshot(): BridgeContractRegistrySnapshot {

  const safetyReport = createBridgeRuntimeSafetyReport();

  if (safetyReport.safeToRunOperationalBridge !== false) {
    throw new Error(
      "Bridge contract registry attempted to become operational."
    );
  }

  const contracts = BRIDGE_CONTRACT_REGISTRY_SOURCES.map(
    createDisabledRegistryEntry
  );

  if (contracts.length !== 10) {
    throw new Error(
      "Bridge contract registry expected exactly ten disabled contract snapshots."
    );
  }

  const activeContracts = contracts.filter(
    (contract) =>
      contract.enabled !== false ||
      contract.executionAllowed !== false ||
      contract.operationalCapabilityActive !== false
  );

  if (activeContracts.length > 0) {
    throw new Error(
      "Bridge contract registry detected an unexpected active contract."
    );
  }

  return {
    phase: "32.C1",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    enabled: false,
    executionAllowed: false,
    registryActive: false,
    allContractsDisabled: true,
    activeContracts: 0,
    operationalCapabilityActive: false,
    safeToRunOperationalBridge: false,
    contracts,
    reason:
      "Bridge contract registry snapshot is read-only in Phase 32 C1. It aggregates disabled contract shapes only and performs no bridge execution.",
  };
}
