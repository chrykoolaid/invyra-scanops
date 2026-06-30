import {
  BridgeFeatureGateDefinition,
  BridgeFeatureGateName,
  BridgeFeatureGateRegistry,
  BRIDGE_FEATURE_GATE_NAMES,
} from "./bridgeFeatureGateTypes";

import {
  createBridgeFeatureGateRegistry,
} from "./bridgeFeatureGates";

import {
  validateBridgeFeatureGateRegistry,
} from "./bridgeFeatureGateValidation";

export interface BridgeFeatureGateAccessResult {
  gate: BridgeFeatureGateDefinition;

  enabled: false;

  operationalCapability: false;

  blocked: true;

  reason: string;
}

export function getBridgeFeatureGate(
  gateName: BridgeFeatureGateName,
  registry: BridgeFeatureGateRegistry = createBridgeFeatureGateRegistry()
): BridgeFeatureGateDefinition {

  validateBridgeFeatureGateRegistry(registry);

  return registry[gateName];
}

export function isBridgeFeatureGateEnabled(
  gateName: BridgeFeatureGateName,
  registry: BridgeFeatureGateRegistry = createBridgeFeatureGateRegistry()
): false {

  const gate = getBridgeFeatureGate(gateName, registry);

  if (gate.enabled !== false) {
    throw new Error(
      `Bridge feature gate "${gateName}" must remain disabled.`
    );
  }

  return false;
}

export function getBridgeFeatureGateAccessResult(
  gateName: BridgeFeatureGateName,
  registry: BridgeFeatureGateRegistry = createBridgeFeatureGateRegistry()
): BridgeFeatureGateAccessResult {

  const gate = getBridgeFeatureGate(gateName, registry);

  if (gate.operationalCapability !== false) {
    throw new Error(
      `Bridge feature gate "${gateName}" must not expose operational capability.`
    );
  }

  return {
    gate,
    enabled: false,
    operationalCapability: false,
    blocked: true,
    reason: `Bridge feature gate "${gateName}" is disabled in Phase 32 A6.`,
  };
}

export function getAllBridgeFeatureGateAccessResults(
  registry: BridgeFeatureGateRegistry = createBridgeFeatureGateRegistry()
): readonly BridgeFeatureGateAccessResult[] {

  validateBridgeFeatureGateRegistry(registry);

  return BRIDGE_FEATURE_GATE_NAMES.map((gateName) =>
    getBridgeFeatureGateAccessResult(gateName, registry)
  );
}
