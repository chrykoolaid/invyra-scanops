export const SCANOPS_CONTRACT_VERSION = "SCANOPS_PILOT_CONTRACT_V1";
export const SCANOPS_EVENT_SOURCE = "SCANOPS_HANDHELD";

export const SCANOPS_EVENT_TYPES = Object.freeze({
  PRODUCT_LOOKUP: "PRODUCT_LOOKUP",
  RECEIVING_ENTRY: "RECEIVING_ENTRY",
  STOCK_COUNT_ENTRY: "STOCK_COUNT_ENTRY",
  REPLENISHMENT_COMPLETED: "REPLENISHMENT_COMPLETED",
  PRICE_CHECKED: "PRICE_CHECKED",
  SHELF_TICKET_REQUESTED: "SHELF_TICKET_REQUESTED",
  MARKDOWN_REQUESTED: "MARKDOWN_REQUESTED",
  WASTE_LOGGED: "WASTE_LOGGED",
  TRANSFER_REQUESTED: "TRANSFER_REQUESTED",
  SYNC_RETRY_REQUESTED: "SYNC_RETRY_REQUESTED",
});

export const SCANOPS_WORKFLOWS = Object.freeze({
  PRODUCT_LOOKUP: "PRODUCT_LOOKUP",
  RECEIVING: "RECEIVING",
  STOCK_COUNT: "STOCK_COUNT",
  REPLENISHMENT: "REPLENISHMENT",
  PRICE_PROMO_CHECK: "PRICE_PROMO_CHECK",
  SHELF_TICKETS: "SHELF_TICKETS",
  MARKDOWN: "MARKDOWN",
  WASTE: "WASTE",
  TRANSFERS: "TRANSFERS",
  SYNC_QUEUE: "SYNC_QUEUE",
});

export const SCANOPS_SYNC_STATUSES = Object.freeze({
  SAVED_LOCAL: "SAVED_LOCAL",
  PENDING_SYNC: "PENDING_SYNC",
  SYNCING: "SYNCING",
  SYNCED: "SYNCED",
  FAILED: "FAILED",
  FAILED_RETRYABLE: "FAILED_RETRYABLE",
  FAILED_BLOCKED: "FAILED_BLOCKED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
});

export const SCANOPS_FAILURE_REASONS = Object.freeze({
  OFFLINE: "OFFLINE",
  CONNECTION_UNSTABLE: "CONNECTION_UNSTABLE",
  PERMISSION_REQUIRED: "PERMISSION_REQUIRED",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  CONFLICT: "CONFLICT",
  SERVER_UNAVAILABLE: "SERVER_UNAVAILABLE",
  UNKNOWN_SAFE_FAILURE: "UNKNOWN_SAFE_FAILURE",
});

export const SCANOPS_LOOKUP_STATUSES = Object.freeze({
  FOUND: "FOUND",
  NOT_FOUND: "NOT_FOUND",
  INVALID_SCAN: "INVALID_SCAN",
  OFFLINE_UNAVAILABLE: "OFFLINE_UNAVAILABLE",
});

export const SCANOPS_SAVE_STATUSES = Object.freeze({
  DRAFT: "DRAFT",
  SAVED_LOCAL: "SAVED_LOCAL",
  PENDING_SYNC: "PENDING_SYNC",
  SYNCED: "SYNCED",
  FAILED: "FAILED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
});

export const SCANOPS_APPROVAL_STATUSES = Object.freeze({
  DRAFT: "DRAFT",
  REQUESTED: "REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  PENDING_SYNC: "PENDING_SYNC",
});

export const SCANOPS_PRINT_STATUSES = Object.freeze({
  REQUESTED: "REQUESTED",
  SAVED_LOCAL: "SAVED_LOCAL",
  PENDING_PRINT: "PENDING_PRINT",
  PRINTED: "PRINTED",
  PRINT_UNAVAILABLE: "PRINT_UNAVAILABLE",
  FAILED: "FAILED",
});

export const SCANOPS_PRICE_STATUSES = Object.freeze({
  MATCH: "MATCH",
  MISMATCH: "MISMATCH",
  PRICE_UNAVAILABLE: "PRICE_UNAVAILABLE",
  OFFLINE_UNAVAILABLE: "OFFLINE_UNAVAILABLE",
});

export const SCANOPS_PROMO_STATUSES = Object.freeze({
  PROMO_ACTIVE: "PROMO_ACTIVE",
  PROMO_EXPIRED: "PROMO_EXPIRED",
  OFFLINE_UNAVAILABLE: "OFFLINE_UNAVAILABLE",
});

