export const DESKTOP_LISTENER_CONTRACT_VERSION = "scanops-desktop-listener-v1";

export const DESKTOP_LISTENER_ENDPOINTS = {
  HEALTH: "/scanops/health",
  HANDOFF: "/scanops/handoff",
  RECEIPT: "/scanops/receipt/:envelopeId",
};

export const DESKTOP_RECEIPT_STATUSES = {
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  NEEDS_REVIEW: "needs_review",
  DUPLICATE: "duplicate",
  CONFLICT: "conflict",
  UNAVAILABLE: "unavailable",
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDesktopHealthRequest({ session, desktopProfile } = {}) {
  return {
    contract_version: DESKTOP_LISTENER_CONTRACT_VERSION,
    request_id: makeId("desktop_health"),
    created_at: nowIso(),
    device_id: session?.deviceId || session?.scannerId || "SCANOPS-DEVICE",
    bridge_id: desktopProfile?.bridge_id || desktopProfile?.id || null,
    host: desktopProfile?.host || "Not paired",
    guardrails: {
      inventory_write: false,
      ledger_mutation: false,
      stock_mutation: false,
      price_mutation: false,
    },
  };
}

export function buildDesktopReceiptEnvelope({ transportEnvelope, status = DESKTOP_RECEIPT_STATUSES.ACCEPTED, reason = null } = {}) {
  return {
    contract_version: DESKTOP_LISTENER_CONTRACT_VERSION,
    receipt_id: makeId("desktop_receipt"),
    envelope_id: transportEnvelope?.envelope_id || null,
    queue_id: transportEnvelope?.payload?.queue_id || null,
    event_type: transportEnvelope?.payload?.event_type || null,
    status,
    reason,
    created_at: nowIso(),
    desktop: {
      bridge_id: transportEnvelope?.destination?.bridge_id || null,
      bridge_name: transportEnvelope?.destination?.bridge_name || "Inventory Desktop",
    },
    posting: {
      inventory_posted: false,
      ledger_posted: false,
      stock_mutated: false,
      price_mutated: false,
      requires_desktop_review: status !== DESKTOP_RECEIPT_STATUSES.ACCEPTED,
    },
  };
}

export function validateDesktopReceiptEnvelope(receipt) {
  const errors = [];
  if (!receipt?.receipt_id) errors.push("Missing receipt_id");
  if (!receipt?.envelope_id) errors.push("Missing envelope_id");
  if (!receipt?.queue_id) errors.push("Missing queue_id");
  if (receipt?.contract_version !== DESKTOP_LISTENER_CONTRACT_VERSION) errors.push("Unsupported listener contract version");
  if (!Object.values(DESKTOP_RECEIPT_STATUSES).includes(receipt?.status)) errors.push("Unsupported receipt status");
  const posting = receipt?.posting || {};
  if (posting.stock_mutated || posting.price_mutated) errors.push("Receipt cannot report handheld stock or price mutation");
  return {
    ok: errors.length === 0,
    errors,
    checked_at: nowIso(),
  };
}

export function mapDesktopReceiptToQueueStatus(receipt) {
  switch (receipt?.status) {
    case DESKTOP_RECEIPT_STATUSES.ACCEPTED:
      return "synced";
    case DESKTOP_RECEIPT_STATUSES.DUPLICATE:
      return "duplicate";
    case DESKTOP_RECEIPT_STATUSES.CONFLICT:
      return "conflict";
    case DESKTOP_RECEIPT_STATUSES.NEEDS_REVIEW:
      return "needs_review";
    case DESKTOP_RECEIPT_STATUSES.REJECTED:
      return "sync_failed";
    case DESKTOP_RECEIPT_STATUSES.UNAVAILABLE:
      return "sync_failed";
    default:
      return "needs_review";
  }
}
