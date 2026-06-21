export const SCANOPS_STACK_EVIDENCE_ACCEPTANCE_PHASE = '1D-D-AK';
export const SCANOPS_STACK_EVIDENCE_SOURCE_PHASE = '1D-D-AJ';

export const SCANOPS_STACK_EVIDENCE_ACCEPTANCE_STATUS = Object.freeze({
  ACCEPTED_LOCKED: 'STACK_EVIDENCE_ACCEPTED_LOCKED_NON_OPERATIONAL',
  REJECTED: 'STACK_EVIDENCE_REJECTED',
});

export const SCANOPS_STACK_EVIDENCE_ACCEPTANCE_CODE = Object.freeze({
  ACCEPTED: 'SCANOPS_STACK_EVIDENCE_ACCEPTED',
  INVALID: 'STACK_EVIDENCE_INVALID',
  PHASE_MISMATCH: 'STACK_EVIDENCE_PHASE_MISMATCH',
  STATUS_MISMATCH: 'STACK_EVIDENCE_STATUS_MISMATCH',
  SCOPE_MISMATCH: 'STACK_EVIDENCE_SCOPE_MISMATCH',
  PHASE_LIST_MISSING: 'STACK_EVIDENCE_PHASE_LIST_MISSING',
  OPERATIONAL_ENABLED: 'STACK_EVIDENCE_OPERATIONAL_ENABLED',
  CAPABILITY_ENABLED: 'STACK_EVIDENCE_CAPABILITY_ENABLED',
});

export const SCANOPS_STACK_EVIDENCE_ACCEPTANCE_GUARDRAILS = Object.freeze({
  projection_only: true,
  local_validator_only: true,
  stack_evidence_acceptance_only: true,
  non_operational: true,
  no_operational_activation: true,
  no_relay_enforcement: true,
  no_relay_transport: true,
  no_event_transport: true,
  no_event_sync: true,
  no_event_ingestion: true,
  no_persistence_write: true,
  no_inventory_write: true,
  no_stock_price_pos_order_forecast_mutation: true,
});

function parseJsonMaybe(input) {
  if (!input) return null;
  if (typeof input === 'object' && !Array.isArray(input)) return input;
  if (typeof input !== 'string') return null;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeScope(input = {}) {
  const scope = parseJsonMaybe(input) || {};
  return {
    source_device_id: scope.source_device_id || scope.device_id || null,
    environment: scope.environment || null,
    store_id: scope.store_id || null,
    inventory_instance_id: scope.inventory_instance_id || null,
  };
}

function anyCapabilityEnabled(manifest = {}) {
  const names = [
    'relay_enforcement_allowed',
    'relay_transport_allowed',
    'event_transport_allowed',
    'event_sync_allowed',
    'event_ingestion_allowed',
    'inventory_mutation_allowed',
  ];
  return names.some((name) => manifest[name] === true);
}

export function validateScanOpsStackEvidenceAcceptance(input = {}, scopeInput = {}) {
  const manifest = parseJsonMaybe(input);
  const scope = normalizeScope(scopeInput);

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, code: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_CODE.INVALID, manifest: null, scope };
  }

  if (manifest.phase !== SCANOPS_STACK_EVIDENCE_SOURCE_PHASE) {
    return { ok: false, code: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_CODE.PHASE_MISMATCH, manifest, scope };
  }

  if (manifest.code !== 'INVENTORY_BRIDGE_STACK_EVIDENCE_PROJECTED' || manifest.status !== 'BRIDGE_STACK_EVIDENCE_PROJECTED_LOCKED_NON_OPERATIONAL' || manifest.bridge_gate_locked !== true) {
    return { ok: false, code: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_CODE.STATUS_MISMATCH, manifest, scope };
  }

  if (manifest.operationally_enabled !== false) {
    return { ok: false, code: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_CODE.OPERATIONAL_ENABLED, manifest, scope };
  }

  if (!Array.isArray(manifest.required_phases) || manifest.required_phases.length < 1 || manifest.required_phase_count !== manifest.required_phases.length) {
    return { ok: false, code: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_CODE.PHASE_LIST_MISSING, manifest, scope };
  }

  if (scope.source_device_id && manifest.source_device_id !== scope.source_device_id) return { ok: false, code: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_CODE.SCOPE_MISMATCH, manifest, scope };
  if (scope.environment && manifest.environment !== scope.environment) return { ok: false, code: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_CODE.SCOPE_MISMATCH, manifest, scope };
  if (scope.store_id && manifest.store_id !== scope.store_id) return { ok: false, code: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_CODE.SCOPE_MISMATCH, manifest, scope };
  if (scope.inventory_instance_id && manifest.inventory_instance_id !== scope.inventory_instance_id) return { ok: false, code: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_CODE.SCOPE_MISMATCH, manifest, scope };

  if (anyCapabilityEnabled(manifest)) {
    return { ok: false, code: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_CODE.CAPABILITY_ENABLED, manifest, scope };
  }

  return { ok: true, code: 'STACK_EVIDENCE_ACCEPTANCE_VALID', manifest, scope };
}

export function acceptScanOpsStackEvidence(input = {}, scopeInput = {}, options = {}) {
  const validation = validateScanOpsStackEvidenceAcceptance(input, scopeInput);
  const acceptedAt = options.accepted_at || nowIso();

  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      validation,
      local_state: {
        status: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_STATUS.REJECTED,
        operationally_enabled: false,
        capabilities_enabled: false,
      },
      guardrails: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_GUARDRAILS,
    };
  }

  const manifest = validation.manifest;
  return {
    ok: true,
    code: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_CODE.ACCEPTED,
    validation,
    local_state: {
      status: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_STATUS.ACCEPTED_LOCKED,
      source_device_id: manifest.source_device_id,
      environment: manifest.environment,
      store_id: manifest.store_id,
      inventory_instance_id: manifest.inventory_instance_id,
      inventory_stack_evidence_phase: manifest.phase,
      bridge_gate_locked: true,
      operationally_enabled: false,
      required_phase_count: manifest.required_phase_count,
      capabilities_enabled: false,
      evidence_projection_only: true,
      accepted_at: acceptedAt,
    },
    guardrails: SCANOPS_STACK_EVIDENCE_ACCEPTANCE_GUARDRAILS,
  };
}

export function getScanOpsStackEvidenceAcceptanceSafeSummary(input = {}) {
  const acceptance = parseJsonMaybe(input) || {};
  const state = acceptance.local_state || {};
  return {
    ok: acceptance.ok ?? null,
    code: acceptance.code || null,
    local_status: state.status || null,
    source_device_id: state.source_device_id || null,
    environment: state.environment || null,
    store_id: state.store_id || null,
    inventory_instance_id: state.inventory_instance_id || null,
    inventory_stack_evidence_phase: state.inventory_stack_evidence_phase || null,
    bridge_gate_locked: state.bridge_gate_locked ?? null,
    operationally_enabled: state.operationally_enabled ?? null,
    required_phase_count: state.required_phase_count ?? null,
    capabilities_enabled: state.capabilities_enabled ?? null,
    evidence_projection_only: state.evidence_projection_only ?? null,
    accepted_at: state.accepted_at || null,
  };
}

export function assertNoScanOpsStackEvidenceAcceptanceOperationalMutation() {
  return SCANOPS_STACK_EVIDENCE_ACCEPTANCE_GUARDRAILS;
}
