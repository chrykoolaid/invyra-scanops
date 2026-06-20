import {
  acceptScanOpsReleasePlanDraft,
  assertNoScanOpsReleasePlanDraftAcceptanceOperationalMutation,
  getScanOpsReleasePlanDraftAcceptanceSafeSummary,
  validateScanOpsReleasePlanDraftAcceptance,
} from '../src/lib/inventoryBridge/releasePlanDraftAcceptance.js';

const releasePlanDraft = Object.freeze({
  ok: true,
  schema_version: '1.0.0',
  phase: '1D-D-AH',
  bridge_protocol_version: '1.0.0',
  code: 'INVENTORY_BRIDGE_RELEASE_PLAN_DRAFT_PROJECTED',
  status: 'BRIDGE_RELEASE_PLAN_DRAFT_PROJECTED_LOCKED_NON_EXECUTABLE',
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
  bridge_gate_locked: true,
  executable: false,
  release_allowed: false,
  release_pr_required: true,
  plan_steps: ['confirm_stacked_prs_verified_in_order', 'confirm_future_release_requires_new_explicit_pr'],
  plan_step_count: 2,
  relay_enforcement_allowed: false,
  relay_transport_allowed: false,
  event_transport_allowed: false,
  event_sync_allowed: false,
  event_ingestion_allowed: false,
  inventory_mutation_allowed: false,
  evidence_projection_only: true,
  projected_at: '2026-06-20T12:00:00.000Z',
});

const scope = Object.freeze({
  source_device_id: 'SCANOPS-DEVICE-001',
  environment: 'LIVE',
  store_id: 'STORE-001',
  inventory_instance_id: 'INV-INSTANCE-001',
});

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function reject(plan, expectedCode, label) {
  const result = acceptScanOpsReleasePlanDraft(plan, scope, { accepted_at: '2026-06-20T13:00:00.000Z' });
  assertEqual(result.ok, false, `${label}.ok`);
  assertEqual(result.code, expectedCode, `${label}.code`);
  assertEqual(result.local_state.executable, false, `${label}.executable`);
  assertEqual(result.local_state.release_allowed, false, `${label}.release_allowed`);
  assertEqual(result.local_state.capabilities_enabled, false, `${label}.capabilities_enabled`);
}

function main() {
  const validation = validateScanOpsReleasePlanDraftAcceptance(releasePlanDraft, scope);
  assertEqual(validation.ok, true, 'validation.ok');
  assertEqual(validation.code, 'RELEASE_PLAN_DRAFT_ACCEPTANCE_VALID', 'validation.code');

  const accepted = acceptScanOpsReleasePlanDraft(releasePlanDraft, scope, { accepted_at: '2026-06-20T13:00:00.000Z' });
  assertEqual(accepted.ok, true, 'accepted.ok');
  assertEqual(accepted.code, 'SCANOPS_RELEASE_PLAN_DRAFT_ACCEPTED', 'accepted.code');
  assertEqual(accepted.local_state.status, 'RELEASE_PLAN_DRAFT_ACCEPTED_LOCKED_NON_EXECUTABLE', 'state.status');
  assertEqual(accepted.local_state.inventory_release_plan_draft_phase, '1D-D-AH', 'state.inventory_release_plan_draft_phase');
  assertEqual(accepted.local_state.bridge_gate_locked, true, 'state.bridge_gate_locked');
  assertEqual(accepted.local_state.executable, false, 'state.executable');
  assertEqual(accepted.local_state.release_allowed, false, 'state.release_allowed');
  assertEqual(accepted.local_state.release_pr_required, true, 'state.release_pr_required');
  assertEqual(accepted.local_state.plan_step_count, 2, 'state.plan_step_count');
  assertEqual(accepted.local_state.capabilities_enabled, false, 'state.capabilities_enabled');
  assertEqual(accepted.local_state.evidence_projection_only, true, 'state.evidence_projection_only');

  const summary = getScanOpsReleasePlanDraftAcceptanceSafeSummary(accepted);
  assertEqual(summary.local_status, 'RELEASE_PLAN_DRAFT_ACCEPTED_LOCKED_NON_EXECUTABLE', 'summary.local_status');
  assertEqual(summary.executable, false, 'summary.executable');
  assertEqual(summary.release_allowed, false, 'summary.release_allowed');
  assertEqual(summary.release_pr_required, true, 'summary.release_pr_required');
  assertEqual(summary.capabilities_enabled, false, 'summary.capabilities_enabled');
  assertEqual(summary.plan_step_count, 2, 'summary.plan_step_count');

  reject({ ...releasePlanDraft, phase: '1D-D-AF' }, 'RELEASE_PLAN_DRAFT_PHASE_MISMATCH', 'phase mismatch rejected');
  reject({ ...releasePlanDraft, status: 'BRIDGE_RELEASE_PLAN_DRAFT_OPEN' }, 'RELEASE_PLAN_DRAFT_STATUS_MISMATCH', 'status mismatch rejected');
  reject({ ...releasePlanDraft, executable: true }, 'RELEASE_PLAN_DRAFT_EXECUTABLE_ENABLED', 'executable enabled rejected');
  reject({ ...releasePlanDraft, release_allowed: true }, 'RELEASE_PLAN_DRAFT_RELEASE_ALLOWED', 'release allowed rejected');
  reject({ ...releasePlanDraft, plan_steps: [], plan_step_count: 0 }, 'RELEASE_PLAN_DRAFT_STEPS_MISSING', 'plan steps missing rejected');
  reject({ ...releasePlanDraft, source_device_id: 'SCANOPS-OTHER' }, 'RELEASE_PLAN_DRAFT_SCOPE_MISMATCH', 'scope mismatch rejected');
  reject({ ...releasePlanDraft, event_sync_allowed: true }, 'RELEASE_PLAN_DRAFT_CAPABILITY_ENABLED', 'event sync capability rejected');
  reject({ ...releasePlanDraft, inventory_mutation_allowed: true }, 'RELEASE_PLAN_DRAFT_CAPABILITY_ENABLED', 'inventory capability rejected');

  const guardrails = assertNoScanOpsReleasePlanDraftAcceptanceOperationalMutation();
  assertEqual(guardrails.projection_only, true, 'guardrails.projection_only');
  assertEqual(guardrails.local_validator_only, true, 'guardrails.local_validator_only');
  assertEqual(guardrails.draft_plan_acceptance_only, true, 'guardrails.draft_plan_acceptance_only');
  assertEqual(guardrails.non_executable, true, 'guardrails.non_executable');
  assertEqual(guardrails.no_operational_activation, true, 'guardrails.no_operational_activation');
  assertEqual(guardrails.no_relay_enforcement, true, 'guardrails.no_relay_enforcement');
  assertEqual(guardrails.no_relay_transport, true, 'guardrails.no_relay_transport');
  assertEqual(guardrails.no_event_transport, true, 'guardrails.no_event_transport');
  assertEqual(guardrails.no_event_sync, true, 'guardrails.no_event_sync');
  assertEqual(guardrails.no_event_ingestion, true, 'guardrails.no_event_ingestion');
  assertEqual(guardrails.no_persistence_write, true, 'guardrails.no_persistence_write');
  assertEqual(guardrails.no_inventory_write, true, 'guardrails.no_inventory_write');

  console.log('ScanOps release plan draft acceptance validation PASS');
}

try {
  main();
} catch (error) {
  console.error('ScanOps release plan draft acceptance validation FAIL');
  console.error(error);
  process.exitCode = 1;
}
