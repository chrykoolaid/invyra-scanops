export function nowIso(now) {
  if (typeof now === 'function') return now();
  return new Date().toISOString();
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

export function freezeIssue(code, message, field = null) {
  return Object.freeze({ code, message, field });
}

export function normalizeToken(value) {
  return asTrimmedString(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function queueItemId(queueItem = {}) {
  return asTrimmedString(queueItem.id || queueItem.queueId || queueItem.queue_id || queueItem.localId || queueItem.local_id);
}

export function queueEventType(queueItem = {}) {
  return asTrimmedString(
    queueItem.bridgeOperationType
      || queueItem.bridge_operation_type
      || queueItem.operationType
      || queueItem.operation_type
      || queueItem.eventType
      || queueItem.event_type
      || queueItem.sourceWorkflow
      || queueItem.source_workflow
      || queueItem.type
  );
}