export const SCANOPS_REPLENISHMENT_STATUSES = Object.freeze({
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  PARTIAL: "PARTIAL",
  BLOCKED: "BLOCKED",
  FAILED: "FAILED",
  PENDING_SYNC: "PENDING_SYNC",
});

export const SCANOPS_TRANSFER_STATUSES = Object.freeze({
  DRAFT: "DRAFT",
  REQUESTED: "REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  IN_TRANSIT: "IN_TRANSIT",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  PENDING_SYNC: "PENDING_SYNC",
});

export const SCANOPS_SYNC_QUEUE_STATUSES = Object.freeze({
  PENDING: "PENDING",
  SYNCING: "SYNCING",
  SYNCED: "SYNCED",
  FAILED_RETRYABLE: "FAILED_RETRYABLE",
  FAILED_BLOCKED: "FAILED_BLOCKED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
});

export const SCANOPS_UNKNOWN_VALUE_LABELS = Object.freeze({
  UNKNOWN: "unknown",
  UNAVAILABLE: "unavailable",
  NOT_PROVIDED: "not provided",
  REQUIRES_DESKTOP_CONFIRMATION: "requires desktop confirmation",
});

export const SCANOPS_EVENT_ENVELOPE_FIELDS = Object.freeze([
  "scanopsEventId",
  "eventType",
  "workflow",
  "deviceId",
  "storeId",
  "locationId",
  "operatorId",
  "operatorRole",
  "createdAt",
  "capturedAt",
  "offlineCaptured",
  "syncStatus",
  "source",
  "payload",
]);

export const SCANOPS_ITEM_SNAPSHOT_FIELDS = Object.freeze([
  "sku",
  "barcode",
  "itemName",
  "brand",
  "department",
  "category",
  "uom",
  "packSize",
  "currentOnHand",
  "lastKnownPrice",
  "priceEffectiveAt",
  "expiryTracked",
  "weightedItem",
]);

export const SCANOPS_WORKFLOW_PAYLOAD_FIELDS = Object.freeze({
  PRODUCT_LOOKUP: [
    "lookupMethod",
    "scannedBarcode",
    "manualSearchText",
    "lookupStatus",
    "itemSnapshot",
    "notFoundReason",
    "offlineAvailability",
  ],
  RECEIVING: [
    "receivingBatchId",
    "supplierId",
    "supplierName",
    "purchaseOrderId",
    "sku",
    "barcode",
    "receivedQuantity",
    "uom",
    "expiryDate",
    "batchCode",
    "operatorNotes",
    "saveStatus",
  ],
  STOCK_COUNT: [
    "countSessionId",
    "countType",
    "sku",
    "barcode",
    "countedQuantity",
    "expectedQuantity",
    "varianceQuantity",
    "varianceReason",
    "countedBy",
    "countedAt",
    "saveStatus",
  ],
  REPLENISHMENT: [
    "replenishmentTaskId",
    "sku",
    "barcode",
    "fromLocation",
    "toLocation",
    "requestedQuantity",
    "movedQuantity",
    "completionStatus",
    "completedBy",
    "completedAt",
  ],
  PRICE_PROMO_CHECK: [
    "sku",
    "barcode",
    "shelfPrice",
    "systemPrice",
    "promotionId",
    "promotionName",
    "promotionStartDate",
    "promotionEndDate",
    "priceStatus",
    "promoStatus",
    "checkedAt",
  ],
  SHELF_TICKETS: [
    "ticketRequestId",
    "sku",
    "barcode",
    "ticketType",
    "ticketSize",
    "quantity",
    "requestedBy",
    "requestedAt",
    "printStatus",
    "printerStatus",
  ],
  MARKDOWN: [
    "markdownRequestId",
    "sku",
    "barcode",
    "currentPrice",
    "requestedMarkdownPrice",
    "markdownReason",
    "expiryDate",
    "approvalStatus",
    "requestedBy",
    "requestedAt",
  ],
  WASTE: [
    "wasteEntryId",
    "sku",
    "barcode",
    "quantity",
    "uom",
    "wasteReason",
    "expiryDate",
    "disposalMethod",
    "loggedBy",
    "loggedAt",
    "saveStatus",
  ],
  TRANSFERS: [
    "transferRequestId",
    "sku",
    "barcode",
    "sourceLocationId",
    "destinationLocationId",
    "requestedQuantity",
    "transferReason",
    "requestedBy",
    "requestedAt",
    "approvalStatus",
    "syncStatus",
  ],
  SYNC_QUEUE: [
    "syncItemId",
    "scanopsEventId",
    "workflow",
    "eventType",
    "createdAt",
    "lastAttemptAt",
    "attemptCount",
    "syncStatus",
    "failureReason",
    "nextAction",
  ],
});
