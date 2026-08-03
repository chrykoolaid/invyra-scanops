import { compareDateOnly, toDateOnly } from "./scanOpsMarkdownPolicy.js";

const PRINTED_STATUS = "PRINTED";
const SUPERSEDED_STATUS = "SUPERSEDED";

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

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function normalized(value) {
  return String(value).trim().toLowerCase();
}

function sameOptionalValue(left, right) {
  if (!hasValue(left) || !hasValue(right)) return true;
  return normalized(left) === normalized(right);
}

function identityMatches(markdownRecord, scanned) {
  const pairs = [
    [markdownRecord.itemId, scanned.itemId],
    [markdownRecord.sku, scanned.sku],
    [markdownRecord.barcode, scanned.barcode],
  ].filter(([left, right]) => hasValue(left) && hasValue(right));
  return pairs.length > 0 && pairs.some(([left, right]) => normalized(left) === normalized(right));
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

  if (!identityMatches(markdownRecord, { itemId: scannedItemId, sku: scannedSku, barcode: scannedBarcode })) {
    return {
      allowed: false,
      decision: MARKDOWN_SALE_DECISIONS.BLOCK_ITEM_MISMATCH,
      message: "This markdown label belongs to a different item.",
    };
  }

  if (!sameOptionalValue(markdownRecord.batchLot, scannedBatchLot)) {
    return {
      allowed: false,
      decision: MARKDOWN_SALE_DECISIONS.BLOCK_BATCH_MISMATCH,
      message: "This markdown label belongs to a different expiry batch.",
    };
  }

  if (!sameOptionalValue(markdownRecord.locationId, locationId)) {
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
    markdownRecord.printStatus === SUPERSEDED_STATUS
    || markdownRecord.supersededBy
    || (activeSubmissionId && markdownRecord.submissionId !== activeSubmissionId)
  ) {
    return {
      allowed: false,
      decision: MARKDOWN_SALE_DECISIONS.BLOCK_SUPERSEDED,
      message: "Markdown label superseded. Use the latest markdown label for this batch.",
    };
  }

  if (markdownRecord.printStatus !== PRINTED_STATUS) {
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
