import {
  SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES,
  SCANOPS_BRIDGE_TRANSPORT_OPERATION_TYPES,
  buildScanOpsBridgeTransportEnvelope,
  createScanOpsBridgeTransportClient,
} from '../transportClient/index.js';
import {
  MUTATION_INTENT_KEYS,
  QUEUE_EVENT_TO_OPERATION_TYPE,
  SCANOPS_BRIDGE_QUEUE_SYNC_BLOCKERS,
  SCANOPS_BRIDGE_QUEUE_SYNC_COMPONENT,
  SCANOPS_BRIDGE_QUEUE_SYNC_PHASE,
  SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES,
  SCANOPS_BRIDGE_QUEUE_SYNC_VERSION,
} from './queueSyncTypes.js';
import {
  asTrimmedString,
  freezeArray,
  freezeIssue,
  isPlainObject,
  normalizeToken,
  nowIso,
  queueEventType,
  queueItemId,
} from './queueSyncUtils.js';

export function mapScanOpsQueueEventToTransportOperation(queueItem = {}) {
  const eventType = normalizeToken(queueEventType(queueItem));
  const mapped = QUEUE_EVENT_TO_OPERATION_TYPE[eventType] || eventType;
  return Object.freeze({
    eventType,
    operationType: SCANOPS_BRIDGE_TRANSPORT_OPERATION_TYPES.includes(mapped) ? mapped : null,
  });
}

function hasBlockedIntent(queueItem = {}, payload = {}) {
  const merged = Object.freeze({ ...payload, ...queueItem });
  return MUTATION_INTENT_KEYS.some((key) => merged[key] === true);
}

export function validateScanOpsQueueItemForBridgeSync(queueItem = {}) {
  const errors = [];
  if (!isPlainObject(queueItem)) errors.push(freezeIssue(SCANOPS_BRIDGE_QUEUE_SYNC_BLOCKERS.QUEUE_ITEM_REQUIRED, 'A ScanOps queue item object is required.', 'queueItem'));
  const id = queueItemId(queueItem);
  if (!id) errors.push(freezeIssue(SCANOPS_BRIDGE_QUEUE_SYNC_BLOCKERS.QUEUE_ITEM_ID_REQUIRED, 'Queue item ID is required before bridge sync.', 'queueItem.id'));
  const operation = mapScanOpsQueueEventToTransportOperation(queueItem);
  if (!operation.eventType) errors.push(freezeIssue(SCANOPS_BRIDGE_QUEUE_SYNC_BLOCKERS.OPERATION_TYPE_REQUIRED, 'Queue event or operation type is required before bridge sync.', 'queueItem.eventType'));
  else if (!operation.operationType) errors.push(freezeIssue(SCANOPS_BRIDGE_QUEUE_SYNC_BLOCKERS.UNSUPPORTED_OPERATION, `Unsupported queue event type for bridge sync: ${operation.eventType}`, 'queueItem.eventType'));
  if (!('payload' in queueItem)) errors.push(freezeIssue(SCANOPS_BRIDGE_QUEUE_SYNC_BLOCKERS.PAYLOAD_REQUIRED, 'Queue payload is required before bridge sync.', 'queueItem.payload'));
  else if (!isPlainObject(queueItem.payload)) errors.push(freezeIssue(SCANOPS_BRIDGE_QUEUE_SYNC_BLOCKERS.PAYLOAD_PLAIN_OBJECT_REQUIRED, 'Queue payload must be a plain object.', 'queueItem.payload'));
  if (hasBlockedIntent(queueItem, isPlainObject(queueItem.payload) ? queueItem.payload : {})) errors.push(freezeIssue(SCANOPS_BRIDGE_QUEUE_SYNC_BLOCKERS.MUTATION_INTENT_BLOCKED, 'Queue sync cannot carry Inventory, stock, price, ledger, or approval mutation intent.', 'queueItem.payload'));
  return Object.freeze({ valid: errors.length === 0, queueItemId: id || null, sourceEventType: operation.eventType || null, operationType: operation.operationType || null, errors: freezeArray(errors) });
}

function resultBase(status, timestamp) {
  return {
    component: SCANOPS_BRIDGE_QUEUE_SYNC_COMPONENT,
    phase: SCANOPS_BRIDGE_QUEUE_SYNC_PHASE,
    version: SCANOPS_BRIDGE_QUEUE_SYNC_VERSION,
    status,
    timestamp,
    autoSyncEnabled: false,
    backgroundReplayEnabled: false,
    inventoryMutationAttempted: false,
    scanOpsMutationAttempted: false,
    stockMutationAttempted: false,
    priceMutationAttempted: false,
    projectionOnly: true,
  };
}

