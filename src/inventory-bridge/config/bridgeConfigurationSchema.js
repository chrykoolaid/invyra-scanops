import { SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS } from './bridgeConfigurationDefaults.js';

export const SCANOPS_BRIDGE_CONFIGURATION_SCHEMA = Object.freeze({
  booleanFields: Object.freeze([
    'bridge_enabled',
    'transport_enabled',
    'outbox_processing_enabled',
    'replay_enabled',
  ]),
  listFields: Object.freeze([
    'accepted_schema_versions',
    'accepted_event_types',
    'allowed_store_ids',
  ]),
  nullableFields: Object.freeze([
    'local_device_id',
    'target_inventory_instance_id',
  ]),
  defaults: SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS,
});
