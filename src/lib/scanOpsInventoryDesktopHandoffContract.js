export const INVENTORY_DESKTOP_HANDOFF_SCHEMA_VERSION = "SCANOPS_INVENTORY_DESKTOP_HANDOFF_V1";

export const INVENTORY_DESKTOP_HANDOFF_STATES = Object.freeze({
  NOT_HANDOFF_ELIGIBLE: "NOT_HANDOFF_ELIGIBLE",
  HANDOFF_DRAFT: "HANDOFF_DRAFT",
  HANDOFF_BLOCKED: "HANDOFF_BLOCKED",
  HANDOFF_REVIEW_REQUIRED: "HANDOFF_REVIEW_REQUIRED",
  HANDOFF_READY: "HANDOFF_READY",
  HANDOFF_PENDING_SYNC: "HANDOFF_PENDING_SYNC",
  HANDOFF_SYNC_FAILED: "HANDOFF_SYNC_FAILED",
  HANDOFF_COMMITTED: "HANDOFF_COMMITTED",
});

export const PILOT_RUN_6_ROUTE_HANDOFF_CONTRACTS = Object.freeze({
  "/scan": {
    workflowType: "LOOKUP_ONLY",
    truthState: "LOOKUP_ONLY",
    handoffState: INVENTORY_DESKTOP_HANDOFF_STATES.NOT_HANDOFF_ELIGIBLE,
    operatorMeaning: "Lookup only. No desktop handoff, approval, audit upload, print job, or stock movement is created.",
  },
  "/stock-count": {
    workflowType: "STOCK_COUNT",
    truthState: "DRAFT / PENDING_REVIEW / PENDING_SYNC / SYNC_READY",
    handoffState: "HANDOFF_DRAFT / HANDOFF_REVIEW_REQUIRED / HANDOFF_READY",
    operatorMeaning: "Count evidence can be packaged for review. It does not adjust official inventory.",
  },
  "/gap-scan": {
    workflowType: "GAP_SCAN_EVIDENCE",
    truthState: "EVIDENCE_CAPTURED / PENDING_REVIEW",
    handoffState: INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_REVIEW_REQUIRED,
    operatorMeaning: "Gap evidence can be reviewed later. No reorder, shrink, or movement is committed on the handheld.",
  },
  "/replenish": {
    workflowType: "REPLENISHMENT_REQUEST",
    truthState: "PENDING_REVIEW / PENDING_SYNC / BLOCKED",
    handoffState: "HANDOFF_REVIEW_REQUIRED / HANDOFF_READY / HANDOFF_BLOCKED",
    operatorMeaning: "Replenishment is a pending movement request. Stock is not moved in desktop truth yet.",
  },
  "/expiry-check": {
    workflowType: "EXPIRY_EVIDENCE",
    truthState: "EVIDENCE_CAPTURED / PENDING_REVIEW",
    handoffState: INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_REVIEW_REQUIRED,
    operatorMeaning: "Expiry evidence is captured for review. Markdown and waste approval remain separate.",
  },
  "/shelf-tickets": {
    workflowType: "SHELF_TICKET_PRINT_REQUEST",
    truthState: "TICKET_REQUESTED / PRINT_PENDING / BLOCKED",
    handoffState: "HANDOFF_READY / HANDOFF_BLOCKED",
    operatorMeaning: "Ticket work is a print request contract only. No printer success is claimed.",
  },
  "/inventory-sync": {
    workflowType: "HANDOFF_READINESS_QUEUE",
    truthState: "LOCAL_ONLY / PENDING_SYNC / SYNC_FAILED / SYNC_READY",
    handoffState: "HANDOFF_READY / HANDOFF_PENDING_SYNC / HANDOFF_SYNC_FAILED",
    operatorMeaning: "Shows future desktop handoff readiness. It does not claim Inventory Desktop received anything.",
  },
});

export const REQUIRED_HANDOFF_FIELDS = Object.freeze([
  "schema_version",
  "local_event_id",
  "idempotency_key",
  "source_route",
  "workflow_type",
  "truth_state",
  "handoff_state",
  "item_id",
  "item_name",
  "operator_context",
  "device_context",
  "location_context",
  "evidence_summary",
  "requires_review",
  "approval_state",
  "print_state",
  "sync_state",
  "created_at_local",
  "updated_at_local",
  "committed_at",
]);

export function deriveHandoffStateFromSyncStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (["queued", "sync_pending", "syncing", "local_saved", "saved_local", "pending_sync"].includes(normalized)) {
    return INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_PENDING_SYNC;
  }
  if (["sync_failed", "failed", "failure", "failed_retryable"].includes(normalized)) {
    return INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_SYNC_FAILED;
  }
  if (["needs_review", "review_required", "conflict", "duplicate", "escalated"].includes(normalized)) {
    return INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_REVIEW_REQUIRED;
  }
  if (["discarded", "blocked", "failed_blocked"].includes(normalized)) {
    return INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_BLOCKED;
  }
  if (["synced", "sync_succeeded"].includes(normalized)) {
    return INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_READY;
  }
  return INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_DRAFT;
}

export function formatHandoffStateLabel(state) {
  const labels = {
    [INVENTORY_DESKTOP_HANDOFF_STATES.NOT_HANDOFF_ELIGIBLE]: "Lookup only",
    [INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_DRAFT]: "Draft handoff",
    [INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_BLOCKED]: "Handoff blocked",
    [INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_REVIEW_REQUIRED]: "Review required",
    [INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_READY]: "Ready for handoff",
    [INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_PENDING_SYNC]: "Pending future handoff",
    [INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_SYNC_FAILED]: "Handoff failed",
    [INVENTORY_DESKTOP_HANDOFF_STATES.HANDOFF_COMMITTED]: "Committed by desktop",
  };
  return labels[state] || "Draft handoff";
}

export function getRouteHandoffContract(route) {
  return PILOT_RUN_6_ROUTE_HANDOFF_CONTRACTS[route] || null;
}

export function buildInventoryDesktopHandoffRecord(input = {}) {
  const routeContract = getRouteHandoffContract(input.source_route || input.sourceRoute) || {};
  const createdAt = input.created_at_local || input.createdAt || new Date().toISOString();
  const handoffState = input.handoff_state || input.handoffState || routeContract.handoffState || deriveHandoffStateFromSyncStatus(input.sync_state || input.syncState);
  return {
    schema_version: INVENTORY_DESKTOP_HANDOFF_SCHEMA_VERSION,
    local_event_id: input.local_event_id || input.localEventId || null,
    idempotency_key: input.idempotency_key || input.idempotencyKey || null,
    source_route: input.source_route || input.sourceRoute || null,
    workflow_type: input.workflow_type || input.workflowType || routeContract.workflowType || null,
    truth_state: input.truth_state || input.truthState || routeContract.truthState || "LOCAL_ONLY",
    handoff_state: handoffState,
    item_id: input.item_id || input.itemId || null,
    item_name: input.item_name || input.itemName || null,
    barcode: input.barcode || null,
    sku: input.sku || null,
    quantity: input.quantity ?? null,
    operator_context: input.operator_context || input.operatorContext || null,
    device_context: input.device_context || input.deviceContext || null,
    location_context: input.location_context || input.locationContext || null,
    evidence_summary: input.evidence_summary || input.evidenceSummary || routeContract.operatorMeaning || null,
    requires_review: Boolean(input.requires_review ?? input.requiresReview ?? String(handoffState).includes("REVIEW")),
    approval_state: input.approval_state || input.approvalState || "NOT_APPROVED",
    print_state: input.print_state || input.printState || "NOT_PRINTED",
    sync_state: input.sync_state || input.syncState || "LOCAL_ONLY",
    created_at_local: createdAt,
    updated_at_local: input.updated_at_local || input.updatedAt || createdAt,
    committed_at: null,
  };
}

export const PILOT_RUN_6_SAMPLE_HANDOFF_RECORDS = Object.freeze([
  buildInventoryDesktopHandoffRecord({
    local_event_id: "local_scan_lookup_excluded_001",
    idempotency_key: "lookup_excluded_001",
    source_route: "/scan",
    item_id: "item_canola_1l",
    item_name: "Golden Canola Oil 1L",
    barcode: "9300000000456",
    sync_state: "LOCAL_ONLY",
  }),
  buildInventoryDesktopHandoffRecord({
    local_event_id: "local_stock_count_001",
    idempotency_key: "stock_count_001",
    source_route: "/stock-count",
    item_id: "item_rice_5kg",
    item_name: "Rice 5kg",
    sku: "RICE-5KG",
    quantity: 12,
    sync_state: "PENDING_SYNC",
    requires_review: true,
    evidence_summary: "Operator count saved locally; official quantity not adjusted.",
  }),
  buildInventoryDesktopHandoffRecord({
    local_event_id: "local_shelf_ticket_001",
    idempotency_key: "shelf_ticket_001",
    source_route: "/shelf-tickets",
    item_id: "item_sauce_500g",
    item_name: "Tomato Sauce 500g",
    barcode: "9300000000784",
    quantity: 2,
    sync_state: "SYNC_READY",
    print_state: "PRINT_PENDING",
    evidence_summary: "Ticket request prepared. No printer success claimed.",
  }),
]);
