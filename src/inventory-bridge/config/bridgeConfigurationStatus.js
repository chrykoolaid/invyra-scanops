import { SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS } from './bridgeConfigurationDefaults.js';

export function getScanOpsBridgeConfigurationStatus(config = SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS) {
  const effectiveConfig = config || SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS;

  return Object.freeze({
    enabled: false,
    ready: false,
    reason: 'scanops_bridge_configuration_scaffold_disabled',
    bridge_enabled: effectiveConfig.bridge_enabled === true,
    transport_enabled: effectiveConfig.transport_enabled === true,
    outbox_processing_enabled: effectiveConfig.outbox_processing_enabled === true,
    replay_enabled: effectiveConfig.replay_enabled === true,
  });
}
