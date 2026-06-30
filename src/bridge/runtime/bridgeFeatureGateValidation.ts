import {
  BRIDGE_FEATURE_GATE_NAMES,
  BridgeFeatureGateRegistry,
} from "./bridgeFeatureGateTypes";

export function validateBridgeFeatureGateRegistry(
  registry: BridgeFeatureGateRegistry
): void {

  for (const gateName of BRIDGE_FEATURE_GATE_NAMES) {
    const gate = registry[gateName];

    if (!gate) {
      throw new Error(
        `Bridge feature gate "${gateName}" must be registered.`
      );
    }

    if (gate.name !== gateName) {
      throw new Error(
        `Bridge feature gate "${gateName}" has mismatched identity.`
      );
    }

    if (gate.enabled !== false) {
      throw new Error(
        `Bridge feature gate "${gateName}" must remain disabled.`
      );
    }

    if (gate.operationalCapability !== false) {
      throw new Error(
        `Bridge feature gate "${gateName}" must not expose operational capability.`
      );
    }
  }
}
