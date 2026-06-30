import {
  createBridgeRuntime,
} from "./bridgeRuntime";

import {
  type BridgeRuntimeEnvironment,
  type BridgeRuntimeSnapshot,
} from "./bridgeRuntimeTypes";

import {
  evaluateAllBridgeRuntimeCapabilities,
  type BridgeRuntimeCapabilityDecision,
} from "./bridgeRuntimeCapabilityGuard";

export interface BridgeRuntimeSafetyReportTotals {
  totalCapabilities: number;

  allowedCapabilities: 0;

  blockedCapabilities: number;

  activeCommunicationCapabilities: 0;

  activePersistenceCapabilities: 0;

  activeMutationCapabilities: 0;

  activeOperationalCapabilities: 0;
}

export interface BridgeRuntimeSafetyReport {
  phase: "32.A8";

  systemOfRecord: "Inventory Desktop";

  operationalLayer: "ScanOps";

  environment: BridgeRuntimeEnvironment;

  runtimeSnapshot: BridgeRuntimeSnapshot;

  capabilityDecisions: readonly BridgeRuntimeCapabilityDecision[];

  totals: BridgeRuntimeSafetyReportTotals;

  communicationActive: false;

  persistenceActive: false;

  mutationActive: false;

  operationalCapabilityActive: false;

  safeToRunOperationalBridge: false;

  reason: string;
}

export function createBridgeRuntimeSafetyReport(
  environment: BridgeRuntimeEnvironment = "TEST"
): BridgeRuntimeSafetyReport {

  const runtime = createBridgeRuntime({ environment });
  const runtimeSnapshot = runtime.getSnapshot();
  const capabilityDecisions = evaluateAllBridgeRuntimeCapabilities(
    runtimeSnapshot.featureGates
  );

  const allowedCapabilities = capabilityDecisions.filter(
    (decision) => decision.allowed !== false
  );
  const activeCommunicationCapabilities = capabilityDecisions.filter(
    (decision) => decision.communicationActive !== false
  );
  const activePersistenceCapabilities = capabilityDecisions.filter(
    (decision) => decision.persistenceActive !== false
  );
  const activeMutationCapabilities = capabilityDecisions.filter(
    (decision) => decision.mutationActive !== false
  );
  const activeOperationalCapabilities = capabilityDecisions.filter(
    (decision) => decision.operationalCapabilityActive !== false
  );

  if (
    allowedCapabilities.length > 0 ||
    activeCommunicationCapabilities.length > 0 ||
    activePersistenceCapabilities.length > 0 ||
    activeMutationCapabilities.length > 0 ||
    activeOperationalCapabilities.length > 0
  ) {
    throw new Error(
      "Bridge runtime safety report detected unexpected operational capability."
    );
  }

  return {
    phase: "32.A8",
    systemOfRecord: "Inventory Desktop",
    operationalLayer: "ScanOps",
    environment,
    runtimeSnapshot,
    capabilityDecisions,
    totals: {
      totalCapabilities: capabilityDecisions.length,
      allowedCapabilities: 0,
      blockedCapabilities: capabilityDecisions.length,
      activeCommunicationCapabilities: 0,
      activePersistenceCapabilities: 0,
      activeMutationCapabilities: 0,
      activeOperationalCapabilities: 0,
    },
    communicationActive: false,
    persistenceActive: false,
    mutationActive: false,
    operationalCapabilityActive: false,
    safeToRunOperationalBridge: false,
    reason:
      "Bridge runtime safety report is read-only. All capabilities remain blocked in Phase 32 A8.",
  };
}
