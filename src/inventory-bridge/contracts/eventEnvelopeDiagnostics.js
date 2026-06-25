import {
  SCANOPS_BRIDGE_CONTRACT_ADAPTER_COMPONENT,
  SCANOPS_BRIDGE_CONTRACT_ADAPTER_PHASE,
  SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS,
  assessScanOpsBridgeEventEnvelopeContract,
} from './eventEnvelopeContract.js';

function diagnosticCheck(name, passed, detail) {
  return Object.freeze({ name, passed: passed === true, detail });
}

export function getScanOpsBridgeEventEnvelopeContractDiagnostics(candidate = {}, options = {}) {
  const assessment = assessScanOpsBridgeEventEnvelopeContract(candidate, options);

  const checks = Object.freeze([
    diagnosticCheck('contract_adapter_component', assessment.component === SCANOPS_BRIDGE_CONTRACT_ADAPTER_COMPONENT, 'Contract adapter component marker is present.'),
    diagnosticCheck('contract_adapter_phase', assessment.phase === SCANOPS_BRIDGE_CONTRACT_ADAPTER_PHASE, 'Contract adapter phase marker is present.'),
    diagnosticCheck('never_accepted', assessment.accepted === false, 'Phase 5A adapter never accepts runtime dispatch.'),
    diagnosticCheck('never_dispatchable', assessment.dispatchable === false, 'Phase 5A adapter never returns dispatchable candidates.'),
    diagnosticCheck('never_transportable', assessment.transportable === false, 'Phase 5A adapter never returns transportable candidates.'),
    diagnosticCheck('never_outbox_processable', assessment.outbox_processable === false, 'Phase 5A adapter never returns outbox-processable candidates.'),
    diagnosticCheck('never_writable', assessment.writable === false, 'Phase 5A adapter never returns writable candidates.'),
    diagnosticCheck('never_inventory_callable', assessment.inventory_callable === false, 'Phase 5A adapter never returns Inventory-callable candidates.'),
    diagnosticCheck('capture_only_preserved', assessment.capture_only === true, 'ScanOps remains capture-only.'),
    diagnosticCheck('runtime_disabled', assessment.runtime_status.enabled === false, 'Runtime remains disabled.'),
    diagnosticCheck('runtime_not_ready', assessment.runtime_status.ready === false, 'Runtime remains not ready.'),
    diagnosticCheck('runtime_non_operational', assessment.runtime_status.operational === false, 'Runtime remains non-operational.'),
    diagnosticCheck('known_classification', Object.values(SCANOPS_BRIDGE_EVENT_ENVELOPE_CLASSIFICATIONS).includes(assessment.classification), 'Assessment returns a known read-only classification.'),
  ]);

  return Object.freeze({
    component: 'scanops_bridge_contract_diagnostics',
    phase: SCANOPS_BRIDGE_CONTRACT_ADAPTER_PHASE,
    passed: checks.every((check) => check.passed),
    assessment,
    checks,
  });
}
