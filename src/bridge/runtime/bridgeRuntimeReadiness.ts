// Phase 32-A4: readiness always reports inactive communication, persistence, mutation, and operational capability.
import type {
  BridgeRuntimeEnvironment,
  BridgeRuntimeGuardrailStatus,
  BridgeRuntimeLifecycleState,
  BridgeRuntimeReadiness,
} from "./bridgeRuntimeTypes";

import type {
  BridgeFeatureGateRegistry,
} from "./bridgeFeatureGateTypes";

import type {
  BridgeRuntimeConfig,
} from "./bridgeRuntimeConfigTypes";

export const createBridgeRuntimeGuardrailStatus = (): BridgeRuntimeGuardrailStatus => ({
  liveActivationBlocked: true,
  productionActivationBlocked: true,
  networkSocketsBlocked: true,
  discoveryBlocked: true,
  pairingBlocked: true,
  qrProcessingBlocked: true,
  queueProcessingBlocked: true,
  inboxProcessingBlocked: true,
  envelopeCreationBlocked: true,
  envelopeTransmissionBlocked: true,
  envelopeReceptionBlocked: true,
  inventoryMutationBlocked: true,
  scanOpsMutationBlocked: true,
  stockMutationBlocked: true,
  pricingMutationBlocked: true,
  itemMasterMutationBlocked: true,
  businessLogicBlocked: true,
});

export const buildBridgeRuntimeReadiness = ({
  environment,
  lifecycleState,
  reason,
  runtimeConfig,
  featureGates,
}: {
  environment: BridgeRuntimeEnvironment;
  lifecycleState: BridgeRuntimeLifecycleState;
  reason: string;
  runtimeConfig: BridgeRuntimeConfig;
  featureGates: BridgeFeatureGateRegistry;
}): BridgeRuntimeReadiness => ({
  ready: lifecycleState === "READY_TEST_IDLE",
  environment,
  lifecycleState,
  reason,
  communicationActive: false,
  persistenceActive: false,
  mutationActive: false,
  operationalCapabilityActive: false,
  runtimeConfig,
  featureGates,
  guardrails: createBridgeRuntimeGuardrailStatus(),
});

export const buildFaultedBridgeRuntimeReadiness = ({
  environment,
  reason,
  runtimeConfig,
  featureGates,
}: {
  environment: BridgeRuntimeEnvironment;
  reason: string;
  runtimeConfig: BridgeRuntimeConfig;
  featureGates: BridgeFeatureGateRegistry;
}): BridgeRuntimeReadiness =>
  buildBridgeRuntimeReadiness({
    environment,
    lifecycleState: "FAULTED",
    reason,
    runtimeConfig,
    featureGates,
  });
