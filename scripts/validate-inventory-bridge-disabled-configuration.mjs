import { SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS } from '../src/inventory-bridge/config/bridgeConfigurationDefaults.js';
import { SCANOPS_BRIDGE_CONFIGURATION_SCHEMA } from '../src/inventory-bridge/config/bridgeConfigurationSchema.js';
import { getScanOpsBridgeConfigurationStatus } from '../src/inventory-bridge/config/bridgeConfigurationStatus.js';

const requiredFalseFlags = [
  'bridge_enabled',
  'transport_enabled',
  'outbox_processing_enabled',
  'replay_enabled',
];

const requiredEmptyLists = [
  'accepted_schema_versions',
  'accepted_event_types',
  'allowed_store_ids',
];

const errors = [];

for (const flag of requiredFalseFlags) {
  if (SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS[flag] !== false) {
    errors.push(`${flag} must default to false`);
  }
}

for (const field of requiredEmptyLists) {
  if (!Array.isArray(SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS[field])) {
    errors.push(`${field} must default to an array`);
  }

  if (SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS[field]?.length !== 0) {
    errors.push(`${field} must default to an empty array`);
  }
}

if (SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS.local_device_id !== null) {
  errors.push('local_device_id must default to null');
}

if (SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS.target_inventory_instance_id !== null) {
  errors.push('target_inventory_instance_id must default to null');
}

const status = getScanOpsBridgeConfigurationStatus();

if (status.enabled !== false || status.ready !== false) {
  errors.push('configuration status must remain disabled and not ready');
}

if (!SCANOPS_BRIDGE_CONFIGURATION_SCHEMA?.defaults) {
  errors.push('configuration schema must expose defaults');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge disabled configuration scaffold validated.');
