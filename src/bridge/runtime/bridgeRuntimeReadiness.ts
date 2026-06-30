// Phase 32-A1: readiness always reports inactive communication, persistence, and mutation.
import type {
  BridgeRuntimeEnvironment,
  BridgeRuntimeGuardrailStatus,
  BridgeRuntimeLifecycleState,
  BridgeRuntimeReadiness,
} from "./bridgeRuntimeTypes";

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
}: {
  environment: BridgeRuntimeEnvironment;
  lifecycleState: BridgeRuntimeLifecycleState;
  reason: string;
}): BridgeRuntimeReadiness => ({
  ready: lifecycleState === "READY_TEST_IDLE",
  environment,
  lifecycleState,
  reason,
  communicationActive: false,
  persistenceActive: false,
  mutationActive: false,
  guardrails: createBridgeRuntimeGuardrailStatus(),
});

export const buildFaultedBridgeRuntimeReadiness = ({
  environment,
  reason,
}: {
  environment: BridgeRuntimeEnvironment;
  reason: string;
}): BridgeRuntimeReadiness =>
  buildBridgeRuntimeReadiness({
    environment,
    lifecycleState: "FAULTED",
    reason,
  });
