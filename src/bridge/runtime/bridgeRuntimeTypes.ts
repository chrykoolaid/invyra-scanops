export const BRIDGE_RUNTIME_VERSION = "32.A1.0";

export const BRIDGE_ALLOWED_ENVIRONMENTS = ["TEST"] as const;

export const BRIDGE_BLOCKED_ENVIRONMENTS = [
  "LIVE",
  "PRODUCTION",
  "STAGING",
  "TRAINING",
  "DEVELOPMENT",
] as const;

export type BridgeRuntimeEnvironment =
  | (typeof BRIDGE_ALLOWED_ENVIRONMENTS)[number]
  | (typeof BRIDGE_BLOCKED_ENVIRONMENTS)[number]
  | string;

export type BridgeRuntimeLifecycleState =
  | "UNINITIALIZED"
  | "INITIALIZING"
  | "READY_TEST_IDLE"
  | "STOPPING"
  | "STOPPED"
  | "FAULTED";

export type BridgeRuntimeGuardrailKey =
  | "liveActivationBlocked"
  | "productionActivationBlocked"
  | "networkSocketsBlocked"
  | "discoveryBlocked"
  | "pairingBlocked"
  | "qrProcessingBlocked"
  | "queueProcessingBlocked"
  | "inboxProcessingBlocked"
  | "envelopeCreationBlocked"
  | "envelopeTransmissionBlocked"
  | "envelopeReceptionBlocked"
  | "inventoryMutationBlocked"
  | "scanOpsMutationBlocked"
  | "stockMutationBlocked"
  | "pricingMutationBlocked"
  | "itemMasterMutationBlocked"
  | "businessLogicBlocked";

export type BridgeRuntimeGuardrailStatus = Record<BridgeRuntimeGuardrailKey, true>;

export interface BridgeRuntimeIdentity {
  runtimeName: "scanops-inventory-bridge";
  runtimeVersion: typeof BRIDGE_RUNTIME_VERSION;
  systemOfRecord: "Inventory Desktop";
  operationalLayer: "ScanOps";
  phase: "32-A1";
}

export interface BridgeRuntimeReadiness {
  ready: boolean;
  environment: BridgeRuntimeEnvironment;
  lifecycleState: BridgeRuntimeLifecycleState;
  reason: string;
  communicationActive: false;
  persistenceActive: false;
  mutationActive: false;
  guardrails: BridgeRuntimeGuardrailStatus;
}

export interface BridgeRuntimeSnapshot {
  identity: BridgeRuntimeIdentity;
  environment: BridgeRuntimeEnvironment;
  lifecycleState: BridgeRuntimeLifecycleState;
  readiness: BridgeRuntimeReadiness;
}

export interface BridgeRuntimeOptions {
  environment: BridgeRuntimeEnvironment;
}
