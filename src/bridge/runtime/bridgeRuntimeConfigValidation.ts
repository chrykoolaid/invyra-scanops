import {
  BridgeRuntimeConfig,
} from "./bridgeRuntimeConfigTypes";

export function validateBridgeRuntimeConfig(
  config: BridgeRuntimeConfig
): void {

  if (config.environment !== "TEST") {
    throw new Error(
      "Phase 32 A2 only permits TEST environment."
    );
  }

  if (config.allowNetwork) {
    throw new Error("Network must remain disabled.");
  }

  if (config.allowDiscovery) {
    throw new Error("Discovery must remain disabled.");
  }

  if (config.allowPairing) {
    throw new Error("Pairing must remain disabled.");
  }

  if (config.allowTransport) {
    throw new Error("Transport must remain disabled.");
  }

  if (config.allowPersistence) {
    throw new Error("Persistence must remain disabled.");
  }

  if (config.allowMutation) {
    throw new Error("Mutation must remain disabled.");
  }
}