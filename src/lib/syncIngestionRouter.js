/**
 * syncIngestionRouter.js — Phase 1C-E
 *
 * Safe review queue routing for ScanOps markdown bridge events.
 *
 * Responsibility: create MarkdownSyncReviewQueue records for eligible
 * ingestion decisions, and update linked_workflow_ref on the
 * InventorySyncInboundEvent and InventorySyncReceipt records.
 *
 * HARD RULES — enforced permanently:
 *   - No StockMovement creation.
 *   - No Item Master pricing mutation.
 *   - No POSLineItem creation.
 *   - No purchase order creation or mutation.
 *   - No forecasting calls.
 *   - No multi-location sync logic.
 *   - No markdown price activation.
 *   - No MarkdownRound creation.
 *   - No wastage posting.
 *   - No stock deduction.
 *   - ScanOps events are evidence/request records only.
 *   - Inventory remains source-of-truth.
 *
 * Creating a MarkdownSyncReviewQueue record is NOT an operational mutation.
 * It is a review/holding record — mutation_performed is always false.
 */

import { base44 } from "@/api/base44Client";
import { SCANOPS_BRIDGE_EVENT_TYPES, INVENTORY_SYNC_RECEIPT_STATUS } from "./syncIngestionConstants";

// ── Routing eligibility ───────────────────────────────────────────────────────

/**
 * Receipt statuses that are eligible for review queue routing.
 * All others (REJECTED_*, FAILED_*, QUARANTINED, ACK_DUPLICATE) must NOT route.
 */
const ROUTE_ELIGIBLE_STATUSES = new Set([
  INVENTORY_SYNC_RECEIPT_STATUS.ACK_RECEIVED,
  INVENTORY_SYNC_RECEIPT_STATUS.ACK_PROCESSED,
  INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW,
]);

/**
 * Determine whether an ingestion decision is eligible for review routing.
 *
 * @param {string} receiptStatus — from INVENTORY_SYNC_RECEIPT_STATUS
 * @returns {boolean}
 */
export function isRouteEligible(receiptStatus) {
  return ROUTE_ELIGIBLE_STATUSES.has(receiptStatus);
}

// ── Event-type routing defaults ───────────────────────────────────────────────

/**
 * Map each event type to its default review queue status and review_reason.
 *
 * scanops.markdown.requested  → PENDING_REVIEW  (needs review before any Inventory action)
 * scanops.markdown.approved   → HELD_FOR_REVIEW (approval must not activate price without review)
 * scanops.markdown.returned   → HELD_FOR_REVIEW (return evidence needs review)
 * scanops.markdown.rejected   → PENDING_REVIEW  (rejection evidence retained for audit/follow-up)
 * scanops.markdown.handoff.created → HELD_FOR_REVIEW (handoff depends on prior events)
 *
 * IMPORTANT: These statuses describe the REVIEW record, not Inventory state.
 * None of these trigger stock, price, POS, order, or forecast changes.
 */
const EVENT_TYPE_ROUTING_DEFAULTS = {
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_REQUESTED]: {
    review_status: "PENDING_REVIEW",
    review_reason: "MARKDOWN_REQUEST_FROM_SCANOPS",
  },
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_APPROVED]: {
    review_status: "HELD_FOR_REVIEW",
    review_reason: "SCANOPS_MARKDOWN_APPROVAL_REQUIRES_INVENTORY_REVIEW",
  },
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_RETURNED]: {
    review_status: "HELD_FOR_REVIEW",
    review_reason: "SCANOPS_MARKDOWN_RETURN_REQUIRES_REVIEW",
  },
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_REJECTED]: {
    // markdown.rejected with ACK_PROCESSED: still create a record for audit trail.
    // review is informational — no action required, but evidence is preserved.
    review_status: "PENDING_REVIEW",
    review_reason: "SCANOPS_MARKDOWN_REJECTION_RECEIVED",
  },
  [SCANOPS_BRIDGE_EVENT_TYPES.MARKDOWN_HANDOFF]: {
    review_status: "HELD_FOR_REVIEW",
    review_reason: "SCANOPS_HANDOFF_REQUIRES_REVIEW",
  },
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Idempotency guard ─────────────────────────────────────────────────────────

