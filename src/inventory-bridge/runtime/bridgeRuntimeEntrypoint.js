import { getScanOpsBridgeRuntimeDiagnostics } from './bridgeRuntimeDiagnostics.js';
import { createScanOpsBridgeLifecycleController } from './bridgeRuntimeLifecycleController.js';
import { getScanOpsBridgeRuntimeStatus } from './bridgeRuntimeStatusReporter.js';

export function createScanOpsBridgeRuntime(options = {}) {
  const lifecycleController = createScanOpsBridgeLifecycleController(options);

  return Object.freeze({
    component: 'scanops_bridge_runtime_foundation',
    phase: '4',
    milestone: '4A-4D',
    enabled: false,
    operational: false,
    capture_only: true,
    lifecycle: lifecycleController,
    start: () => startScanOpsBridgeRuntime(options),
    stop: () => stopScanOpsBridgeRuntime(options),
    requestStart: () => lifecycleController.requestStart(),
    requestStop: () => lifecycleController.requestStop(),
    getStatus: () => getScanOpsBridgeRuntimeStatus({
      configuration: options.configuration,
      requested_action: 'status',
    }),
    getDiagnostics: () => getScanOpsBridgeRuntimeDiagnostics({
      configuration: options.configuration,
      requested_action: 'diagnostics',
    }),
  });
}

export function startScanOpsBridgeRuntime(options = {}) {
  return getScanOpsBridgeRuntimeStatus({
    configuration: options.configuration,
    requested_action: 'start',
    lifecycle_state: 'STOPPED_DISABLED',
  });
}

export function stopScanOpsBridgeRuntime(options = {}) {
  return getScanOpsBridgeRuntimeStatus({
    configuration: options.configuration,
    requested_action: 'stop',
    lifecycle_state: 'STOPPED_DISABLED',
  });
}
