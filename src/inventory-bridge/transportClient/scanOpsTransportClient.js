export const SCANOPS_BRIDGE_TRANSPORT_CLIENT_PHASE = '6';
export const SCANOPS_BRIDGE_TRANSPORT_CLIENT_COMPONENT = 'scanops_bridge_transport_client_foundation';
export const SCANOPS_BRIDGE_TRANSPORT_CLIENT_VERSION = 'scanops-transport-client.v0.6.0';

export const SCANOPS_BRIDGE_TRANSPORT_OPERATION_TYPES = Object.freeze([
  'LOOKUP_REQUEST',
  'COUNT_SUBMISSION',
  'RECEIVING_SUBMISSION',
  'TRANSFER_SUBMISSION',
  'WASTE_SUBMISSION',
  'MARKDOWN_SUBMISSION',
  'EXPIRY_SUBMISSION',
  'MOVEMENT_NOTE',
  'DEVICE_HEALTH_PING',
]);

export const SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES = Object.freeze({
  READY: 'READY',
  BLOCKED: 'BLOCKED',
  DISPATCHED: 'DISPATCHED',
  RECEIPT_ACCEPTED: 'RECEIPT_ACCEPTED',
  RECEIPT_REJECTED: 'RECEIPT_REJECTED',
  RECEIPT_DUPLICATE: 'RECEIPT_DUPLICATE',
  RECEIPT_UNSUPPORTED: 'RECEIPT_UNSUPPORTED',
  RECEIPT_SERVICE_UNAVAILABLE: 'RECEIPT_SERVICE_UNAVAILABLE',
  RECEIPT_INVALID: 'RECEIPT_INVALID',
  TRANSPORT_ERROR: 'TRANSPORT_ERROR',
});

export const SCANOPS_BRIDGE_TRANSPORT_BLOCKERS = Object.freeze({
  ENDPOINT_REQUIRED: 'desktop_endpoint_required',
  DISPATCH_ADAPTER_REQUIRED: 'dispatch_adapter_required',
  ENVELOPE_REQUIRED: 'transport_envelope_required',
  ENVELOPE_ID_REQUIRED: 'transport_envelope_id_required',
  OPERATION_TYPE_REQUIRED: 'operation_type_required',
  UNSUPPORTED_OPERATION: 'unsupported_operation_type',
  SOURCE_DEVICE_REQUIRED: 'source_device_required',
  PAYLOAD_REQUIRED: 'payload_required',
  INVENTORY_DIRECT_MUTATION_BLOCKED: 'inventory_direct_mutation_blocked',
});

const DEFAULT_ENVIRONMENT = 'LIVE';
const DEFAULT_DEVICE_ID = 'scanops-device-local';
const DEFAULT_STORE_ID = 'store-local';
const DEFAULT_SESSION_ID = 'session-local';
const DEFAULT_DESKTOP_ID = 'inventory-desktop-local';

