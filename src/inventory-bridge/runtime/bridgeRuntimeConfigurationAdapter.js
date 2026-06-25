import { SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS } from '../config/bridgeConfigurationDefaults.js';
import { SCANOPS_BRIDGE_CONFIGURATION_SCHEMA } from '../config/bridgeConfigurationSchema.js';
import { getScanOpsBridgeConfigurationStatus } from '../config/bridgeConfigurationStatus.js';

export const SCANOPS_BRIDGE_CONFIGURATION_ADAPTER_MODE = 'READ_ONLY';
export const SCANOPS_BRIDGE_CONFIGURATION_ADAPTER_REASON = 'scanops_bridge_phase_4_configuration_adapter_read_only';

function freezeList(value) {
  return Object.freeze(Array.isArray(value) ? [...value] : []);
}

export function getScanOpsBridgeRuntimeConfigurationSnapshot(config = SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS) {
  const requestedConfig = config || SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS;

  return Object.freeze({
    mode: SCANOPS_BRIDGE_CONFIGURATION_ADAPTER_MODE,
    writable: false,
    reason: SCANOPS_BRIDGE_CONFIGURATION_ADAPTER_REASON,
    schema_fields: Object.freeze({
      boolean_fields: SCANOPS_BRIDGE_CONFIGURATION_SCHEMA.booleanFields,
      list_fields: SCANOPS_BRIDGE_CONFIGURATION_SCHEMA.listFields,
      nullable_fields: SCANOPS_BRIDGE_CONFIGURATION_SCHEMA.nullableFields,
    }),
    requested_flags: Object.freeze({
      bridge_enabled: requestedConfig.bridge_enabled === true,
      transport_enabled: requestedConfig.transport_enabled === true,
      outbox_processing_enabled: requestedConfig.outbox_processing_enabled === true,
      replay_enabled: requestedConfig.replay_enabled === true,
    }),
    requested_lists: Object.freeze({
      accepted_schema_versions: freezeList(requestedConfig.accepted_schema_versions),
      accepted_event_types: freezeList(requestedConfig.accepted_event_types),
      allowed_store_ids: freezeList(requestedConfig.allowed_store_ids),
    }),
    local_device_id: requestedConfig.local_device_id ?? null,
    target_inventory_instance_id: requestedConfig.target_inventory_instance_id ?? null,
    configuration_status: getScanOpsBridgeConfigurationStatus(requestedConfig),
  });
}