function queuePayload(queueItem = {}, validation) {
  return Object.freeze({
    queueItemId: validation.queueItemId,
    queueStatus: asTrimmedString(queueItem.status) || 'queued',
    sourceEventType: validation.sourceEventType,
    sourceWorkflow: asTrimmedString(queueItem.sourceWorkflow || queueItem.source_workflow || queueItem.workflow) || null,
    title: asTrimmedString(queueItem.title) || null,
    summary: asTrimmedString(queueItem.summary) || null,
    createdAt: asTrimmedString(queueItem.createdAt || queueItem.created_at) || null,
    updatedAt: asTrimmedString(queueItem.updatedAt || queueItem.updated_at) || null,
    payload: Object.freeze({ ...(isPlainObject(queueItem.payload) ? queueItem.payload : {}) }),
    mutationIntent: false,
    inventoryDirectWrite: false,
    stockMutation: false,
    priceMutation: false,
    approvalAction: false,
  });
}

export function buildScanOpsQueueSyncCandidate(queueItem = {}, options = {}) {
  const validation = validateScanOpsQueueItemForBridgeSync(queueItem);
  const timestamp = nowIso(options.now);
  if (!validation.valid) return Object.freeze({ ...resultBase(SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.BLOCKED, timestamp), queueItemId: validation.queueItemId, sourceEventType: validation.sourceEventType, operationType: validation.operationType, envelope: null, errors: validation.errors });
  const envelope = buildScanOpsBridgeTransportEnvelope(validation.operationType, queuePayload(queueItem, validation), { endpoint: options.endpoint || {}, deviceIdentity: options.deviceIdentity || {}, envelopeId: options.envelopeId, now: options.now });
  return Object.freeze({ ...resultBase(SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.READY, timestamp), queueItemId: validation.queueItemId, sourceEventType: validation.sourceEventType, operationType: validation.operationType, envelope, errors: freezeArray([]) });
}

export function mapScanOpsTransportResultToQueueStatus(transportResult = {}) {
  switch (transportResult.status) {
    case SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_ACCEPTED: return SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.SYNCED;
    case SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_DUPLICATE: return SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.DUPLICATE;
    case SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_REJECTED: return SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.REJECTED;
    case SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_SERVICE_UNAVAILABLE: return SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.SERVICE_UNAVAILABLE;
    case SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.TRANSPORT_ERROR: return SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.TRANSPORT_ERROR;
    case SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_UNSUPPORTED:
    case SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.RECEIPT_INVALID: return SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.NEEDS_REVIEW;
    case SCANOPS_BRIDGE_TRANSPORT_CLIENT_STATUSES.BLOCKED: return SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.BLOCKED;
    default: return SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.NEEDS_REVIEW;
  }
}

export function projectScanOpsQueueReceiptStatus({ queueItem = {}, transportResult = {}, now } = {}) {
  const nextQueueStatus = mapScanOpsTransportResultToQueueStatus(transportResult);
  const timestamp = nowIso(now);
  const id = queueItemId(queueItem) || asTrimmedString(transportResult.queueItemId) || null;
  const receipt = isPlainObject(transportResult.receipt) ? Object.freeze({ ...transportResult.receipt }) : null;
  return Object.freeze({
    ...resultBase(nextQueueStatus, timestamp),
    queueItemId: id,
    previousQueueStatus: asTrimmedString(queueItem.status) || null,
    nextQueueStatus,
    envelopeId: asTrimmedString(transportResult.envelopeId) || null,
    operationType: asTrimmedString(transportResult.operationType) || null,
    transportStatus: asTrimmedString(transportResult.status) || null,
    receiptReceived: transportResult.receiptReceived === true,
    receipt,
    errors: freezeArray(transportResult.errors),
    projectedQueuePatch: Object.freeze({ id, status: nextQueueStatus, bridgeEnvelopeId: asTrimmedString(transportResult.envelopeId) || null, bridgeReceiptId: asTrimmedString(receipt?.receiptId || receipt?.receipt_id) || null, bridgeReceiptStatus: asTrimmedString(receipt?.status) || null, bridgeStatusProjectedAt: timestamp }),
    queueWriteApplied: false,
  });
}

export async function runScanOpsQueueSyncHandoff(queueItem = {}, options = {}) {
  const candidate = buildScanOpsQueueSyncCandidate(queueItem, options);
  if (candidate.status === SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.BLOCKED) return Object.freeze({ ...resultBase(SCANOPS_BRIDGE_QUEUE_SYNC_STATUSES.BLOCKED, nowIso(options.now)), candidate, transportResult: null, receiptProjection: null, dispatchAttempted: false });
  const client = options.transportClient || createScanOpsBridgeTransportClient({ endpoint: options.endpoint || {}, dispatch: options.dispatch, now: options.now });
  const transportResult = await client.sendHandoff(candidate.envelope);
  const receiptProjection = projectScanOpsQueueReceiptStatus({ queueItem, transportResult, now: options.now });
  return Object.freeze({ ...resultBase(receiptProjection.nextQueueStatus, nowIso(options.now)), candidate, transportResult, receiptProjection, dispatchAttempted: transportResult.dispatchAttempted === true });
}