/**
 * Check whether a MarkdownSyncReviewQueue record already exists for this ingestion_id.
 * Routing must be idempotent — one review record per ingestion_id.
 *
 * @param {string} ingestion_id
 * @returns {Promise<object|null>} Existing record or null
 */
async function findExistingReviewRecord(ingestion_id) {
  const existing = await base44.entities.MarkdownSyncReviewQueue.filter({ ingestion_id }).catch(() => []);
  return existing?.[0] || null;
}

// ── Review queue record builder ───────────────────────────────────────────────

/**
 * Build a MarkdownSyncReviewQueue record from event and ingestion context.
 * Extracts safe, compact payload fields for the review surface.
 * Never stores raw_event_json — that stays on InventorySyncInboundEvent.
 *
 * @param {object} event — ScanOps bridge event envelope
 * @param {object} ctx   — { ingestion_id, receipt_status, decision_code, decision_reason }
 * @returns {object} Review queue record (not yet persisted)
 */
function buildReviewRecord(event, ctx) {
  const p = event?.payload || {};
  const defaults = EVENT_TYPE_ROUTING_DEFAULTS[event.event_type] || {
    review_status: "PENDING_REVIEW",
    review_reason: "UNKNOWN_EVENT_TYPE_REVIEW",
  };

  // For HELD_FOR_REVIEW receipts, preserve the held status on the review record too
  const review_status = ctx.receipt_status === INVENTORY_SYNC_RECEIPT_STATUS.HELD_FOR_REVIEW
    ? "HELD_FOR_REVIEW"
    : defaults.review_status;

  return {
    review_id:                makeId("rev"),
    ingestion_id:             ctx.ingestion_id,
    event_id:                 event.event_id,
    event_type:               event.event_type,
    source_system:            event.source_system || "scanops",
    source_device_id:         event.source_device_id || null,
    source_session_id:        event.source_session_id || null,
    source_user_id:           event.source_user_id || null,
    source_user_role:         event.source_user_role || null,
    inventory_snapshot_ref:   event.inventory_snapshot_ref || null,
    inventory_snapshot_hash:  event.inventory_snapshot_hash || null,
    inventory_record_version: event.inventory_record_version || null,
    payload_hash:             event.payload_hash,
    status:                   review_status,
    review_reason:            defaults.review_reason,
    decision_code:            ctx.decision_code || null,
    decision_reason:          ctx.decision_reason || null,
    // Compact payload evidence — display only, not for business logic
    sku:                      p.sku || null,
    barcode:                  p.barcode || null,
    item_name_snapshot:       p.itemName || p.item_name || null,
    markdown_request_ref:     p.markdown_request_ref || null,
    markdown_batch_ref:       p.markdown_batch_ref || null,
    markdown_round_ref:       p.markdown_round_ref || null,
    quantity:                 p.quantity != null ? Number(p.quantity) : null,
    discount_percent:         p.selectedMarkdownPercent != null ? Number(p.selectedMarkdownPercent) : null,
    reason_code:              p.reasonCode || null,
    linked_inbound_event_ref: ctx.ingestion_id,
    created_at:               nowIso(),
    updated_at:               nowIso(),
  };
}

// ── Linked reference updaters ─────────────────────────────────────────────────

/**
 * Update InventorySyncInboundEvent.linked_inventory_workflow_ref after routing.
 * Only updates this one safe sync field — no other ledger fields are touched.
 *
 * @param {string} ingestion_id
 * @param {string} review_id
 */
