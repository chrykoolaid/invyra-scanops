import { getScanOpsBridgeRuntimeConfigurationSnapshot } from './bridgeRuntimeConfigurationAdapter.js';

export const SCANOPS_BRIDGE_RUNTIME_PHASE = '4';
export const SCANOPS_BRIDGE_RUNTIME_MILESTONE = '4A-4D';
export const SCANOPS_BRIDGE_RUNTIME_COMPONENT = 'scanops_bridge_runtime_foundation';
export const SCANOPS_BRIDGE_RUNTIME_STATE = 'DISABLED';
export const SCANOPS_BRIDGE_RUNTIME_DISABLED_REASON = 'scanops_bridge_phase_4_runtime_foundation_disabled';

export const SCANOPS_BRIDGE_RUNTIME_CAPABILITIES = Object.freeze({
  capture_only: true,
  network: false,
  transport: false,
  inventory_calls: false,
  outbox_processing: false,
  replay: false,
  writes: false,
  mutation: false,
});

export function getScanOpsBridgeRuntimeStatus(options = {}) {
  const configurationSnapshot = getScanOpsBridgeRuntimeConfigurationSnapshot(options.configuration);

  return Object.freeze({
    component: SCANOPS_BRIDGE_RUNTIME_COMPONENT,
    phase: SCANOPS_BRIDGE_RUNTIME_PHASE,
    milestone: SCANOPS_BRIDGE_RUNTIME_MILESTONE,
    state: SCANOPS_BRIDGE_RUNTIME_STATE,
    enabled: false,
    ready: false,
    operational: false,
    capture_only: true,
    reason: SCANOPS_BRIDGE_RUNTIME_DISABLED_REASON,
    requested_action: options.requested_action || null,
    lifecycle_state: options.lifecycle_state || 'STOPPED_DISABLED',
    configuration_snapshot: configurationSnapshot,
    configuration_status: configurationSnapshot.configuration_status,
    capabilities: SCANOPS_BRIDGE_RUNTIME_CAPABILITIES,
  });
}
