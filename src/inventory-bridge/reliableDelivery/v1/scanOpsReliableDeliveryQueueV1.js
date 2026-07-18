import {
  buildCanonicalEnvelopeV1,
  validateCanonicalReceiptV1,
} from '../../canonicalAdapter/v1/index.js';
import { createAtomicJsonStoreV1 } from './atomicJsonStoreV1.js';
import {
  SCANOPS_RELIABLE_DELIVERY_V1_COMPONENT,
  SCANOPS_RELIABLE_DELIVERY_V1_PATH,
  SCANOPS_RELIABLE_DELIVERY_V1_PHASE,
  SCANOPS_RELIABLE_DELIVERY_V1_VERSION,
  asString,
  cloneFreeze,
  evaluateGate,
  hashCanonical,
  initialState,
  normalizeConfiguration,
  normalizeHealthInput,
  parseJson,
  queueIdFor,
  retryDelay,
} from './reliableDeliveryV1Shared.js';

export {
  SCANOPS_RELIABLE_DELIVERY_V1_COMPONENT,
  SCANOPS_RELIABLE_DELIVERY_V1_PATH,
  SCANOPS_RELIABLE_DELIVERY_V1_PHASE,
  SCANOPS_RELIABLE_DELIVERY_V1_VERSION,
};

