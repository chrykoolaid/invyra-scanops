export const SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS = Object.freeze({
  bridge_enabled: false,
  transport_enabled: false,
  outbox_processing_enabled: false,
  replay_enabled: false,
  local_device_id: null,
  target_inventory_instance_id: null,
  accepted_schema_versions: [],
  accepted_event_types: [],
  allowed_store_ids: [],
});

export const SCANOPS_BRIDGE_DISABLED_REASON = 'scanops_bridge_configuration_defaults_disabled';
