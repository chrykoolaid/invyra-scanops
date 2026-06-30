import { buildDesktopPairingProfile } from "./scanOpsDesktopPairing";
import { buildBridgeTransportEnvelope, validateBridgeTransportEnvelope } from "./scanOpsBridgeTransport";
import { buildDesktopReceiptEnvelope, validateDesktopReceiptEnvelope, mapDesktopReceiptToQueueStatus, DESKTOP_RECEIPT_STATUSES } from "./scanOpsDesktopListenerContract";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const MOCK_BRIDGE_TEST_STATUSES = {
  PASSED: "passed",
  FAILED: "failed",
};

export function buildMockQueueItem(overrides = {}) {
  return {
    id: overrides.id || makeId("mock_queue"),
    eventType: overrides.eventType || "STOCK_COUNT_LINE_SAVED",
    status: overrides.status || "queued",
    title: overrides.title || "Mock ScanOps queue item",
    summary: overrides.summary || "Bridge mock integration test item",
    payload: overrides.payload || { item_id: "MOCK-ITEM", quantity: 1 },
  };
}

export function runBridgeMockE2EHarness({ session = {}, queueItem, desktopProfile, receiptStatus = DESKTOP_RECEIPT_STATUSES.ACCEPTED } = {}) {
  const profile = desktopProfile || buildDesktopPairingProfile({
    name: "Mock Inventory Desktop",
    host: "mock-inventory-desktop.local",
    port: "8080",
    siteId: session.storeId || "MOCK-STORE",
  });
  const item = queueItem || buildMockQueueItem();
  const envelope = buildBridgeTransportEnvelope({ queueItem: item, desktopProfile: profile, session, mode: "mock_e2e" });
  const envelopeValidation = validateBridgeTransportEnvelope(envelope);
  const receipt = buildDesktopReceiptEnvelope({ transportEnvelope: envelope, status: receiptStatus });
  const receiptValidation = validateDesktopReceiptEnvelope(receipt);
  const mappedQueueStatus = mapDesktopReceiptToQueueStatus(receipt);
  const passed = envelopeValidation.ok && receiptValidation.ok && Boolean(mappedQueueStatus);

  return {
    test_id: makeId("bridge_mock_e2e"),
    status: passed ? MOCK_BRIDGE_TEST_STATUSES.PASSED : MOCK_BRIDGE_TEST_STATUSES.FAILED,
    created_at: nowIso(),
    profile,
    queue_item: item,
    envelope,
    envelope_validation: envelopeValidation,
    receipt,
    receipt_validation: receiptValidation,
    mapped_queue_status: mappedQueueStatus,
    guardrails: {
      live_transport: false,
      inventory_write: false,
      ledger_mutation: false,
      stock_mutation: false,
      price_mutation: false,
    },
  };
}

export function summariseBridgeMockE2EResult(result) {
  return {
    test_id: result?.test_id || null,
    status: result?.status || MOCK_BRIDGE_TEST_STATUSES.FAILED,
    envelope_ok: Boolean(result?.envelope_validation?.ok),
    receipt_ok: Boolean(result?.receipt_validation?.ok),
    mapped_queue_status: result?.mapped_queue_status || "needs_review",
    live_transport: false,
    inventory_write: false,
    stock_mutation: false,
    price_mutation: false,
  };
}