export function createScanOpsReliableDeliveryQueueV1(options = {}) {
  const configuration = normalizeConfiguration(options);
  const fetchAdapter = options.fetchAdapter || globalThis.fetch;
  const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  const store = createAtomicJsonStoreV1({
    directory: configuration.persistenceDirectory || '.',
    fileName: 'scanops-reliable-delivery-v1.json',
    initialState: initialState(),
  });
  let opened = false;

  function nowMs() {
    const parsed = Date.parse(now());
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }

  function gate() {
    return evaluateGate(configuration, nowMs());
  }

  function open() {
    if (opened) return cloneFreeze({ opened: false, reason: 'QUEUE_ALREADY_OPEN' });
    const currentGate = gate();
    if (!currentGate.allowed) return cloneFreeze({ opened: false, reason: 'RUNTIME_GATE_BLOCKED', gate: currentGate });
    store.open();
    const inFlightRecords = Object.values(store.getSnapshot().queueById || {})
      .filter((record) => record.state === 'IN_FLIGHT');
    let recovery = { recoveredToRetryWait: 0, movedToDeadLetter: 0 };
    if (inFlightRecords.length > 0) {
      const recoveredAt = now();
      recovery = store.mutate((draft) => {
        const result = { recoveredToRetryWait: 0, movedToDeadLetter: 0 };
        for (const record of Object.values(draft.queueById || {})) {
          if (record.state !== 'IN_FLIGHT') continue;
          record.updatedAt = recoveredAt;
          record.lastError = {
            code: 'PROCESS_RESTART_RECOVERY',
            retryable: true,
            httpStatus: null,
            detail: { message: 'Recovered an interrupted in-flight delivery after process restart.' },
          };
          draft.metrics.recoveredInFlight = Number(draft.metrics.recoveredInFlight || 0) + 1;
          if (record.attemptCount >= configuration.maxAttempts) {
            record.state = 'DEAD_LETTER';
            record.deadLetteredAt = recoveredAt;
            draft.deadLetterByQueueId[record.queueId] = {
              queueId: record.queueId,
              idempotencyKey: record.idempotencyKey,
              envelopeHash: record.envelopeHash,
              reason: 'PROCESS_RESTART_DURING_FINAL_ATTEMPT',
              deadLetteredAt: recoveredAt,
              replayed: false,
            };
            draft.metrics.deadLettered += 1;
            result.movedToDeadLetter += 1;
          } else {
            record.state = 'RETRY_WAIT';
            record.nextAttemptAt = recoveredAt;
            draft.metrics.retries += 1;
            result.recoveredToRetryWait += 1;
          }
        }
        return result;
      }).result;
    }
    opened = true;
    return cloneFreeze({ opened: true, recovery, diagnostics: getDiagnostics() });
  }

  function assertOpen() {
    if (!opened || !store.isOpen()) throw new Error('Reliable-delivery queue is not open.');
  }

  function enqueueHealthPing(input = {}) {
    assertOpen();
    const currentGate = gate();
    if (!currentGate.allowed) return cloneFreeze({ ok: false, status: 'BLOCKED', gate: currentGate });
    const built = buildCanonicalEnvelopeV1(normalizeHealthInput(input, configuration, now()));
    if (built.ok !== true) return cloneFreeze({ ok: false, status: 'ENVELOPE_INVALID', errors: built.errors });
    const envelope = built.envelope;
    const envelopeHash = hashCanonical(envelope);
    const snapshot = store.getSnapshot();
    const existing = Object.values(snapshot.queueById).find((item) => item.idempotencyKey === envelope.idempotencyKey);
    if (existing) {
      if (existing.envelopeHash !== envelopeHash) {
        store.mutate((draft) => { draft.metrics.conflicts += 1; return null; });
        return cloneFreeze({ ok: false, status: 'IDEMPOTENCY_CONFLICT', queueId: existing.queueId });
      }
      store.mutate((draft) => { draft.metrics.deduplicated += 1; return null; });
      return cloneFreeze({ ok: true, status: 'DEDUPLICATED', queueId: existing.queueId, record: existing });
    }

    const result = store.mutate((draft) => {
      draft.sequence += 1;
      const queueId = queueIdFor(draft.sequence, envelopeHash);
      const createdAt = now();
      const record = {
        queueId,
        sequence: draft.sequence,
        idempotencyKey: envelope.idempotencyKey,
        envelopeId: envelope.envelopeId,
        envelopeHash,
        envelope,
        state: 'PENDING',
        attemptCount: 0,
        nextAttemptAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        lastError: null,
        originalQueueId: null,
        replayGeneration: 0,
      };
      draft.queueById[queueId] = record;
      draft.queueOrder.push(queueId);
      draft.metrics.enqueued += 1;
      return record;
    });
    return cloneFreeze({ ok: true, status: 'ENQUEUED', queueId: result.result.queueId, record: result.result });
  }

  function selectDueRecord(snapshot) {
    const current = nowMs();
    for (const queueId of snapshot.queueOrder) {
      const record = snapshot.queueById[queueId];
      if (!record) continue;
      if (!['PENDING', 'RETRY_WAIT'].includes(record.state)) continue;
      const due = Date.parse(record.nextAttemptAt);
      if (!Number.isNaN(due) && due <= current) return record;
    }
    return null;
  }

  async function dispatchNext() {
    assertOpen();
    const currentGate = gate();
    if (!currentGate.allowed) return cloneFreeze({ ok: false, status: 'BLOCKED', gate: currentGate });
    if (typeof fetchAdapter !== 'function') return cloneFreeze({ ok: false, status: 'FETCH_ADAPTER_REQUIRED' });
    const candidate = selectDueRecord(store.getSnapshot());
    if (!candidate) return cloneFreeze({ ok: true, status: 'NO_DUE_RECORD' });

    const attemptNumber = candidate.attemptCount + 1;
    store.mutate((draft) => {
      const record = draft.queueById[candidate.queueId];
      record.state = 'IN_FLIGHT';
      record.attemptCount = attemptNumber;
      record.updatedAt = now();
      draft.metrics.dispatchAttempts += 1;
      return null;
    });

    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, configuration.timeoutMs);

    try {
      const endpoint = `${configuration.protocol}://${configuration.host}:${configuration.port}${SCANOPS_RELIABLE_DELIVERY_V1_PATH}`;
      const response = await fetchAdapter(endpoint, {
        method: 'POST',
        headers: Object.freeze({
          'Content-Type': 'application/json',
          'X-Invyra-Bridge-Client': SCANOPS_RELIABLE_DELIVERY_V1_COMPONENT,
          'X-Invyra-Bridge-Phase': SCANOPS_RELIABLE_DELIVERY_V1_PHASE,
          'X-Invyra-Trust-Reference': configuration.pairedProfile.trustReference,
        }),
        body: JSON.stringify(candidate.envelope),
        signal: controller.signal,
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        return finalizeFailure(candidate.queueId, attemptNumber, `HTTP_${response.status}`, retryable, response.status, payload);
      }
      const validation = validateCanonicalReceiptV1(payload, candidate.envelope);
      if (validation.valid !== true || validation.correlated !== true) {
        return finalizeFailure(candidate.queueId, attemptNumber, 'RECEIPT_INVALID', false, response.status, payload);
      }
      const completedAt = now();
      store.mutate((draft) => {
        const record = draft.queueById[candidate.queueId];
        record.state = 'ACKNOWLEDGED';
        record.updatedAt = completedAt;
        record.completedAt = completedAt;
        record.lastError = null;
        draft.receiptsByQueueId[candidate.queueId] = validation.normalizedReceipt;
        draft.metrics.acknowledged += 1;
        return null;
      });
      return cloneFreeze({
        ok: true,
        status: 'ACKNOWLEDGED',
        queueId: candidate.queueId,
        httpStatus: response.status,
        receiptValid: true,
        correlated: true,
        receipt: validation.normalizedReceipt,
      });
    } catch (error) {
      return finalizeFailure(candidate.queueId, attemptNumber, timedOut ? 'TIMEOUT' : 'TRANSPORT_ERROR', true, null, {
        message: error?.message || 'Transport request failed.',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  function finalizeFailure(queueId, attemptNumber, code, retryable, httpStatus, detail) {
    const exhausted = attemptNumber >= configuration.maxAttempts;
    const shouldDeadLetter = !retryable || exhausted;
    const updatedAt = now();
    const result = store.mutate((draft) => {
      const record = draft.queueById[queueId];
      record.updatedAt = updatedAt;
      record.lastError = { code, retryable, httpStatus, detail };
      if (shouldDeadLetter) {
        record.state = 'DEAD_LETTER';
        record.deadLetteredAt = updatedAt;
        draft.deadLetterByQueueId[queueId] = {
          queueId,
          idempotencyKey: record.idempotencyKey,
          envelopeHash: record.envelopeHash,
          reason: code,
          deadLetteredAt: updatedAt,
          replayed: false,
        };
        draft.metrics.deadLettered += 1;
      } else {
        record.state = 'RETRY_WAIT';
        record.nextAttemptAt = new Date(nowMs() + retryDelay(configuration, attemptNumber)).toISOString();
        draft.metrics.retries += 1;
      }
      return record;
    });
    return cloneFreeze({
      ok: false,
      status: shouldDeadLetter ? 'DEAD_LETTER' : 'RETRY_WAIT',
      queueId,
      attemptCount: attemptNumber,
      retryable,
      nextAttemptAt: result.result.nextAttemptAt || null,
      error: result.result.lastError,
    });
  }

  function replayDeadLetter(queueId, reason) {
    assertOpen();
    const replayReason = asString(reason);
    if (replayReason.length < 8) return cloneFreeze({ ok: false, status: 'REPLAY_REASON_REQUIRED' });
    const snapshot = store.getSnapshot();
    const original = snapshot.queueById[queueId];
    const deadLetter = snapshot.deadLetterByQueueId[queueId];
    if (!original || !deadLetter || original.state !== 'DEAD_LETTER') return cloneFreeze({ ok: false, status: 'DEAD_LETTER_NOT_FOUND' });
    if (deadLetter.replayed || snapshot.replayByOriginalQueueId[queueId]) return cloneFreeze({ ok: false, status: 'REPLAY_ALREADY_USED' });

    const result = store.mutate((draft) => {
      draft.sequence += 1;
      const replayQueueId = queueIdFor(draft.sequence, original.envelopeHash);
      const createdAt = now();
      const replayRecord = {
        ...original,
        queueId: replayQueueId,
        sequence: draft.sequence,
        state: 'PENDING',
        attemptCount: 0,
        nextAttemptAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        completedAt: null,
        deadLetteredAt: null,
        lastError: null,
        originalQueueId: queueId,
        replayGeneration: Number(original.replayGeneration || 0) + 1,
        replayReason,
      };
      draft.queueById[replayQueueId] = replayRecord;
      draft.queueOrder.push(replayQueueId);
      draft.deadLetterByQueueId[queueId].replayed = true;
      draft.deadLetterByQueueId[queueId].replayedAt = createdAt;
      draft.replayByOriginalQueueId[queueId] = replayQueueId;
      draft.metrics.manualReplays += 1;
      return replayRecord;
    });
    return cloneFreeze({ ok: true, status: 'REPLAY_ENQUEUED', queueId: result.result.queueId, originalQueueId: queueId });
  }

  function getDiagnostics() {
    const snapshot = store.isOpen() ? store.getSnapshot() : initialState();
    const counts = {};
    for (const record of Object.values(snapshot.queueById || {})) counts[record.state] = (counts[record.state] || 0) + 1;
    return cloneFreeze({
      component: SCANOPS_RELIABLE_DELIVERY_V1_COMPONENT,
      version: SCANOPS_RELIABLE_DELIVERY_V1_VERSION,
      phase: SCANOPS_RELIABLE_DELIVERY_V1_PHASE,
      gate: gate(),
      opened,
      storeFile: configuration.persistenceDirectory ? store.filePath : null,
      counts,
      persistedReceipts: Object.keys(snapshot.receiptsByQueueId || {}).length,
      metrics: snapshot.metrics,
      automaticDispatch: false,
      backgroundWorkerStarted: false,
      automaticReplay: false,
      businessOperationAttempted: false,
      inventoryMutationAttempted: false,
      scanOpsMutationAttempted: false,
      stockMutationAttempted: false,
      ledgerMutationAttempted: false,
      orderMutationAttempted: false,
      itemMasterMutationAttempted: false,
    });
  }

  function close() {
    if (!opened) return cloneFreeze({ closed: false, reason: 'QUEUE_NOT_OPEN' });
    store.close();
    opened = false;
    return cloneFreeze({ closed: true });
  }

  return Object.freeze({
    component: SCANOPS_RELIABLE_DELIVERY_V1_COMPONENT,
    version: SCANOPS_RELIABLE_DELIVERY_V1_VERSION,
    configuration,
    open,
    close,
    enqueueHealthPing,
    dispatchNext,
    replayDeadLetter,
    getDiagnostics,
    getPersistedState: () => store.getSnapshot(),
  });
}
