export const SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_PHASE = '1D-D-AG';
export const SCANOPS_RELEASE_BLOCKER_SOURCE_PHASE = '1D-D-AF';

export const SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_STATUS = Object.freeze({
  ACCEPTED_LOCKED: 'RELEASE_BLOCKER_ACCEPTED_LOCKED_PENDING_RELEASE_PLAN',
  REJECTED: 'RELEASE_BLOCKER_REJECTED',
});

export const SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_CODE = Object.freeze({
  ACCEPTED: 'SCANOPS_RELEASE_BLOCKER_ACCEPTED',
  INVALID: 'RELEASE_BLOCKER_INVALID',
  PHASE_MISMATCH: 'RELEASE_BLOCKER_PHASE_MISMATCH',
  STATUS_MISMATCH: 'RELEASE_BLOCKER_STATUS_MISMATCH',
  SCOPE_MISMATCH: 'RELEASE_BLOCKER_SCOPE_MISMATCH',
  BLOCKER_LIST_MISSING: 'RELEASE_BLOCKER_LIST_MISSING',
  RELEASE_ALLOWED: 'RELEASE_BLOCKER_RELEASE_ALLOWED',
  CAPABILITY_ENABLED: 'RELEASE_BLOCKER_CAPABILITY_ENABLED',
});

export const SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_GUARDRAILS = Object.freeze({
  projection_only: true,
  local_validator_only: true,
  release_blocker_acceptance_only: true,
  no_operational_activation: true,
  no_relay_enforcement: true,
  no_relay_transport: true,
  no_event_transport: true,
  no_event_sync: true,
  no_event_ingestion: true,
  no_persistence_write: true,
  no_inventory_write: true,
  no_stock_price_pos_order_forecast_mutation: true,
  explicit_release_plan_required: true,
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

function anyCapabilityEnabled(blocker = {}) {
  const names = [
    'relay_enforcement_allowed',
    'relay_transport_allowed',
    'event_transport_allowed',
    'event_sync_allowed',
    'event_ingestion_allowed',
    'inventory_mutation_allowed',
  ];
  return names.some((name) => blocker[name] === true);
}

export function validateScanOpsReleaseBlockerAcceptance(input = {}, scopeInput = {}) {
  const blocker = parseJsonMaybe(input);
  const scope = normalizeScope(scopeInput);

  if (!blocker || typeof blocker !== 'object' || Array.isArray(blocker)) {
    return { ok: false, code: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_CODE.INVALID, blocker: null, scope };
  }

  if (blocker.phase !== SCANOPS_RELEASE_BLOCKER_SOURCE_PHASE) {
    return { ok: false, code: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_CODE.PHASE_MISMATCH, blocker, scope };
  }

  if (blocker.code !== 'INVENTORY_BRIDGE_RELEASE_BLOCKER_PROJECTED' || blocker.status !== 'BRIDGE_RELEASE_BLOCKED_PENDING_EXPLICIT_RELEASE_PLAN' || blocker.bridge_gate_locked !== true || blocker.release_plan_required !== true) {
    return { ok: false, code: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_CODE.STATUS_MISMATCH, blocker, scope };
  }

  if (blocker.release_allowed !== false) {
    return { ok: false, code: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_CODE.RELEASE_ALLOWED, blocker, scope };
  }

  if (!Array.isArray(blocker.blockers) || blocker.blockers.length < 1 || blocker.blocker_count !== blocker.blockers.length) {
    return { ok: false, code: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_CODE.BLOCKER_LIST_MISSING, blocker, scope };
  }

  if (scope.source_device_id && blocker.source_device_id !== scope.source_device_id) return { ok: false, code: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_CODE.SCOPE_MISMATCH, blocker, scope };
  if (scope.environment && blocker.environment !== scope.environment) return { ok: false, code: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_CODE.SCOPE_MISMATCH, blocker, scope };
  if (scope.store_id && blocker.store_id !== scope.store_id) return { ok: false, code: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_CODE.SCOPE_MISMATCH, blocker, scope };
  if (scope.inventory_instance_id && blocker.inventory_instance_id !== scope.inventory_instance_id) return { ok: false, code: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_CODE.SCOPE_MISMATCH, blocker, scope };

  if (anyCapabilityEnabled(blocker)) {
    return { ok: false, code: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_CODE.CAPABILITY_ENABLED, blocker, scope };
  }

  return { ok: true, code: 'RELEASE_BLOCKER_ACCEPTANCE_VALID', blocker, scope };
}

export function acceptScanOpsReleaseBlocker(input = {}, scopeInput = {}, options = {}) {
  const validation = validateScanOpsReleaseBlockerAcceptance(input, scopeInput);
  const acceptedAt = options.accepted_at || nowIso();

  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      validation,
      local_state: {
        status: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_STATUS.REJECTED,
        release_allowed: false,
        capabilities_enabled: false,
      },
      guardrails: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_GUARDRAILS,
    };
  }

  const blocker = validation.blocker;
  return {
    ok: true,
    code: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_CODE.ACCEPTED,
    validation,
    local_state: {
      status: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_STATUS.ACCEPTED_LOCKED,
      source_device_id: blocker.source_device_id,
      environment: blocker.environment,
      store_id: blocker.store_id,
      inventory_instance_id: blocker.inventory_instance_id,
      inventory_release_blocker_phase: blocker.phase,
      bridge_gate_locked: true,
      release_allowed: false,
      release_plan_required: true,
      blocker_count: blocker.blocker_count,
      capabilities_enabled: false,
      evidence_projection_only: true,
      accepted_at: acceptedAt,
    },
    guardrails: SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_GUARDRAILS,
  };
}

export function getScanOpsReleaseBlockerAcceptanceSafeSummary(input = {}) {
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
    inventory_release_blocker_phase: state.inventory_release_blocker_phase || null,
    bridge_gate_locked: state.bridge_gate_locked ?? null,
    release_allowed: state.release_allowed ?? null,
    release_plan_required: state.release_plan_required ?? null,
    blocker_count: state.blocker_count ?? null,
    capabilities_enabled: state.capabilities_enabled ?? null,
    evidence_projection_only: state.evidence_projection_only ?? null,
    accepted_at: state.accepted_at || null,
  };
}

export function assertNoScanOpsReleaseBlockerAcceptanceOperationalMutation() {
  return SCANOPS_RELEASE_BLOCKER_ACCEPTANCE_GUARDRAILS;
}
