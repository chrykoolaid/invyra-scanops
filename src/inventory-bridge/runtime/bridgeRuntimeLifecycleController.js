import { getScanOpsBridgeRuntimeStatus } from './bridgeRuntimeStatusReporter.js';

export const SCANOPS_BRIDGE_LIFECYCLE_STATE = 'STOPPED_DISABLED';
export const SCANOPS_BRIDGE_LIFECYCLE_REASON = 'scanops_bridge_phase_4_lifecycle_controller_disabled';

function disabledLifecycleResult(action, options = {}) {
  return Object.freeze({
    action,
    accepted: false,
    state: SCANOPS_BRIDGE_LIFECYCLE_STATE,
    enabled: false,
    operational: false,
    capture_only: true,
    reason: SCANOPS_BRIDGE_LIFECYCLE_REASON,
    runtime_status: getScanOpsBridgeRuntimeStatus({
      configuration: options.configuration,
      requested_action: action,
      lifecycle_state: SCANOPS_BRIDGE_LIFECYCLE_STATE,
    }),
  });
}

export function createScanOpsBridgeLifecycleController(options = {}) {
  return Object.freeze({
    component: 'scanops_bridge_lifecycle_controller',
    phase: '4',
    state: SCANOPS_BRIDGE_LIFECYCLE_STATE,
    enabled: false,
    operational: false,
    capture_only: true,
    requestStart: () => disabledLifecycleResult('start', options),
    requestStop: () => disabledLifecycleResult('stop', options),
    getState: () => disabledLifecycleResult('status', options),
  });
}

export function requestScanOpsBridgeRuntimeStart(options = {}) {
  return disabledLifecycleResult('start', options);
}

export function requestScanOpsBridgeRuntimeStop(options = {}) {
  return disabledLifecycleResult('stop', options);
}