function nowIso(now) {
  if (typeof now === 'function') return now();
  return new Date().toISOString();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function freezeIssue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

function normalizeOperationType(value) {
  return asTrimmedString(value).toUpperCase();
}

function safeSegment(value, fallback = 'none') {
  const normalized = asTrimmedString(value)
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function normalizeEndpoint(endpoint = {}) {
  const host = asTrimmedString(endpoint.host || endpoint.ipAddress || endpoint.ip_address || endpoint.hostname);
  const port = asTrimmedString(endpoint.port);
  const path = asTrimmedString(endpoint.path || endpoint.handoffPath || endpoint.handoff_path) || '/scanops/handoff';
  const protocol = asTrimmedString(endpoint.protocol) || 'http';
  const desktopId = asTrimmedString(endpoint.desktopId || endpoint.desktop_id) || DEFAULT_DESKTOP_ID;
  const desktopName = asTrimmedString(endpoint.desktopName || endpoint.desktop_name) || 'Inventory Desktop';
  const environment = asTrimmedString(endpoint.environment) || DEFAULT_ENVIRONMENT;

  return Object.freeze({
    host,
    port,
    path: path.startsWith('/') ? path : `/${path}`,
    protocol: protocol === 'https' ? 'https' : 'http',
    desktopId,
    desktopName,
    environment,
    configured: Boolean(host),
    url: host ? `${protocol === 'https' ? 'https' : 'http'}://${host}${port ? `:${port}` : ''}${path.startsWith('/') ? path : `/${path}`}` : null,
  });
}

function normalizeDeviceIdentity(identity = {}) {
  return Object.freeze({
    deviceId: asTrimmedString(identity.deviceId || identity.device_id) || DEFAULT_DEVICE_ID,
    storeId: asTrimmedString(identity.storeId || identity.store_id) || DEFAULT_STORE_ID,
    sessionId: asTrimmedString(identity.sessionId || identity.session_id) || DEFAULT_SESSION_ID,
    operatorId: asTrimmedString(identity.operatorId || identity.operator_id) || null,
  });
}

export function buildScanOpsBridgeTransportEnvelope(operationType, payload = {}, options = {}) {
  const endpoint = normalizeEndpoint(options.endpoint || {});
  const source = normalizeDeviceIdentity(options.deviceIdentity || {});
  const normalizedOperationType = normalizeOperationType(operationType);
  const timestamp = nowIso(options.now);
  const envelopeId = asTrimmedString(options.envelopeId)
    || [
      'scanops-env',
      safeSegment(normalizedOperationType),
      safeSegment(source.deviceId),
      safeSegment(source.sessionId),
      String(Math.abs(timestamp.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0))),
    ].join(':');

  return Object.freeze({
    envelopeId,
    operationType: normalizedOperationType,
    timestamp,
    environment: endpoint.environment,
    source: Object.freeze({
      system: 'scanops',
      deviceId: source.deviceId,
      storeId: source.storeId,
      sessionId: source.sessionId,
      operatorId: source.operatorId,
    }),
    target: Object.freeze({
      system: 'inventory-desktop',
      desktopId: endpoint.desktopId,
      desktopName: endpoint.desktopName,
      environment: endpoint.environment,
    }),
    payload: Object.freeze(isPlainObject(payload) ? { ...payload } : {}),
    transport: Object.freeze({
      client: SCANOPS_BRIDGE_TRANSPORT_CLIENT_COMPONENT,
      clientVersion: SCANOPS_BRIDGE_TRANSPORT_CLIENT_VERSION,
      endpointUrl: endpoint.url,
      mutationIntent: false,
      inventoryDirectWrite: false,
    }),
  });
}

function validateEnvelope(envelope = {}) {
  const errors = [];
  const operationType = normalizeOperationType(envelope.operationType || envelope.operation_type);
  const source = isPlainObject(envelope.source) ? envelope.source : {};

  if (!isPlainObject(envelope)) {
    errors.push(freezeIssue(SCANOPS_BRIDGE_TRANSPORT_BLOCKERS.ENVELOPE_REQUIRED, 'A transport envelope object is required.', 'envelope'));
  }

  if (!asTrimmedString(envelope.envelopeId || envelope.envelope_id)) {
    errors.push(freezeIssue(SCANOPS_BRIDGE_TRANSPORT_BLOCKERS.ENVELOPE_ID_REQUIRED, 'Envelope ID is required.', 'envelopeId'));
  }

  if (!operationType) {
    errors.push(freezeIssue(SCANOPS_BRIDGE_TRANSPORT_BLOCKERS.OPERATION_TYPE_REQUIRED, 'Operation type is required.', 'operationType'));
  }

  if (operationType && !SCANOPS_BRIDGE_TRANSPORT_OPERATION_TYPES.includes(operationType)) {
    errors.push(freezeIssue(SCANOPS_BRIDGE_TRANSPORT_BLOCKERS.UNSUPPORTED_OPERATION, `Unsupported operation type: ${operationType}`, 'operationType'));
  }

  if (!asTrimmedString(source.deviceId || source.device_id)) {
    errors.push(freezeIssue(SCANOPS_BRIDGE_TRANSPORT_BLOCKERS.SOURCE_DEVICE_REQUIRED, 'Source device ID is required.', 'source.deviceId'));
  }

  if (!isPlainObject(envelope.payload)) {
    errors.push(freezeIssue(SCANOPS_BRIDGE_TRANSPORT_BLOCKERS.PAYLOAD_REQUIRED, 'Payload must be a plain object.', 'payload'));
  }

  return Object.freeze({
    valid: errors.length === 0,
    operationType,
    errors: freezeArray(errors),
  });
}

function validateDesktopReceipt(receipt = {}, envelope = {}) {
  const validStatuses = ['ACCEPTED', 'REJECTED', 'DUPLICATE', 'UNSUPPORTED', 'SERVICE_UNAVAILABLE'];
  const status = asTrimmedString(receipt.status).toUpperCase();
  const errors = [];

  if (!isPlainObject(receipt)) {
    errors.push(freezeIssue('RECEIPT_REQUIRED', 'Desktop receipt object is required.', 'receipt'));
  }

  if (!asTrimmedString(receipt.receiptId || receipt.receipt_id)) {
    errors.push(freezeIssue('RECEIPT_ID_REQUIRED', 'Receipt ID is required.', 'receiptId'));
  }

  if (!validStatuses.includes(status)) {
    errors.push(freezeIssue('RECEIPT_STATUS_INVALID', 'Receipt status must be accepted, rejected, duplicate, unsupported, or service unavailable.', 'status'));
  }

  if (asTrimmedString(receipt.envelopeId || receipt.envelope_id) !== asTrimmedString(envelope.envelopeId || envelope.envelope_id)) {
    errors.push(freezeIssue('RECEIPT_ENVELOPE_MISMATCH', 'Receipt envelope ID does not match the submitted envelope.', 'envelopeId'));
  }

  return Object.freeze({
    valid: errors.length === 0,
    status,
    errors: freezeArray(errors),
  });
}

function receiptClientStatus(receiptStatus) {
  if (receiptStatus === 'ACCEPTED') return SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_ACCEPTED;
  if (receiptStatus === 'DUPLICATE') return SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_DUPLICATE;
  if (receiptStatus === 'UNSUPPORTED') return SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_UNSUPPORTED;
  if (receiptStatus === 'SERVICE_UNAVAILABLE') return SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_SERVICE_UNAVAILABLE;
  return SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_REJECTED;
}

function buildBlockedResult({ endpoint, envelope, errors, now }) {
  return Object.freeze({
    component: SCANOPS_BRIDGE_TRANSPORT_CLIENT_COMPONENT,
    phase: SCANOPS_BRIDGE_TRANSPORT_CLIENT_PHASE,
    status: SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.BLOCKED,
    timestamp: nowIso(now),
    endpoint,
    envelopeId: asTrimmedString(envelope?.envelopeId || envelope?.envelope_id) || null,
    operationType: normalizeOperationType(envelope?.operationType || envelope?.operation_type) || null,
    dispatchAttempted: false,
    receiptReceived: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    stockMutationAttempted: false,
    errors: freezeArray(errors),
    receipt: null,
  });
}

export function createScanOpsBridgeTransportClient(options = {}) {
  const endpoint = normalizeEndpoint(options.endpoint || {});
  const dispatch = options.dispatch;
  const hasDispatchAdapter = typeof dispatch === 'function';

  function getReadiness() {
    const errors = [];
    if (!endpoint.configured) {
      errors.push(freezeIssue(SCANOPS_BRIDGE_TRANSPORT_BLOCKERS.ENDPOINT_REQUIRED, 'Inventory Desktop endpoint host is required before transport handoff.', 'endpoint.host'));
    }
    if (!hasDispatchAdapter) {
      errors.push(freezeIssue(SCANOPS_BRIDGE_TRANSPORT_BLOCKERS.DISPATCH_ADAPTER_REQUIRED, 'A transport dispatch adapter is required before sending handoffs.', 'dispatch'));
    }

    return Object.freeze({
      component: SCANOPS_BRIDGE_TRANSPORT_CLIENT_COMPONENT,
      phase: SCANOPS_BRIDGE_TRANSPORT_CLIENT_PHASE,
      version: SCANOPS_BRIDGE_TRANSPORT_CLIENT_VERSION,
      status: errors.length === 0 ? SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.READY : SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.BLOCKED,
      ready: errors.length === 0,
      endpoint,
      dispatchAdapterReady: hasDispatchAdapter,
      autoSyncEnabled: false,
      queueProcessingEnabled: false,
      backgroundReplayEnabled: false,
      inventoryDirectMutationBlocked: true,
      scanOpsMutationBlocked: true,
      stockMutationBlocked: true,
      errors: freezeArray(errors),
    });
  }

  async function sendHandoff(envelope = {}) {
    const readiness = getReadiness();
    const envelopeValidation = validateEnvelope(envelope);
    const errors = [...readiness.errors, ...envelopeValidation.errors];

    if (errors.length > 0) {
      return buildBlockedResult({ endpoint, envelope, errors, now: options.now });
    }

    try {
      const receipt = await dispatch(Object.freeze({
        endpoint,
        envelope: Object.freeze({ ...envelope }),
        requestedAt: nowIso(options.now),
      }));
      const receiptValidation = validateDesktopReceipt(receipt, envelope);

      if (!receiptValidation.valid) {
        return Object.freeze({
          component: SCANOPS_BRIDGE_TRANSPORT_CLIENT_COMPONENT,
          phase: SCANOPS_BRIDGE_TRANSPORT_CLIENT_PHASE,
          status: SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_INVALID,
          timestamp: nowIso(options.now),
          endpoint,
          envelopeId: envelope.envelopeId,
          operationType: envelopeValidation.operationType,
          dispatchAttempted: true,
          receiptReceived: true,
          inventoryMutationAttempted: false,
          scanOpsMutationAttempted: false,
          stockMutationAttempted: false,
          errors: receiptValidation.errors,
          receipt: Object.freeze({ ...(receipt || {}) }),
        });
      }

      return Object.freeze({
        component: SCANOPS_BRIDGE_TRANSPORT_CLIENT_COMPONENT,
        phase: SCANOPS_BRIDGE_TRANSPORT_CLIENT_PHASE,
        status: receiptClientStatus(receiptValidation.status),
        timestamp: nowIso(options.now),
        endpoint,
        envelopeId: envelope.envelopeId,
        operationType: envelopeValidation.operationType,
        dispatchAttempted: true,
        receiptReceived: true,
        inventoryMutationAttempted: false,
        scanOpsMutationAttempted: false,
        stockMutationAttempted: false,
        errors: freezeArray([]),
        receipt: Object.freeze({ ...receipt }),
      });
    } catch (error) {
      return Object.freeze({
        component: SCANOPS_BRIDGE_TRANSPORT_CLIENT_COMPONENT,
        phase: SCANOPS_BRIDGE_TRANSPORT_CLIENT_PHASE,
        status: SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.TRANSPORT_ERROR,
        timestamp: nowIso(options.now),
        endpoint,
        envelopeId: envelope.envelopeId || null,
        operationType: envelopeValidation.operationType || null,
        dispatchAttempted: true,
        receiptReceived: false,
        inventoryMutationAttempted: false,
        scanOpsMutationAttempted: false,
        stockMutationAttempted: false,
        errors: freezeArray([freezeIssue('TRANSPORT_ADAPTER_ERROR', error?.message || 'Transport adapter failed.', 'dispatch')]),
        receipt: null,
      });
    }
  }

  return Object.freeze({
    component: SCANOPS_BRIDGE_TRANSPORT_CLIENT_COMPONENT,
    phase: SCANOPS_BRIDGE_TRANSPORT_CLIENT_PHASE,
    version: SCANOPS_BRIDGE_TRANSPORT_CLIENT_VERSION,
    endpoint,
    getReadiness,
    sendHandoff,
  });
}

export function getScanOpsBridgeTransportClientReadiness(options = {}) {
  return createScanOpsBridgeTransportClient(options).getReadiness();
}

export async function getScanOpsBridgeTransportClientDiagnostics(options = {}) {
  const stableNow = options.now || (() => '2026-06-30T00:00:00.000Z');
  const endpoint = {
    host: '127.0.0.1',
    port: '8787',
    path: '/scanops/handoff',
    desktopId: 'desktop-001',
    desktopName: 'Inventory Desktop',
    environment: 'LIVE',
  };
  const envelope = buildScanOpsBridgeTransportEnvelope('COUNT_SUBMISSION', { evidenceOnly: true, itemId: 'item-001', countedQuantity: 1 }, {
    endpoint,
    envelopeId: 'scanops-env-phase6-diagnostic-001',
    deviceIdentity: { deviceId: 'scanops-device-001', storeId: 'store-001', sessionId: 'session-001' },
    now: stableNow,
  });

  let duplicateSeen = false;
  const client = createScanOpsBridgeTransportClient({
    endpoint,
    now: stableNow,
    dispatch: async ({ envelope: submittedEnvelope }) => {
      const status = duplicateSeen ? 'DUPLICATE' : 'ACCEPTED';
      duplicateSeen = true;
      return Object.freeze({
        receiptId: `receipt:${status.toLowerCase()}:${submittedEnvelope.envelopeId}`,
        envelopeId: submittedEnvelope.envelopeId,
        status,
        receivedAt: stableNow(),
        processedAt: stableNow(),
        desktopId: endpoint.desktopId,
        environment: endpoint.environment,
        operationType: submittedEnvelope.operationType,
        message: status === 'ACCEPTED' ? 'Accepted by diagnostic desktop adapter.' : 'Duplicate detected by diagnostic desktop adapter.',
        errors: [],
        warnings: [],
      });
    },
  });

  const blocked = createScanOpsBridgeTransportClient({ now: stableNow }).getReadiness();
  const readiness = client.getReadiness();
  const accepted = await client.sendHandoff(envelope);
  const duplicate = await client.sendHandoff(envelope);
  const invalidOperation = await client.sendHandoff({ ...envelope, envelopeId: 'scanops-env-phase6-invalid-operation', operationType: 'DIRECT_STOCK_MUTATION' });
  const invalidReceiptClient = createScanOpsBridgeTransportClient({
    endpoint,
    now: stableNow,
    dispatch: async () => Object.freeze({ status: 'ACCEPTED', envelopeId: 'wrong-envelope' }),
  });
  const invalidReceipt = await invalidReceiptClient.sendHandoff({ ...envelope, envelopeId: 'scanops-env-phase6-invalid-receipt' });

  const checks = Object.freeze([
    Object.freeze({ name: 'blocked_without_endpoint_and_dispatch', passed: blocked.ready === false && blocked.errors.length === 2 }),
    Object.freeze({ name: 'ready_with_endpoint_and_dispatch', passed: readiness.ready === true }),
    Object.freeze({ name: 'envelope_shape_built', passed: envelope.operationType === 'COUNT_SUBMISSION' && envelope.source.deviceId === 'scanops-device-001' && envelope.target.desktopId === 'desktop-001' }),
    Object.freeze({ name: 'accepted_receipt_processed', passed: accepted.status === SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_ACCEPTED }),
    Object.freeze({ name: 'duplicate_receipt_processed', passed: duplicate.status === SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_DUPLICATE }),
    Object.freeze({ name: 'unsupported_operation_blocked', passed: invalidOperation.status === SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.BLOCKED && invalidOperation.dispatchAttempted === false }),
    Object.freeze({ name: 'invalid_receipt_rejected', passed: invalidReceipt.status === SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_INVALID }),
    Object.freeze({ name: 'no_inventory_mutation', passed: [accepted, duplicate, invalidOperation, invalidReceipt].every((result) => result.inventoryMutationAttempted === false) }),
    Object.freeze({ name: 'no_scanops_mutation', passed: [accepted, duplicate, invalidOperation, invalidReceipt].every((result) => result.scanOpsMutationAttempted === false) }),
    Object.freeze({ name: 'no_stock_mutation', passed: [accepted, duplicate, invalidOperation, invalidReceipt].every((result) => result.stockMutationAttempted === false) }),
  ]);

  return Object.freeze({
    component: SCANOPS_BRIDGE_TRANSPORT_CLIENT_COMPONENT,
    phase: SCANOPS_BRIDGE_TRANSPORT_CLIENT_PHASE,
    passed: checks.every((check) => check.passed === true),
    blocked,
    readiness,
    envelope,
    accepted,
    duplicate,
    invalidOperation,
    invalidReceipt,
    checks,
  });
}
