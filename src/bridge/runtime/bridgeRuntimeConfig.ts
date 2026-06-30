import {
  BridgeRuntimeConfig,
  DEFAULT_RUNTIME_CONFIG,
} from "./bridgeRuntimeConfigTypes";

import {
  validateBridgeRuntimeConfig,
} from "./bridgeRuntimeConfigValidation";

export function createBridgeRuntimeConfig(): BridgeRuntimeConfig {

  const config: BridgeRuntimeConfig = {
    ...DEFAULT_RUNTIME_CONFIG,
  };

  validateBridgeRuntimeConfig(config);

  return config;
}