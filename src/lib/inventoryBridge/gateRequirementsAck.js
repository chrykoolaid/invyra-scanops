export const SCANOPS_GATE_REQUIREMENTS_ACK_PHASE = '1D-D-AE';
export const SCANOPS_GATE_REQUIREMENTS_SOURCE_PHASE = '1D-D-AD';

export const GATE_REQUIREMENTS_ACK_STATUS = Object.freeze({
  ACCEPTED_LOCKED: 'GATE_REQUIREMENTS_ACCEPTED_LOCKED_PENDING_RELEASE',
  REJECTED: 'GATE_REQUIREMENTS_REJECTED',
});

export const GATE_REQUIREMENTS_ACK_CODE = Object.freeze({
  ACCEPTED: 'SCANOPS_GATE_REQUIREMENTS_ACCEPTED',
  INVALID: 'GATE_REQUIREMENTS_INVALID',
  PHASE_MISMATCH: 'GATE_REQUIREMENTS_PHASE_MISMATCH',
  STATUS_MISMATCH: 'GATE_REQUIREMENTS_STATUS_MISMATCH',
  SCOPE_MISMATCH: 'GATE_REQUIREMENTS_SCOPE_MISMATCH',
  LIST_MISSING: 'GATE_REQUIREMENTS_LIST_MISSING',
  CAPABILITY_ENABLED: 'GATE_REQUIREMENTS_CAPABILITY_ENABLED',
});

export const GATE_REQUIREMENTS_ACK_GUARDRAILS = Object.freeze({
  projection_only: true,
  local_validator_only: true,
  no_operational_activation: true,
  no_persistence_write: true,
  no_inventory_write: true,
  later_release_required: true,
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
    'relay_transport_allowed',
    'event_transport_allowed',
    'event_sync_allowed',
    'event_ingestion_allowed',
    'inventory_mutation_allowed',
  ];
  return names.some((name) => manifest[name] === true);
}

export function validateScanOpsGateRequirementsAck(input = {}, scopeInput = {}) {
  const manifest = parseJsonMaybe(input);
  const scope = normalizeScope(scopeInput);

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, code: GATE_REQUIREMENTS_ACK_CODE.INVALID, manifest: null, scope };
  }

  if (manifest.phase !== SCANOPS_GATE_REQUIREMENTS_SOURCE_PHASE) {
    return { ok: false, code: GATE_REQUIREMENTS_ACK_CODE.PHASE_MISMATCH, manifest, scope };
  }

  if (manifest.code !== 'INVENTORY_BRIDGE_GATE_REQUIREMENTS_PROJECTED' || manifest.status !== 'BRIDGE_GATE_REQUIREMENTS_PROJECTED_LOCKED') {
    return { ok: false, code: GATE_REQUIREMENTS_ACK_CODE.STATUS_MISMATCH, manifest, scope };
  }

  if (manifest.bridge_gate_locked !== true || manifest.later_release_phase_required !== true) {
    return { ok: false, code: GATE_REQUIREMENTS_ACK_CODE.STATUS_MISMATCH, manifest, scope };
  }

  if (!Array.isArray(manifest.requirements) || manifest.requirements.length < 1 || manifest.requirement_count !== manifest.requirements.length) {
    return { ok: false, code: GATE_REQUIREMENTS_ACK_CODE.LIST_MISSING, manifest, scope };
  }

  if (scope.source_device_id && manifest.source_device_id !== scope.source_device_id) {
    return { ok: false, code: GATE_REQUIREMENTS_ACK_CODE.SCOPE_MISMATCH, manifest, scope };
  }

  if (scope.environment && manifest.environment !== scope.environment) {
    return { ok: false, code: GATE_REQUIREMENTS_ACK_CODE.SCOPE_MISMATCH, manifest, scope };
  }

  if (scope.store_id && manifest.store_id !== scope.store_id) {
    return { ok: false, code: GATE_REQUIREMENTS_ACK_CODE.SCOPE_MISMATCH, manifest, scope };
  }

  if (scope.inventory_instance_id && manifest.inventory_instance_id !== scope.inventory_instance_id) {
    return { ok: false, code: GATE_REQUIREMENTS_ACK_CODE.SCOPE_MISMATCH, manifest, scope };
  }

  if (anyCapabilityEnabled(manifest)) {
    return { ok: false, code: GATE_REQUIREMENTS_ACK_CODE.CAPABILITY_ENABLED, manifest, scope };
  }

  return { ok: true, code: 'GATE_REQUIREMENTS_ACK_VALID', manifest, scope };
}

export function acceptScanOpsGateRequirementsAck(input = {}, scopeInput = {}, options = {}) {
  const validation = validateScanOpsGateRequirementsAck(input, scopeInput);
  const acceptedAt = options.accepted_at || nowIso();

  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      validation,
      local_state: {
        status: GATE_REQUIREMENTS_ACK_STATUS.REJECTED,
        capabilities_enabled: false,
      },
      guardrails: GATE_REQUIREMENTS_ACK_GUARDRAILS,
    };
  }

  const manifest = validation.manifest;
  return {
    ok: true,
    code: GATE_REQUIREMENTS_ACK_CODE.ACCEPTED,
    validation,
    local_state: {
      status: GATE_REQUIREMENTS_ACK_STATUS.ACCEPTED_LOCKED,
      source_device_id: manifest.source_device_id,
      environment: manifest.environment,
      store_id: manifest.store_id,
      inventory_instance_id: manifest.inventory_instance_id,
      inventory_manifest_phase: manifest.phase,
      bridge_gate_locked: true,
      later_release_required: true,
      requirement_count: manifest.requirement_count,
      capabilities_enabled: false,
      evidence_projection_only: true,
      accepted_at: acceptedAt,
    },
    guardrails: GATE_REQUIREMENTS_ACK_GUARDRAILS,
  };
}

export function getScanOpsGateRequirementsAckSafeSummary(input = {}) {
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
    bridge_gate_locked: state.bridge_gate_locked ?? null,
    later_release_required: state.later_release_required ?? null,
    requirement_count: state.requirement_count ?? null,
    capabilities_enabled: state.capabilities_enabled ?? null,
    evidence_projection_only: state.evidence_projection_only ?? null,
    accepted_at: state.accepted_at || null,
  };
}

export function assertNoScanOpsGateRequirementsAckOperationalMutation() {
  return GATE_REQUIREMENTS_ACK_GUARDRAILS;
}
