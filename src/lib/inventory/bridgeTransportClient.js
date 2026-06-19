/**
 * bridgeTransportClient.js — ScanOps Phase 1D-C
 *
 * Transport client for the ScanOps ↔ Inventory Bridge v1 prototype relay.
 *
 * This file is transport-only:
 * - Checks bridge health and capabilities.
 * - Submits already-normalized bridge events to the prototype relay.
 * - Applies returned Inventory receipts through processSyncReceipt().
 * - Does not mutate stock, price, POS, orders, forecasts, Item Master, or workflows.
 *
 * Base44 prototype transport is a cloud relay, NOT a local Wi-Fi/IP LAN bridge.
 * Production LAN transport requires a desktop/local bridge service specified later.
 */

import { base44 } from "@/api/base44Client";
import {
  BRIDGE_CAPABILITIES,
  BRIDGE_ENDPOINT_PATHS,
  BRIDGE_PROTOCOL_VERSION,
  BRIDGE_TRANSPORT_ERROR,
  MAX_BRIDGE_BATCH_SIZE,
  buildBridgeEventBatchRequest,
} from "./bridgeTransportConstants";
import {
  BRIDGE_TRANSPORT_MODE,
  getBridgeConfig,
  isProductionLanSpecConfig,
  isPrototypeCloudRelayConfig,
  normalizeBridgeConfig,
  stampBridgeCapabilitiesResult,
  stampBridgeHealthResult,
  validateBridgeConfig,
} from "./bridgeTransportConfig";
import { getOutboxEvent, updateOutboxEventSyncMeta } from "./storageProvider";
import { processSyncReceipt, replayBridgeOutboxEvents } from "../scanOpsSync";
import { OUTBOX_SYNC_STATUS, buildOutboxSyncMetaPatch } from "../scanopsSyncStatus";

const PROTOTYPE_TRANSPORT_NOTE = "PROTOTYPE CLOUD RELAY — NOT A LOCAL LAN BRIDGE";

function nowIso() {
  return new Date().toISOString();
}

function unwrapFunctionResponse(result) {
  if (result && typeof result === "object") {
    if ("data" in result) return result.data;
    if ("result" in result) return result.result;
  }
  return result;
}

async function invokeBase44Function(functionName, payload = {}) {
  const functions = base44?.functions;
  if (!functions) throw new Error("Base44 functions client is not available.");
  if (typeof functions.invoke === "function") return unwrapFunctionResponse(await functions.invoke(functionName, payload));
  if (typeof functions.call === "function") return unwrapFunctionResponse(await functions.call(functionName, payload));
  if (typeof functions[functionName] === "function") return unwrapFunctionResponse(await functions[functionName](payload));
  throw new Error(`Base44 function invocation is unavailable for ${functionName}.`);
}

