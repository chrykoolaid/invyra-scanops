import { buildCanonicalEnvelopeV1, validateCanonicalReceiptV1 } from '../../canonicalAdapter/v1/index.js';
import { createAtomicJsonStoreV1 } from '../../reliableDelivery/v1/atomicJsonStoreV1.js';
import {
  COUNT_OPERATION,
  SCANOPS_COUNT_HANDOFF_V1_COMPONENT,
  SCANOPS_COUNT_HANDOFF_V1_PHASE,
  SCANOPS_COUNT_HANDOFF_V1_VERSION,
  asString,
  buildEndpoint,
  clone,
  cloneFreeze,
  evaluateGate,
  hashCanonical,
  initialState,
  normalizeConfiguration,
  parseResponseJson,
  retryDelay,
  validatePayload,
} from './scanOpsCountHandoffV1Shared.js';

export function createScanOpsCountSubmissionQueueV1(options = {}) {
  const configuration = normalizeConfiguration(options);
  const fetchAdapter = options.fetchAdapter || globalThis.fetch;
  const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  const store = createAtomicJsonStoreV1({
    directory: configuration.persistenceDirectory || '.',
    fileName: 'scanops-count-handoff-v1.json',
    initialState: initialState(),
  });

  function nowMs() {
    const parsed = Date.parse(now());
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }

  function open() {
    const gate = evaluateGate(configuration, nowMs());
    if (!gate.allowed) return cloneFreeze({ opened: false, reason: 'RUNTIME_GATE_BLOCKED', gate });
    const result = store.open();
    if (result.opened) {
      store.mutate((draft) => {
        let recovered = 0;
        for (const record of Object.values(draft.queueByIdempotencyKey || {})) {
          if (record.status === 'IN_FLIGHT') {
            record.status = 'RETRY_WAIT';
            record.nextAttemptAt = now();
            record.lastError = 'RECOVERED_AFTER_PROCESS_RESTART';
            recovered += 1;
          }
        }
        draft.metrics.recoveredInflight += recovered;
        return { recovered };
      });
    }
    return cloneFreeze({ opened: result.opened, filePath: result.filePath, gate, diagnostics: getDiagnostics() });
  }

  function close() {
    return cloneFreeze(store.close());
  }

  function getSnapshotSafe() {
    return store.isOpen() ? store.getSnapshot() : initialState();
  }

  function getDiagnostics() {
    const snapshot = getSnapshotSafe();
    const records = Object.values(snapshot.queueByIdempotencyKey || {});
    return cloneFreeze({
      component: SCANOPS_COUNT_HANDOFF_V1_COMPONENT,
      version: SCANOPS_COUNT_HANDOFF_V1_VERSION,
      phase: SCANOPS_COUNT_HANDOFF_V1_PHASE,
      gate: evaluateGate(configuration, nowMs()),
      storeOpen: store.isOpen(),
      storeFile: configuration.persistenceDirectory ? store.filePath : null,
      endpoint: buildEndpoint(configuration),
      totalQueueRecords: records.length,
      queued: records.filter((record) => record.status === 'QUEUED').length,
      retryWait: records.filter((record) => record.status === 'RETRY_WAIT').length,
      acknowledged: records.filter((record) => record.status === 'ACKNOWLEDGED').length,
      rejected: records.filter((record) => record.status === 'REJECTED').length,
      deadLettered: records.filter((record) => record.status === 'DEAD_LETTER').length,
      persistedReceipts: Object.keys(snapshot.receiptByIdempotencyKey || {}).length,
      persistedDeadLetters: Object.keys(snapshot.deadLetterByIdempotencyKey || {}).length,
      persistedMetrics: snapshot.metrics,
      automaticDispatch: false,
      backgroundWorkerStarted: false,
      automaticReplay: false,
      businessOperationApplied: false,
      inventoryMutationAttempted: false,
      scanOpsMutationAttempted: false,
      stockMutationAttempted: false,
      ledgerMutationAttempted: false,
      itemMasterMutationAttempted: false,
    });
  }

  function enqueueCountSubmission(input = {}) {
    if (!store.isOpen()) return cloneFreeze({ ok: false, status: 'BLOCKED', reason: 'STORE_NOT_OPEN' });
    const gate = evaluateGate(configuration, nowMs());
    if (!gate.allowed) return cloneFreeze({ ok: false, status: 'BLOCKED', reason: 'RUNTIME_GATE_BLOCKED', gate });
    const payloadValidation = validatePayload(input.payload);
    if (!payloadValidation.valid) return cloneFreeze({ ok: false, status: 'INVALID', errors: payloadValidation.errors });

    const profile = configuration.pairedProfile;
    const built = buildCanonicalEnvelopeV1({
      envelopeId: input.envelopeId,
      idempotencyKey: input.idempotencyKey,
      traceId: input.traceId,
      operationType: COUNT_OPERATION,
      occurredAt: input.occurredAt,
      environment: configuration.environment,
      source: {
        deviceId: profile.deviceId,
        storeId: profile.storeId,
        sessionId: asString(input.sessionId || profile.sessionId),
        operatorId: input.operatorId,
      },
      target: { inventoryInstanceId: profile.inventoryInstanceId },
      payload: payloadValidation.normalized,
    });
    if (built.ok !== true) return cloneFreeze({ ok: false, status: 'INVALID', errors: built.errors });

    const idempotencyKey = built.envelope.idempotencyKey;
    const envelopeHash = hashCanonical(built.envelope);
    const snapshot = store.getSnapshot();
    const existing = snapshot.queueByIdempotencyKey[idempotencyKey];
    if (existing) {
      if (existing.envelopeHash !== envelopeHash) {
        return cloneFreeze({ ok: false, status: 'CONFLICT', reason: 'IDEMPOTENCY_CONFLICT', existingEnvelopeId: existing.envelope.envelopeId });
      }
      store.mutate((draft) => { draft.metrics.duplicates += 1; return null; });
      return cloneFreeze({ ok: true, status: 'DUPLICATE', record: existing });
    }

    const createdAt = now();
    const record = {
      queueId: `count-queue:${hashCanonical({ idempotencyKey }).slice(0, 32)}`,
      idempotencyKey,
      envelopeHash,
      envelope: clone(built.envelope),
      status: 'QUEUED',
      attempts: 0,
      createdAt,
      updatedAt: createdAt,
      nextAttemptAt: createdAt,
      lastError: null,
      receiptId: null,
      manualReplayCount: 0,
      replayOfIdempotencyKey: null,
    };
    store.mutate((draft) => {
      draft.queueByIdempotencyKey[idempotencyKey] = record;
      draft.metrics.enqueued += 1;
      return null;
    });
    return cloneFreeze({ ok: true, status: 'ENQUEUED', record });
  }

  function nextDispatchable(snapshot) {
    const currentMs = nowMs();
    return Object.values(snapshot.queueByIdempotencyKey || {})
      .filter((record) => record.status === 'QUEUED'
        || (record.status === 'RETRY_WAIT' && Date.parse(record.nextAttemptAt) <= currentMs))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] || null;
  }

  function persistTerminal(record, status, receipt = null, lastError = null) {
    store.mutate((draft) => {
      const target = draft.queueByIdempotencyKey[record.idempotencyKey];
      target.status = status;
      target.updatedAt = now();
      target.lastError = lastError;
      if (receipt) {
        target.receiptId = receipt.receiptId;
        draft.receiptByIdempotencyKey[record.idempotencyKey] = clone(receipt);
      }
      if (status === 'ACKNOWLEDGED') draft.metrics.acknowledged += 1;
      if (status === 'REJECTED') draft.metrics.rejected += 1;
      return null;
    });
  }

  function persistFailure(record, errorMessage) {
    const attemptedAt = now();
    const result = store.mutate((draft) => {
      const target = draft.queueByIdempotencyKey[record.idempotencyKey];
      const attempts = target.attempts;
      target.updatedAt = attemptedAt;
      target.lastError = errorMessage;
      if (attempts >= configuration.maxAttempts) {
        target.status = 'DEAD_LETTER';
        target.nextAttemptAt = null;
        draft.deadLetterByIdempotencyKey[record.idempotencyKey] = {
          idempotencyKey: record.idempotencyKey,
          envelope: clone(target.envelope),
          envelopeHash: target.envelopeHash,
          attempts,
          deadLetteredAt: attemptedAt,
          reason: errorMessage,
          replayed: false,
        };
        draft.metrics.deadLettered += 1;
        return { status: 'DEAD_LETTER' };
      }
      target.status = 'RETRY_WAIT';
      target.nextAttemptAt = new Date(Date.parse(attemptedAt) + retryDelay(configuration, attempts)).toISOString();
      draft.metrics.retryScheduled += 1;
      return { status: 'RETRY_WAIT', nextAttemptAt: target.nextAttemptAt };
    });
    return result.result;
  }

  async function dispatchNext() {
    if (!store.isOpen()) return cloneFreeze({ ok: false, status: 'BLOCKED', reason: 'STORE_NOT_OPEN' });
    const gate = evaluateGate(configuration, nowMs());
    if (!gate.allowed) return cloneFreeze({ ok: false, status: 'BLOCKED', reason: 'RUNTIME_GATE_BLOCKED', gate });
    if (typeof fetchAdapter !== 'function') return cloneFreeze({ ok: false, status: 'BLOCKED', reason: 'FETCH_ADAPTER_REQUIRED' });
    const record = nextDispatchable(store.getSnapshot());
    if (!record) return cloneFreeze({ ok: true, status: 'IDLE' });

    store.mutate((draft) => {
      const target = draft.queueByIdempotencyKey[record.idempotencyKey];
      target.status = 'IN_FLIGHT';
      target.attempts += 1;
      target.updatedAt = now();
      return null;
    });
    const current = store.getSnapshot().queueByIdempotencyKey[record.idempotencyKey];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), configuration.timeoutMs);

    try {
      const response = await fetchAdapter(buildEndpoint(configuration), {
        method: 'POST',
        headers: Object.freeze({
          'Content-Type': 'application/json',
          'X-Invyra-Bridge-Client': SCANOPS_COUNT_HANDOFF_V1_COMPONENT,
          'X-Invyra-Bridge-Phase': SCANOPS_COUNT_HANDOFF_V1_PHASE,
        }),
        body: JSON.stringify(current.envelope),
        signal: controller.signal,
      });
      const payload = await parseResponseJson(response);
      const receiptValidation = validateCanonicalReceiptV1(payload, current.envelope);

      if (receiptValidation.valid === true && receiptValidation.correlated === true) {
        if (response.ok && payload.admissionStatus === 'ACCEPTED' && payload.applicationStatus === 'STAGED') {
          persistTerminal(current, 'ACKNOWLEDGED', payload);
          return cloneFreeze({ ok: true, status: 'ACKNOWLEDGED', httpStatus: response.status, receipt: payload, receiptValid: true, correlated: true });
        }
        if (!response.ok && payload.admissionStatus !== 'ACCEPTED') {
          persistTerminal(current, 'REJECTED', payload, payload.errors?.[0]?.code || 'COUNT_SUBMISSION_REJECTED');
          return cloneFreeze({ ok: false, status: 'REJECTED', httpStatus: response.status, receipt: payload, receiptValid: true, correlated: true, retryScheduled: false });
        }
      }

      if (response.status >= 400 && response.status < 500) {
        persistTerminal(current, 'REJECTED', null, 'NON_RETRYABLE_HTTP_RESPONSE');
        return cloneFreeze({ ok: false, status: 'REJECTED', httpStatus: response.status, receiptValid: false, correlated: false, retryScheduled: false });
      }

      const failure = persistFailure(current, `HTTP_${response.status}_OR_INVALID_RECEIPT`);
      return cloneFreeze({ ok: false, ...failure, httpStatus: response.status, receiptValid: receiptValidation.valid, correlated: receiptValidation.correlated });
    } catch (error) {
      const failure = persistFailure(current, error?.name === 'AbortError' ? 'REQUEST_TIMEOUT' : 'TRANSPORT_UNAVAILABLE');
      return cloneFreeze({ ok: false, ...failure, timeoutTriggered: error?.name === 'AbortError' });
    } finally {
      clearTimeout(timeout);
    }
  }

  function manualReplay(idempotencyKey, reason) {
    if (!store.isOpen()) return cloneFreeze({ ok: false, status: 'BLOCKED', reason: 'STORE_NOT_OPEN' });
    const normalizedKey = asString(idempotencyKey);
    const normalizedReason = asString(reason);
    if (!normalizedReason) return cloneFreeze({ ok: false, status: 'INVALID', reason: 'REPLAY_REASON_REQUIRED' });
    const snapshot = store.getSnapshot();
    const deadLetter = snapshot.deadLetterByIdempotencyKey[normalizedKey];
    if (!deadLetter) return cloneFreeze({ ok: false, status: 'NOT_FOUND' });
    if (deadLetter.replayed === true) return cloneFreeze({ ok: false, status: 'BLOCKED', reason: 'MANUAL_REPLAY_ALREADY_USED' });

    const replayKey = `${normalizedKey}:manual-replay:1`;
    const envelope = clone(deadLetter.envelope);
    envelope.idempotencyKey = replayKey;
    envelope.envelopeId = `${envelope.envelopeId}:manual-replay:1`;
    envelope.traceId = `${envelope.traceId}:manual-replay:1`;
    const createdAt = now();
    const record = {
      queueId: `count-queue:${hashCanonical({ idempotencyKey: replayKey }).slice(0, 32)}`,
      idempotencyKey: replayKey,
      envelopeHash: hashCanonical(envelope),
      envelope,
      status: 'QUEUED',
      attempts: 0,
      createdAt,
      updatedAt: createdAt,
      nextAttemptAt: createdAt,
      lastError: null,
      receiptId: null,
      manualReplayCount: 1,
      replayOfIdempotencyKey: normalizedKey,
      replayReason: normalizedReason,
    };
    store.mutate((draft) => {
      draft.deadLetterByIdempotencyKey[normalizedKey].replayed = true;
      draft.deadLetterByIdempotencyKey[normalizedKey].replayReason = normalizedReason;
      draft.deadLetterByIdempotencyKey[normalizedKey].replayIdempotencyKey = replayKey;
      draft.queueByIdempotencyKey[replayKey] = record;
      draft.metrics.manualReplays += 1;
      draft.metrics.enqueued += 1;
      return null;
    });
    return cloneFreeze({ ok: true, status: 'REPLAY_QUEUED', record });
  }

  return Object.freeze({
    open,
    close,
    enqueueCountSubmission,
    dispatchNext,
    manualReplay,
    getDiagnostics,
    getSnapshot: () => cloneFreeze(getSnapshotSafe()),
    getRecord: (idempotencyKey) => cloneFreeze(getSnapshotSafe().queueByIdempotencyKey?.[asString(idempotencyKey)] || null),
  });
}
