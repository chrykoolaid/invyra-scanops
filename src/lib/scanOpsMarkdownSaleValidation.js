import { compareDateOnly, toDateOnly } from "./scanOpsMarkdownPolicy";
import { MARKDOWN_PRINT_STATUSES } from "./scanOpsMarkdownLifecycle";

export const MARKDOWN_SALE_DECISIONS = {
  ALLOW: "ALLOW",
  BLOCK_RECORD_NOT_FOUND: "BLOCK_RECORD_NOT_FOUND",
  BLOCK_ITEM_MISMATCH: "BLOCK_ITEM_MISMATCH",
  BLOCK_BATCH_MISMATCH: "BLOCK_BATCH_MISMATCH",
  BLOCK_LOCATION_MISMATCH: "BLOCK_LOCATION_MISMATCH",
  BLOCK_CANCELLED: "BLOCK_CANCELLED",
  BLOCK_SUPERSEDED: "BLOCK_SUPERSEDED",
  BLOCK_NOT_PRINTED: "BLOCK_NOT_PRINTED",
  BLOCK_EXPIRED: "BLOCK_EXPIRED",
};

function sameValue(left, right) {
  if (left == null || right == null || left === "" || right === "") return true;
  return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
}

export function validateMarkdownLabelForSale({
  markdownRecord,
  scannedItemId,
  scannedSku,
  scannedBarcode,
  scannedBatchLot,
  locationId,
  activeSubmissionId,
  businessDate = new Date(),
  timeZone = null,
} = {}) {
  if (!markdownRecord) {
    return {
      allowed: false,
      decision: MARKDOWN_SALE_DECISIONS.BLOCK_RECORD_NOT_FOUND,
      message: "Markdown label not recognised. Remove the item from the transaction and request assistance.",
    };
  }

  const itemMatches = [
    sameValue(markdownRecord.itemId, scannedItemId),
    sameValue(markdownRecord.sku, scannedSku),
    sameValue(markdownRecord.barcode, scannedBarcode),
  ].some(Boolean);
  if (!itemMatches) {
    return {
      allowed: false,
      decision: MARKDOWN_SALE_DECISIONS.BLOCK_ITEM_MISMATCH,
      message: "This markdown label belongs to a different item.",
    };
  }

  if (!sameValue(markdownRecord.batchLot, scannedBatchLot)) {
    return {
      allowed: false,
      decision: MARKDOWN_SALE_DECISIONS.BLOCK_BATCH_MISMATCH,
      message: "This markdown label belongs to a different expiry batch.",
    };
  }

  if (!sameValue(markdownRecord.locationId, locationId)) {
    return {
      allowed: false,
      decision: MARKDOWN_SALE_DECISIONS.BLOCK_LOCATION_MISMATCH,
      message: "This markdown label is not valid at this location.",
    };
  }

  if (markdownRecord.cancelledAt || markdownRecord.status === "CANCELLED") {
    return {
      allowed: false,
      decision: MARKDOWN_SALE_DECISIONS.BLOCK_CANCELLED,
      message: "This markdown label has been cancelled.",
    };
  }

  if (
    markdownRecord.printStatus === MARKDOWN_PRINT_STATUSES.SUPERSEDED
    || markdownRecord.supersededBy
    || (activeSubmissionId && markdownRecord.submissionId !== activeSubmissionId)
  ) {
    return {
      allowed: false,
      decision: MARKDOWN_SALE_DECISIONS.BLOCK_SUPERSEDED,
      message: "Markdown label superseded. Use the latest markdown label for this batch.",
    };
  }

  if (markdownRecord.printStatus !== MARKDOWN_PRINT_STATUSES.PRINTED) {
    return {
      allowed: false,
      decision: MARKDOWN_SALE_DECISIONS.BLOCK_NOT_PRINTED,
      message: "This markdown label was not confirmed as printed and active.",
    };
  }

  const expiryDate = toDateOnly(markdownRecord.expiryDate);
  const currentBusinessDate = toDateOnly(businessDate, timeZone);
  if (expiryDate && currentBusinessDate && compareDateOnly(currentBusinessDate, expiryDate) > 0) {
    return {
      allowed: false,
      decision: MARKDOWN_SALE_DECISIONS.BLOCK_EXPIRED,
      message: `Sale blocked. This batch expired on ${expiryDate} and cannot be sold. Remove it from the transaction and follow the waste process.`,
    };
  }

  return {
    allowed: true,
    decision: MARKDOWN_SALE_DECISIONS.ALLOW,
    message: "Markdown label valid.",
    markdownPrice: markdownRecord.selectedMarkdownPrice,
    submissionId: markdownRecord.submissionId,
    batchLot: markdownRecord.batchLot,
    expiryDate,
  };
}