async function updateLedgerWorkflowRef(ingestion_id, review_id) {
  const records = await base44.entities.InventorySyncInboundEvent.filter({ ingestion_id }).catch(() => []);
  const record = records?.[0];
  if (!record?.id) return;
  await base44.entities.InventorySyncInboundEvent.update(record.id, {
    linked_inventory_workflow_ref: review_id,
  }).catch(() => null);
}

/**
 * Update InventorySyncReceipt.linked_workflow_ref after routing.
 * Only updates this one safe sync field — no other receipt fields are touched.
 *
 * @param {string} ingestion_id
 * @param {string} review_id
 */
async function updateReceiptWorkflowRef(ingestion_id, review_id) {
  const receipts = await base44.entities.InventorySyncReceipt.filter({ ingestion_id }).catch(() => []);
  const receipt = receipts?.[0];
  if (!receipt?.id) return;
  await base44.entities.InventorySyncReceipt.update(receipt.id, {
    linked_workflow_ref: review_id,
  }).catch(() => null);
}

// ── Main routing function ─────────────────────────────────────────────────────

/**
 * Route an eligible ScanOps bridge event to the MarkdownSyncReviewQueue.
 *
 * Behaviour:
 *   - Checks route eligibility based on receipt status.
 *   - Guards against duplicate routing via ingestion_id idempotency check.
 *   - Creates one MarkdownSyncReviewQueue record.
 *   - Updates linked_inventory_workflow_ref on InventorySyncInboundEvent.
 *   - Updates linked_workflow_ref on InventorySyncReceipt.
 *   - Returns a structured routing result.
 *
 * Does NOT mutate: stock, pricing, POS, orders, forecasts, Item Master.
 * mutation_performed is always false — review record creation is not an
 * operational mutation.
 *
 * @param {object} event    — ScanOps bridge event envelope
 * @param {object} decision — { ingestion_id, status (receipt status), decision_code, decision_reason }
 * @returns {Promise<{ routed: boolean, route_type?: string, linked_workflow_ref?: string, mutation_performed: boolean, reason?: string }>}
 */
export async function routeToMarkdownSyncReviewQueue(event, decision) {
  const { ingestion_id, status: receipt_status, decision_code, decision_reason } = decision;

  // ── Eligibility check ─────────────────────────────────────────────────────
  if (!isRouteEligible(receipt_status)) {
    return {
      routed: false,
      reason: "NOT_ELIGIBLE_FOR_REVIEW_ROUTING",
      mutation_performed: false,
    };
  }

  // ── Idempotency guard ─────────────────────────────────────────────────────
  const existing = await findExistingReviewRecord(ingestion_id);
  if (existing) {
    // Already routed — return reference to the existing record without creating a duplicate
    return {
      routed: true,
      route_type: "MARKDOWN_SYNC_REVIEW",
      linked_workflow_ref: existing.review_id,
      mutation_performed: false,
      _idempotent: true,
    };
  }

  // ── Create review queue record ────────────────────────────────────────────
  const reviewRecord = buildReviewRecord(event, {
    ingestion_id,
    receipt_status,
    decision_code,
    decision_reason,
  });

  let persisted;
  try {
    persisted = await base44.entities.MarkdownSyncReviewQueue.create(reviewRecord);
  } catch {
    // If persistence fails, return non-routed so caller can log
    return {
      routed: false,
      reason: "REVIEW_QUEUE_PERSIST_FAILED",
      mutation_performed: false,
    };
  }

  const review_id = persisted?.review_id || reviewRecord.review_id;

  // ── Update ledger and receipt workflow refs (best-effort, non-fatal) ──────
  await Promise.all([
    updateLedgerWorkflowRef(ingestion_id, review_id),
    updateReceiptWorkflowRef(ingestion_id, review_id),
  ]);

  return {
    routed: true,
    route_type: "MARKDOWN_SYNC_REVIEW",
    linked_workflow_ref: review_id,
    mutation_performed: false, // Review record is not an operational mutation
  };
}