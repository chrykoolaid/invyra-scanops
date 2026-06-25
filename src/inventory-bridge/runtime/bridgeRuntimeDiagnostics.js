import { getScanOpsBridgeRuntimeStatus } from './bridgeRuntimeStatusReporter.js';

export const SCANOPS_BRIDGE_DIAGNOSTIC_SCOPE = 'scanops_bridge_phase_4_runtime_diagnostics';

function diagnosticCheck(name, passed, detail) {
  return Object.freeze({ name, passed: passed === true, detail });
}

export function getScanOpsBridgeRuntimeDiagnostics(options = {}) {
  const runtimeStatus = getScanOpsBridgeRuntimeStatus({
    configuration: options.configuration,
    requested_action: options.requested_action || 'diagnostics',
  });

  const checks = Object.freeze([
    diagnosticCheck('runtime_disabled', runtimeStatus.enabled === false, 'Runtime enabled flag must remain false.'),
    diagnosticCheck('runtime_not_ready', runtimeStatus.ready === false, 'Runtime ready flag must remain false.'),
    diagnosticCheck('runtime_non_operational', runtimeStatus.operational === false, 'Runtime operational flag must remain false.'),
    diagnosticCheck('capture_only_preserved', runtimeStatus.capture_only === true, 'ScanOps remains capture-only.'),
    diagnosticCheck('network_unavailable', runtimeStatus.capabilities.network === false, 'No network capability is exposed.'),
    diagnosticCheck('transport_unavailable', runtimeStatus.capabilities.transport === false, 'No transport capability is exposed.'),
    diagnosticCheck('inventory_calls_unavailable', runtimeStatus.capabilities.inventory_calls === false, 'No Inventory call capability is exposed.'),
    diagnosticCheck('outbox_processing_unavailable', runtimeStatus.capabilities.outbox_processing === false, 'No outbox processing capability is exposed.'),
    diagnosticCheck('replay_unavailable', runtimeStatus.capabilities.replay === false, 'No replay capability is exposed.'),
    diagnosticCheck('writes_unavailable', runtimeStatus.capabilities.writes === false, 'No write capability is exposed.'),
    diagnosticCheck('mutation_unavailable', runtimeStatus.capabilities.mutation === false, 'No mutation capability is exposed.'),
    diagnosticCheck('configuration_read_only', runtimeStatus.configuration_snapshot?.writable === false, 'Runtime configuration adapter is read-only.'),
  ]);

  return Object.freeze({
    scope: SCANOPS_BRIDGE_DIAGNOSTIC_SCOPE,
    passed: checks.every((check) => check.passed),
    runtime_status: runtimeStatus,
    checks,
  });
}