function buildLanUrl(config, endpointPath) {
  const normalized = normalizeBridgeConfig(config);
  if (normalized.bridge_base_url) return `${String(normalized.bridge_base_url).replace(/\/$/, "")}${endpointPath}`;
  if (normalized.bridge_host && normalized.bridge_port) return `http://${normalized.bridge_host}:${normalized.bridge_port}${endpointPath}`;
  throw new Error("Production LAN config requires bridge_base_url or bridge_host + bridge_port.");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || `Bridge request failed with ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export function validateBridgeEventBatch(events = []) {
  const errors = [];
  if (!Array.isArray(events)) return { ok: false, errors: ["events must be an array."], events: [] };
  if (events.length > MAX_BRIDGE_BATCH_SIZE) errors.push(`Batch size ${events.length} exceeds MAX_BRIDGE_BATCH_SIZE ${MAX_BRIDGE_BATCH_SIZE}.`);
  for (const event of events) {
    if (!event?.event_id) errors.push("Every bridge event requires event_id.");
    if (!event?.event_type) errors.push(`Event ${event?.event_id || "unknown"} requires event_type.`);
    if (!event?.payload_hash) errors.push(`Event ${event?.event_id || "unknown"} requires payload_hash.`);
  }
  return { ok: errors.length === 0, errors, events };
}

export async function checkBridgeHealth(configOverride = null) {
  const config = normalizeBridgeConfig(configOverride || await getBridgeConfig());
  const validation = validateBridgeConfig(config);
  if (!validation.ok) {
    return {
      ok: false,
      error: BRIDGE_TRANSPORT_ERROR.BRIDGE_UNAVAILABLE,
      errors: validation.errors,
      prototype_transport: config.transport_mode === BRIDGE_TRANSPORT_MODE.PROTOTYPE_CLOUD_RELAY,
      transport_note: PROTOTYPE_TRANSPORT_NOTE,
    };
  }

  try {
    let result;
    if (isPrototypeCloudRelayConfig(config)) {
      result = await invokeBase44Function(config.health_function_name, {
        action: "health",
        bridge_protocol_version: BRIDGE_PROTOCOL_VERSION,
      });
    } else if (isProductionLanSpecConfig(config)) {
      result = await fetchJson(buildLanUrl(config, BRIDGE_ENDPOINT_PATHS.health), { method: "GET" });
    } else {
      throw new Error(`Unsupported bridge transport mode: ${config.transport_mode}`);
    }
    await stampBridgeHealthResult(result || {});
    return { ok: result?.status === "ok", ...result };
  } catch (error) {
    const failure = {
      ok: false,
      status: "unavailable",
      error: BRIDGE_TRANSPORT_ERROR.BRIDGE_UNAVAILABLE,
      message: error.message,
      prototype_transport: isPrototypeCloudRelayConfig(config),
      transport_note: PROTOTYPE_TRANSPORT_NOTE,
    };
    await stampBridgeHealthResult(failure).catch(() => null);
    return failure;
  }
}

export async function fetchBridgeCapabilities(configOverride = null) {
  const config = normalizeBridgeConfig(configOverride || await getBridgeConfig());
  const validation = validateBridgeConfig(config);
  if (!validation.ok) return { ok: false, errors: validation.errors, capabilities: {} };

  try {
    let result;
    if (isPrototypeCloudRelayConfig(config)) {
      result = await invokeBase44Function(config.capabilities_function_name || config.health_function_name, {
        action: "capabilities",
        bridge_protocol_version: BRIDGE_PROTOCOL_VERSION,
      });
      result = result?.capabilities_detail || result;
    } else if (isProductionLanSpecConfig(config)) {
      result = await fetchJson(buildLanUrl(config, BRIDGE_ENDPOINT_PATHS.capabilities), { method: "GET" });
    } else {
      throw new Error(`Unsupported bridge transport mode: ${config.transport_mode}`);
    }
    await stampBridgeCapabilitiesResult(result || {});
    return { ok: true, ...result };
  } catch (error) {
    const failure = {
      ok: false,
      error: BRIDGE_TRANSPORT_ERROR.BRIDGE_UNAVAILABLE,
      message: error.message,
      capabilities: {},
    };
    await stampBridgeCapabilitiesResult(failure).catch(() => null);
    return failure;
  }
}

export function bridgeCapabilitiesAllowMarkdownSync(capabilitiesResponse = {}) {
  const capabilities = capabilitiesResponse.capabilities || {};
  if (Array.isArray(capabilitiesResponse.capabilities)) {
    return capabilitiesResponse.capabilities.includes(BRIDGE_CAPABILITIES.scanops_markdown_sync)
      && capabilitiesResponse.capabilities.includes(BRIDGE_CAPABILITIES.receipt_return);
  }
  return capabilities[BRIDGE_CAPABILITIES.scanops_markdown_sync] === true
    && capabilities[BRIDGE_CAPABILITIES.receipt_return] === true;
}

export async function submitBridgeEvents(configOverride = null, events = []) {
  const config = normalizeBridgeConfig(configOverride || await getBridgeConfig());
  const validation = validateBridgeConfig(config);
  if (!validation.ok) return { ok: false, receipts: [], errors: validation.errors };

  const batchValidation = validateBridgeEventBatch(events);
  if (!batchValidation.ok) {
    return {
      ok: false,
      error: BRIDGE_TRANSPORT_ERROR.BATCH_SIZE_EXCEEDED,
      receipts: [],
      errors: batchValidation.errors,
      prototype_transport: isPrototypeCloudRelayConfig(config),
      transport_note: PROTOTYPE_TRANSPORT_NOTE,
    };
  }

  const firstEvent = events[0] || {};
  const request = buildBridgeEventBatchRequest({
    bridge_protocol_version: BRIDGE_PROTOCOL_VERSION,
    source_device_id: firstEvent.source_device_id || config.device_id || null,
    source_session_id: firstEvent.source_session_id || null,
    submitted_at: nowIso(),
    events,
  });

  if (isPrototypeCloudRelayConfig(config)) {
    const result = await invokeBase44Function(config.relay_function_name, request);
    return {
      ok: !result?.error,
      ...result,
      receipts: Array.isArray(result?.receipts) ? result.receipts : [],
      prototype_transport: true,
      transport_note: result?.transport_note || PROTOTYPE_TRANSPORT_NOTE,
    };
  }

  if (isProductionLanSpecConfig(config)) {
    const result = await fetchJson(buildLanUrl(config, BRIDGE_ENDPOINT_PATHS.events), {
      method: "POST",
      body: JSON.stringify(request),
    });
    return { ok: !result?.error, ...result, receipts: Array.isArray(result?.receipts) ? result.receipts : [] };
  }

  return { ok: false, receipts: [], errors: [`Unsupported bridge transport mode: ${config.transport_mode}`] };
}

export async function applyBridgeReceipts(receipts = []) {
  const results = [];
  for (const receipt of Array.isArray(receipts) ? receipts : []) {
    results.push(await processSyncReceipt(receipt));
  }
  return { ok: results.every((result) => result.ok), results };
}

async function markEventsFailedRetryable(events = [], reason = "Bridge transport failed.") {
  const results = [];
  for (const event of events) {
    if (!event?.event_id) continue;
    try {
      await updateOutboxEventSyncMeta(event.event_id, buildOutboxSyncMetaPatch({
        sync_status: OUTBOX_SYNC_STATUS.FAILED_RETRYABLE,
        last_error_code: BRIDGE_TRANSPORT_ERROR.BRIDGE_UNAVAILABLE,
        last_error_message: reason,
      }));
      results.push({ event_id: event.event_id, ok: true });
    } catch (error) {
      results.push({ event_id: event.event_id, ok: false, error: error.message });
    }
  }
  return results;
}

export async function submitEligibleBridgeOutboxEvents(configOverride = null) {
  const config = normalizeBridgeConfig(configOverride || await getBridgeConfig());
  const health = await checkBridgeHealth(config);
  if (!health.ok) return { ok: false, phase: "health", health, submitted: 0, receipts: [], receipt_results: [] };

  const capabilities = await fetchBridgeCapabilities(config);
  if (!capabilities.ok || !bridgeCapabilitiesAllowMarkdownSync(capabilities)) {
    return {
      ok: false,
      phase: "capabilities",
      capabilities,
      submitted: 0,
      receipts: [],
      receipt_results: [],
      error: BRIDGE_TRANSPORT_ERROR.CAPABILITY_NOT_SUPPORTED,
    };
  }

  const replay = await replayBridgeOutboxEvents();
  const eventIds = (replay.queued || []).map((entry) => entry.event_id).filter(Boolean).slice(0, MAX_BRIDGE_BATCH_SIZE);
  const events = (await Promise.all(eventIds.map((eventId) => getOutboxEvent(eventId))))
    .filter(Boolean)
    .filter((event) => event.sync_status === OUTBOX_SYNC_STATUS.SENDING);

  if (!events.length) return { ok: replay.ok, phase: "replay", replay, submitted: 0, receipts: [], receipt_results: [] };

  try {
    const response = await submitBridgeEvents(config, events);
    const receiptApplication = await applyBridgeReceipts(response.receipts || []);
    return {
      ok: response.ok !== false && receiptApplication.ok,
      phase: "submitted",
      replay,
      response,
      submitted: events.length,
      receipts: response.receipts || [],
      receipt_results: receiptApplication.results,
    };
  } catch (error) {
    const retryableMarks = await markEventsFailedRetryable(events, error.message || "Bridge transport failed.");
    return {
      ok: false,
      phase: "submit_failed",
      replay,
      submitted: events.length,
      receipts: [],
      receipt_results: [],
      retryable_marks: retryableMarks,
      error: error.message,
    };
  }
}
