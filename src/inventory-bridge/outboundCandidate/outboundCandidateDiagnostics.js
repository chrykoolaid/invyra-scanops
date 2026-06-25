import {
  SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_COMPONENT,
  SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_PHASE,
  buildScanOpsBridgeOutboundCandidatePreview,
} from './outboundCandidatePreview.js';

function diagnosticCheck(name, passed, detail) {
  return Object.freeze({ name, passed: passed === true, detail });
}

export function getScanOpsBridgeOutboundCandidatePreviewDiagnostics(candidate = {}, options = {}) {
  const preview = buildScanOpsBridgeOutboundCandidatePreview(candidate, options);

  const checks = Object.freeze([
    diagnosticCheck('outbound_candidate_component', preview.component === SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_COMPONENT, 'Outbound candidate preview component marker is present.'),
    diagnosticCheck('outbound_candidate_phase', preview.phase === SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_PHASE, 'Outbound candidate preview phase marker is present.'),
    diagnosticCheck('runtime_disabled', preview.runtime_enabled === false, 'Runtime remains disabled.'),
    diagnosticCheck('runtime_not_ready', preview.runtime_ready === false, 'Runtime remains not ready.'),
    diagnosticCheck('runtime_non_operational', preview.runtime_operational === false, 'Runtime remains non-operational.'),
    diagnosticCheck('contract_not_accepted', preview.contract_accepted === false, 'Contract remains non-accepted for runtime use.'),
    diagnosticCheck('contract_non_dispatchable', preview.contract_dispatchable === false, 'Contract remains non-dispatchable.'),
    diagnosticCheck('contract_non_transportable', preview.contract_transportable === false, 'Contract remains non-transportable.'),
    diagnosticCheck('contract_non_outbox_processable', preview.contract_outbox_processable === false, 'Contract remains non-outbox-processable.'),
    diagnosticCheck('contract_non_inventory_callable', preview.contract_inventory_callable === false, 'Contract remains non-Inventory-callable.'),
    diagnosticCheck('contract_non_writable', preview.contract_writable === false, 'Contract remains non-writable.'),
    diagnosticCheck('capture_only_preserved', preview.capture_only === true, 'Capture-only posture remains preserved.'),
    diagnosticCheck('preview_non_dispatchable', preview.dispatchable === false, 'Outbound candidate preview never returns dispatchable=true.'),
    diagnosticCheck('preview_non_transportable', preview.transportable === false, 'Outbound candidate preview never returns transportable=true.'),
    diagnosticCheck('preview_non_outbox_processable', preview.outbox_processable === false, 'Outbound candidate preview never returns outbox_processable=true.'),
    diagnosticCheck('preview_non_inventory_callable', preview.inventory_callable === false, 'Outbound candidate preview never returns inventory_callable=true.'),
    diagnosticCheck('preview_non_persistable', preview.persistable === false, 'Outbound candidate preview never returns persistable=true.'),
    diagnosticCheck('preview_non_writable', preview.writable === false, 'Outbound candidate preview never returns writable=true.'),
    diagnosticCheck('preview_non_replayable', preview.replayable === false, 'Outbound candidate preview never returns replayable=true.'),
    diagnosticCheck('no_acknowledgement', preview.acknowledgement_emittable === false, 'Outbound candidate preview never emits acknowledgements.'),
    diagnosticCheck('no_receipt', preview.receipt_emittable === false, 'Outbound candidate preview never emits receipts.'),
    diagnosticCheck('no_mutation', preview.mutating === false, 'Outbound candidate preview never mutates ScanOps state.'),
  ]);

  return Object.freeze({
    component: 'scanops_bridge_outbound_candidate_preview_diagnostics',
    phase: SCANOPS_BRIDGE_OUTBOUND_CANDIDATE_PHASE,
    passed: checks.every((check) => check.passed),
    preview,
    checks,
  });
}
