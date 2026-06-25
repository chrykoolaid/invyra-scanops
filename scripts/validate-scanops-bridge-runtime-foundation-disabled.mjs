import { SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS } from '../src/inventory-bridge/config/bridgeConfigurationDefaults.js';
import {
  createScanOpsBridgeLifecycleController,
  createScanOpsBridgeRuntime,
  getScanOpsBridgeRuntimeConfigurationSnapshot,
  getScanOpsBridgeRuntimeDiagnostics,
  getScanOpsBridgeRuntimeStatus,
  requestScanOpsBridgeRuntimeStart,
  requestScanOpsBridgeRuntimeStop,
  startScanOpsBridgeRuntime,
  stopScanOpsBridgeRuntime,
} from '../src/inventory-bridge/runtime/index.js';

const errors = [];
const prohibitedCapabilities = [
  'network',
  'transport',
  'inventory_calls',
  'outbox_processing',
  'replay',
  'writes',
  'mutation',
];

function assertDisabledRuntimeStatus(label, status) {
  if (status?.enabled !== false) {
    errors.push(`${label} must remain enabled=false`);
  }

  if (status?.ready !== false) {
    errors.push(`${label} must remain ready=false`);
  }

  if (status?.operational !== false) {
    errors.push(`${label} must remain operational=false`);
  }

  if (status?.state !== 'DISABLED') {
    errors.push(`${label} must report DISABLED state`);
  }

  if (status?.capture_only !== true) {
    errors.push(`${label} must preserve capture_only=true`);
  }

  for (const capability of prohibitedCapabilities) {
    if (status?.capabilities?.[capability] !== false) {
      errors.push(`${label} must not expose ${capability}`);
    }
  }

  if (status?.configuration_snapshot?.writable !== false) {
    errors.push(`${label} must expose read-only configuration snapshot`);
  }
}

function assertDisabledLifecycleResult(label, result) {
  if (result?.accepted !== false) {
    errors.push(`${label} must reject lifecycle action`);
  }

  if (result?.enabled !== false || result?.operational !== false) {
    errors.push(`${label} must remain disabled and non-operational`);
  }

  if (result?.capture_only !== true) {
    errors.push(`${label} must preserve capture_only=true`);
  }

  if (result?.state !== 'STOPPED_DISABLED') {
    errors.push(`${label} must remain STOPPED_DISABLED`);
  }

  assertDisabledRuntimeStatus(`${label} runtime_status`, result?.runtime_status);
}

const runtime = createScanOpsBridgeRuntime();
const lifecycleController = createScanOpsBridgeLifecycleController();

if (runtime.enabled !== false || runtime.operational !== false) {
  errors.push('runtime factory must return disabled non-operational runtime');
}

if (runtime.capture_only !== true) {
  errors.push('runtime factory must preserve capture_only=true');
}

for (const method of ['start', 'stop', 'requestStart', 'requestStop', 'getStatus', 'getDiagnostics']) {
  if (typeof runtime[method] !== 'function') {
    errors.push(`runtime factory must expose ${method}`);
  }
}

for (const method of ['requestStart', 'requestStop', 'getState']) {
  if (typeof lifecycleController[method] !== 'function') {
    errors.push(`lifecycle controller must expose ${method}`);
  }
}

assertDisabledRuntimeStatus('status reporter', getScanOpsBridgeRuntimeStatus());
assertDisabledRuntimeStatus('runtime getStatus', runtime.getStatus());
assertDisabledRuntimeStatus('runtime start', runtime.start());
assertDisabledRuntimeStatus('runtime stop', runtime.stop());
assertDisabledLifecycleResult('runtime requestStart', runtime.requestStart());
assertDisabledLifecycleResult('runtime requestStop', runtime.requestStop());
assertDisabledRuntimeStatus('direct start entrypoint', startScanOpsBridgeRuntime());
assertDisabledRuntimeStatus('direct stop entrypoint', stopScanOpsBridgeRuntime());
assertDisabledLifecycleResult('lifecycle requestStart', lifecycleController.requestStart());
assertDisabledLifecycleResult('lifecycle requestStop', lifecycleController.requestStop());
assertDisabledLifecycleResult('lifecycle getState', lifecycleController.getState());
assertDisabledLifecycleResult('request start helper', requestScanOpsBridgeRuntimeStart());
assertDisabledLifecycleResult('request stop helper', requestScanOpsBridgeRuntimeStop());

const diagnostics = getScanOpsBridgeRuntimeDiagnostics();

if (diagnostics.passed !== true) {
  errors.push('runtime diagnostics must pass disabled guardrail checks');
}

if (!Array.isArray(diagnostics.checks) || diagnostics.checks.length === 0) {
  errors.push('runtime diagnostics must expose guardrail checks');
}

const unsafeConfigAttempt = {
  ...SCANOPS_BRIDGE_CONFIGURATION_DEFAULTS,
  bridge_enabled: true,
  transport_enabled: true,
  outbox_processing_enabled: true,
  replay_enabled: true,
  local_device_id: 'attempted-device',
  target_inventory_instance_id: 'attempted-inventory',
  accepted_schema_versions: ['attempted-runtime-activation'],
  accepted_event_types: ['attempted-event'],
  allowed_store_ids: ['attempted-store'],
};

const unsafeSnapshot = getScanOpsBridgeRuntimeConfigurationSnapshot(unsafeConfigAttempt);
assertDisabledRuntimeStatus(
  'status reporter with attempted enabled configuration',
  getScanOpsBridgeRuntimeStatus({ configuration: unsafeConfigAttempt })
);
assertDisabledRuntimeStatus(
  'start with attempted enabled configuration',
  startScanOpsBridgeRuntime({ configuration: unsafeConfigAttempt })
);

if (unsafeSnapshot.writable !== false) {
  errors.push('configuration adapter must remain read-only with attempted enabled configuration');
}

if (unsafeSnapshot.requested_flags.bridge_enabled !== true) {
  errors.push('configuration adapter should report attempted requested flags without activating runtime');
}

if (unsafeConfigAttempt.bridge_enabled !== true) {
  errors.push('configuration adapter must not mutate caller-provided config');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('ScanOps bridge Phase 4 runtime foundation remains disabled, capture-only, and non-operational.');
