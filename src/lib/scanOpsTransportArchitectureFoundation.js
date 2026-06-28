export const P29D_PHASE = '29D-SCANOPS-TRANSPORT-ARCHITECTURE-FOUNDATION';

export const P29D_STATUS = Object.freeze({
  READY: 'TRANSPORT_ARCHITECTURE_FOUNDATION_READY',
  BLOCKED: 'TRANSPORT_ARCHITECTURE_FOUNDATION_BLOCKED',
});

export const P29D_ENVIRONMENTS = Object.freeze({
  TRAINING: 'TRAINING',
  TEST: 'TEST',
  LIVE: 'LIVE',
  PRODUCTION: 'PRODUCTION',
  UNKNOWN: 'UNKNOWN',
});

const SAFE_ENVIRONMENTS = Object.freeze([
  P29D_ENVIRONMENTS.TRAINING,
  P29D_ENVIRONMENTS.TEST,
]);

function normalizeEnvironment(environment) {
  return typeof environment === 'string' ? environment.trim().toUpperCase() : P29D_ENVIRONMENTS.UNKNOWN;
}

function canReview(environment) {
  return SAFE_ENVIRONMENTS.includes(environment);
}

export function buildScanOpsTransportArchitectureFoundation(environment = P29D_ENVIRONMENTS.TRAINING) {
  const normalizedEnvironment = normalizeEnvironment(environment);
  const ready = canReview(normalizedEnvironment);

  return Object.freeze({
    phase: P29D_PHASE,
    environment: normalizedEnvironment,
    status: ready ? P29D_STATUS.READY : P29D_STATUS.BLOCKED,
    foundation_ready: ready,
    accelerated_milestone: true,
    review_only: true,
    design_only: true,
    candidate_only: true,
    preview_only: true,
    architecture_sections: Object.freeze([
      'pairing_model',
      'device_identity',
      'session_lifecycle',
      'offline_contract',
      'retry_contract',
      'envelope_contract',
      'error_taxonomy',
      'security_boundary',
      'validation_rules',
    ]),
    phase_dependencies: Object.freeze({
      scanops_29c_required: true,
      inventory_29b_required: true,
      phase_28_closed_required: true,
    }),
    disallowed_runtime: Object.freeze({
      transport_active: false,
      listener_active: false,
      network_call_attempted: false,
      desktop_call_attempted: false,
      event_sent: false,
      queue_persisted: false,
      receipt_emitted: false,
      inventory_write_allowed: false,
      scanops_write_allowed: false,
      mutation_allowed: false,
    }),
    inventory_system_of_record: true,
    scanops_operational_layer_only: true,
    runtime_activation_allowed: false,
    persisted: false,
    write_attempted: false,
    mutation_attempted: false,
  });
}
