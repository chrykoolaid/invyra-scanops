export const SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_PHASE = '1D-D-AI';
export const SCANOPS_RELEASE_PLAN_DRAFT_SOURCE_PHASE = '1D-D-AH';

export const SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_STATUS = Object.freeze({
  ACCEPTED_LOCKED: 'RELEASE_PLAN_DRAFT_ACCEPTED_LOCKED_NON_EXECUTABLE',
  REJECTED: 'RELEASE_PLAN_DRAFT_REJECTED',
});

export const SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_CODE = Object.freeze({
  ACCEPTED: 'SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTED',
  INVALID: 'RELEASE_PLAN_DRAFT_INVALID',
  PHASE_MISMATCH: 'RELEASE_PLAN_DRAFT_PHASE_MISMATCH',
  STATUS_MISMATCH: 'RELEASE_PLAN_DRAFT_STATUS_MISMATCH',
  SCOPE_MISMATCH: 'RELEASE_PLAN_DRAFT_SCOPE_MISMATCH',
  PLAN_STEPS_MISSING: 'RELEASE_PLAN_DRAFT_STEPS_MISSING',
  EXECUTABLE_ENABLED: 'RELEASE_PLAN_DRAFT_EXECUTABLE_ENABLED',
  RELEASE_ALLOWED: 'RELEASE_PLAN_DRAFT_RELEASE_ALLOWED',
  CAPABILITY_ENABLED: 'RELEASE_PLAN_DRAFT_CAPABILITY_ENABLED',
});

export const SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_GUARDRAILS = Object.freeze({
  projection_only: true,
  local_validator_only: true,
  draft_plan_acceptance_only: true,
  non_executable: true,
  no_operational_activation: true,
  no_relay_enforcement: true,
  no_relay_transport: true,
  no_event_transport: true,
  no_event_sync: true,
  no_event_ingestion: true,
  no_persistence_write: true,
  no_inventory_write: true,
  no_stock_price_pos_order_forecast_mutation: true,
  separate_release_pr_required: true,
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

function anyCapabilityEnabled(plan = {}) {
  const names = [
    'relay_enforcement_allowed',
    'relay_transport_allowed',
    'event_transport_allowed',
    'event_sync_allowed',
    'event_ingestion_allowed',
    'inventory_mutation_allowed',
  ];
  return names.some((name) => plan[name] === true);
}

export function validateScanOpsReleasePlanDraftAcceptance(input = {}, scopeInput = {}) {
  const plan = parseJsonMaybe(input);
  const scope = normalizeScope(scopeInput);

  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    return { ok: false, code: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_CODE.INVALID, plan: null, scope };
  }

  if (plan.phase !== SCANOPS_RELEASE_PLAN_DRAFT_SOURCE_PHASE) {
    return { ok: false, code: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_CODE.PHASE_MISMATCH, plan, scope };
  }

  if (plan.code !== 'INVENTORY_BRIDGE_RELEASE_PLAN_DRAFT_PROJECTED' || plan.status !== 'BRIDGE_RELEASE_PLAN_DRAFT_PROJECTED_LOCKED_NON_EXECUTABLE' || plan.bridge_gate_locked !== true || plan.release_pr_required !== true) {
    return { ok: false, code: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_CODE.STATUS_MISMATCH, plan, scope };
  }

  if (plan.executable !== false) {
    return { ok: false, code: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_CODE.EXECUTABLE_ENABLED, plan, scope };
  }

  if (plan.release_allowed !== false) {
    return { ok: false, code: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_CODE.RELEASE_ALLOWED, plan, scope };
  }

  if (!Array.isArray(plan.plan_steps) || plan.plan_steps.length < 1 || plan.plan_step_count !== plan.plan_steps.length) {
    return { ok: false, code: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_CODE.PLAN_STEPS_MISSING, plan, scope };
  }

  if (scope.source_device_id && plan.source_device_id !== scope.source_device_id) return { ok: false, code: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_CODE.SCOPE_MISMATCH, plan, scope };
  if (scope.environment && plan.environment !== scope.environment) return { ok: false, code: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_CODE.SCOPE_MISMATCH, plan, scope };
  if (scope.store_id && plan.store_id !== scope.store_id) return { ok: false, code: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_CODE.SCOPE_MISMATCH, plan, scope };
  if (scope.inventory_instance_id && plan.inventory_instance_id !== scope.inventory_instance_id) return { ok: false, code: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_CODE.SCOPE_MISMATCH, plan, scope };

  if (anyCapabilityEnabled(plan)) {
    return { ok: false, code: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_CODE.CAPABILITY_ENABLED, plan, scope };
  }

  return { ok: true, code: 'RELEASE_PLAN_DRAFT_ACCEPTANCE_VALID', plan, scope };
}

export function acceptScanOpsReleasePlanDraft(input = {}, scopeInput = {}, options = {}) {
  const validation = validateScanOpsReleasePlanDraftAcceptance(input, scopeInput);
  const acceptedAt = options.accepted_at || nowIso();

  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      validation,
      local_state: {
        status: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_STATUS.REJECTED,
        executable: false,
        release_allowed: false,
        capabilities_enabled: false,
      },
      guardrails: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_GUARDRAILS,
    };
  }

  const plan = validation.plan;
  return {
    ok: true,
    code: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_CODE.ACCEPTED,
    validation,
    local_state: {
      status: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_STATUS.ACCEPTED_LOCKED,
      source_device_id: plan.source_device_id,
      environment: plan.environment,
      store_id: plan.store_id,
      inventory_instance_id: plan.inventory_instance_id,
      inventory_release_plan_draft_phase: plan.phase,
      bridge_gate_locked: true,
      executable: false,
      release_allowed: false,
      release_pr_required: true,
      plan_step_count: plan.plan_step_count,
      capabilities_enabled: false,
      evidence_projection_only: true,
      accepted_at: acceptedAt,
    },
    guardrails: SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_GUARDRAILS,
  };
}

export function getScanOpsReleasePlanDraftAcceptanceSafeSummary(input = {}) {
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
    inventory_release_plan_draft_phase: state.inventory_release_plan_draft_phase || null,
    bridge_gate_locked: state.bridge_gate_locked ?? null,
    executable: state.executable ?? null,
    release_allowed: state.release_allowed ?? null,
    release_pr_required: state.release_pr_required ?? null,
    plan_step_count: state.plan_step_count ?? null,
    capabilities_enabled: state.capabilities_enabled ?? null,
    evidence_projection_only: state.evidence_projection_only ?? null,
    accepted_at: state.accepted_at || null,
  };
}

export function assertNoScanOpsReleasePlanDraftAcceptanceOperationalMutation() {
  return SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTANCE_GUARDRAILS;
}
