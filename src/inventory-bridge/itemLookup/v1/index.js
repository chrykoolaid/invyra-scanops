import {
  createScanOpsItemLookupClientV1 as createBaseScanOpsItemLookupClientV1,
} from './scanOpsItemLookupClientV1.js';

export {
  SCANOPS_ITEM_LOOKUP_CLIENT_V1_PATH,
  SCANOPS_ITEM_LOOKUP_CLIENT_V1_PHASE,
  SCANOPS_ITEM_LOOKUP_CLIENT_V1_VERSION,
  SCANOPS_ITEM_READ_CLIENT_V1_PHASE,
} from './scanOpsItemLookupClientV1.js';

export {
  ITEM_SEARCH_OPERATION,
  ITEM_VIEW_OPERATION,
  LOOKUP_OPERATION,
  validateScanOpsItemLookupReceiptV1,
} from './validateScanOpsItemLookupReceiptV1.js';

export const LEGACY_OPERATIONAL_ITEM_READ_TIMEOUT_MS = 4_000;
export const IDLE_TOLERANT_ITEM_READ_TIMEOUT_MS = 15_000;

/**
 * Phase 39-0F8.3 upgrades the exact four-second timeout used by the live
 * ScanOps Item Lookup surface. Inventory-owned Base44 reads can legitimately
 * take longer after an idle period, so one governed request receives a
 * fifteen-second response window. Explicit custom timeout values remain
 * unchanged for deterministic transport tests and diagnostics.
 *
 * This does not add retry, replay, queueing, persistence or fallback.
 */
export function createScanOpsItemLookupClientV1(options = {}) {
  const requestedTimeoutMs = Number(options.timeoutMs);
  const timeoutMs = requestedTimeoutMs === LEGACY_OPERATIONAL_ITEM_READ_TIMEOUT_MS
    ? IDLE_TOLERANT_ITEM_READ_TIMEOUT_MS
    : options.timeoutMs;

  return createBaseScanOpsItemLookupClientV1({
    ...options,
    timeoutMs,
  });
}
