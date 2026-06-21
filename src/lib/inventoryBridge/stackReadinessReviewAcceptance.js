export const SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_PHASE = '1D-D-AM';
export const SCANOPS_STACK_READINESS_REVIEW_SOURCE_PHASE = '1D-D-AL';

export const SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_STATUS = Object.freeze({
  ACCEPTED_LOCKED: 'STACK_READINESS_REVIEW_ACCEPTED_LOCKED_NON_OPERATIONAL',
  REJECTED: 'STACK_READINESS_REVIEW_REJECTED',
});

export const SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_CODE = Object.freeze({
  ACCEPTED: 'SCANOPS_STACK_READINESS_REVIEW_ACCEPTED',
  INVALID: 'STACK_READINESS_REVIEW_INVALID',
  PHASE_MISMATCH: 'STACK_READINESS_REVIEW_PHASE_MISMATCH',
  STATUS_MISMATCH: 'STACK_READINESS_REVIEW_STATUS_MISMATCH',
  SCOPE_MISMATCH: 'STACK_READINESS_REVIEW_SCOPE_MISMATCH',
  REVIEW_ORDER_MISSING: 'STACK_READINESS_REVIEW_ORDER_MISSING',
  OPERATIONAL_ENABLED: 'STACK_READINESS_REVIEW_OPERATIONAL_ENABLED',
  CAPABILITY_ENABLED: 'STACK_READINESS_REVIEW_CAPABILITY_ENABLED',
  MERGE_RELEASE_ENABLED: 'STACK_READINESS_REVIEW_MERGE_OR_RELEASE_ENABLED',
});

export const SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_GUARDRAILS = Object.freeze({
  projection_only: true,
  local_validator_only: true,
  readiness_review_acceptance_only: true,
  non_operational: true,
  no_operational_activation: true,
  merge_allowed: false,
  release_allowed: false,
  runtime_activation_allowed: false,
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

export function validateScanOpsStackReadinessReviewAcceptance(input = {}, scopeInput = {}) {
  const manifest = parseJsonMaybe(input);
  const scope = normalizeScope(scopeInput);

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, code: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_CODE.INVALID, manifest: null, scope };
  }

  if (manifest.phase !== SCANOPS_STACK_READINESS_REVIEW_SOURCE_PHASE) {
    return { ok: false, code: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_CODE.PHASE_MISMATCH, manifest, scope };
  }

  if (manifest.code !== 'INVENTORY_BRIDGE_STACK_READINESS_REVIEW_PROJECTED' || manifest.status !== 'BRIDGE_STACK_READINESS_REVIEW_PROJECTED_LOCKED_NON_OPERATIONAL' || manifest.bridge_gate_locked !== true || manifest.ready_for_ordered_review !== true) {
    return { ok: false, code: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_CODE.STATUS_MISMATCH, manifest, scope };
  }

  if (manifest.operationally_enabled !== false || manifest.runtime_activation_allowed !== false) {
    return { ok: false, code: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_CODE.OPERATIONAL_ENABLED, manifest, scope };
  }

  if (manifest.merge_allowed !== false || manifest.release_allowed !== false) {
    return { ok: false, code: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_CODE.MERGE_RELEASE_ENABLED, manifest, scope };
  }

  if (!Array.isArray(manifest.review_order) || manifest.review_order.length < 18 || manifest.review_order_count !== manifest.review_order.length) {
    return { ok: false, code: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_CODE.REVIEW_ORDER_MISSING, manifest, scope };
  }

  if (scope.source_device_id && manifest.source_device_id !== scope.source_device_id) return { ok: false, code: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_CODE.SCOPE_MISMATCH, manifest, scope };
  if (scope.environment && manifest.environment !== scope.environment) return { ok: false, code: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_CODE.SCOPE_MISMATCH, manifest, scope };
  if (scope.store_id && manifest.store_id !== scope.store_id) return { ok: false, code: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_CODE.SCOPE_MISMATCH, manifest, scope };
  if (scope.inventory_instance_id && manifest.inventory_instance_id !== scope.inventory_instance_id) return { ok: false, code: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_CODE.SCOPE_MISMATCH, manifest, scope };

  if (anyCapabilityEnabled(manifest)) {
    return { ok: false, code: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_CODE.CAPABILITY_ENABLED, manifest, scope };
  }

  return { ok: true, code: 'STACK_READINESS_REVIEW_ACCEPTANCE_VALID', manifest, scope };
}

export function acceptScanOpsStackReadinessReview(input = {}, scopeInput = {}, options = {}) {
  const validation = validateScanOpsStackReadinessReviewAcceptance(input, scopeInput);
  const acceptedAt = options.accepted_at || nowIso();

  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      validation,
      local_state: {
        status: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_STATUS.REJECTED,
        ready_for_ordered_review: false,
        merge_allowed: false,
        release_allowed: false,
        runtime_activation_allowed: false,
        operationally_enabled: false,
        capabilities_enabled: false,
      },
      guardrails: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_GUARDRAILS,
    };
  }

  const manifest = validation.manifest;
  return {
    ok: true,
    code: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_CODE.ACCEPTED,
    validation,
    local_state: {
      status: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_STATUS.ACCEPTED_LOCKED,
      source_device_id: manifest.source_device_id,
      environment: manifest.environment,
      store_id: manifest.store_id,
      inventory_instance_id: manifest.inventory_instance_id,
      inventory_stack_readiness_review_phase: manifest.phase,
      bridge_gate_locked: true,
      ready_for_ordered_review: true,
      merge_allowed: false,
      release_allowed: false,
      runtime_activation_allowed: false,
      operationally_enabled: false,
      review_order_count: manifest.review_order_count,
      capabilities_enabled: false,
      evidence_projection_only: true,
      accepted_at: acceptedAt,
    },
    guardrails: SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_GUARDRAILS,
  };
}

export function getScanOpsStackReadinessReviewAcceptanceSafeSummary(input = {}) {
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
    inventory_stack_readiness_review_phase: state.inventory_stack_readiness_review_phase || null,
    bridge_gate_locked: state.bridge_gate_locked ?? null,
    ready_for_ordered_review: state.ready_for_ordered_review ?? null,
    merge_allowed: state.merge_allowed ?? null,
    release_allowed: state.release_allowed ?? null,
    runtime_activation_allowed: state.runtime_activation_allowed ?? null,
    operationally_enabled: state.operationally_enabled ?? null,
    review_order_count: state.review_order_count ?? null,
    capabilities_enabled: state.capabilities_enabled ?? null,
    accepted_at: state.accepted_at || null,
  };
}

export function assertNoScanOpsStackReadinessReviewAcceptanceOperationalMutation() {
  return SCANOPS_STACK_READINESS_REVIEW_ACCEPTANCE_GUARDRAILS;
}
