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

export function queueItemId(queueItem = {}) {
  return asTrimmedString(queueItem.id || queueItem.queueId || queueItem.queue_id || queueItem.localId || queueItem.local_id);
}

export function manualRequestRequestedBy(manualRequest = {}) {
  return asTrimmedString(
    manualRequest.requestedBy
      || manualRequest.requested_by
      || manualRequest.operatorId
      || manualRequest.operator_id
      || manualRequest.userId
      || manualRequest.user_id
  ) || null;
}

export function isManualRequest(options = {}) {
  const manualRequest = isPlainObject(options.manualRequest) ? options.manualRequest : {};
  return options.manualSyncRequested === true
    || options.userInitiated === true
    || options.operatorInitiated === true
    || manualRequest.userInitiated === true
    || manualRequest.operatorInitiated === true
    || asTrimmedString(manualRequest.trigger).toLowerCase() === 'manual'
    || asTrimmedString(manualRequest.source).toLowerCase() === 'manual';
}
