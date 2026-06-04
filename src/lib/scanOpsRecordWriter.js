/**
 * scanOpsRecordWriter — writes workflow outcomes to the ScanOpsRecord DB entity.
 * Fire-and-forget: never blocks the UI, never throws to caller.
 */
import { base44 } from "@/api/base44Client";
import { getScanOpsSession } from "./scanOpsSession";

function actor() {
  const s = getScanOpsSession();
  return {
    actorUserId: s.actorUserId || null,
    actorName: s.actorName || "Operator",
    actorRole: s.actorRole || "Staff",
    storeId: s.storeId || null,
    sessionId: s.sessionId || null,
    deviceId: s.deviceId || s.scannerId || null,
  };
}

/**
 * Write a single ScanOpsRecord to the DB.
 * @param {object} fields - ScanOpsRecord fields (recordType is required)
 */
export function writeScanOpsRecord(fields) {
  if (!fields?.recordType) return;
  const ctx = actor();
  base44.entities.ScanOpsRecord.create({
    syncStatus: "pending",
    ...ctx,
    ...fields,
  }).catch(() => {});
}

// Convenience wrappers per workflow type

export function writeGapScanRecord({ item, outcome, outcomeLabel }) {
  writeScanOpsRecord({
    recordType: "gap_scan",
    status: "saved",
    itemId: item?.internalItemId || item?.id,
    itemName: item?.name,
    itemSku: item?.sku,
    itemBarcode: item?.barcode,
    outcomeLabel,
    reason: outcome,
    payload: { gap_type: outcome },
  });
}

export function writeExpiryCheckRecord({ item, expiryDate, condition, expiryStatusLabel, recommendedAction }) {
  writeScanOpsRecord({
    recordType: "expiry_check",
    status: "saved",
    itemId: item?.internalItemId || item?.id,
    itemName: item?.name,
    itemSku: item?.sku,
    itemBarcode: item?.barcode,
    reason: condition,
    payload: { expiry_date: expiryDate, expiry_status: expiryStatusLabel, condition, recommended_action: recommendedAction },
  });
}

export function writeMarkdownRecord({ item, reasonCode, selectedPercent, quantity, expiryDate, notes, status, requestId }) {
  writeScanOpsRecord({
    recordType: "markdown",
    status: status || "pending_approval",
    itemId: item?.internalItemId || item?.id,
    itemName: item?.name,
    itemSku: item?.sku,
    itemBarcode: item?.barcode,
    quantity: Number(quantity) || 1,
    reason: reasonCode,
    notes,
    payload: { markdown_percent: selectedPercent, expiry_date: expiryDate, request_id: requestId },
  });
}

export function writeWasteRecord({ item, reasonCode, quantity, expiryDate, batchLot, evidenceNote, status, reviewId }) {
  writeScanOpsRecord({
    recordType: "waste",
    status: status || "draft",
    itemId: item?.internalItemId || item?.id,
    itemName: item?.name,
    itemSku: item?.sku,
    itemBarcode: item?.barcode,
    quantity: Number(quantity) || 1,
    reason: reasonCode,
    evidenceNote,
    notes: batchLot ? `Batch: ${batchLot}` : undefined,
    payload: { expiry_date: expiryDate, batch_lot: batchLot, review_id: reviewId },
  });
}

export function writeStockCountRecord({ item, counted, expected, unit, sessionId, status }) {
  writeScanOpsRecord({
    recordType: "stock_count",
    status: status || "saved",
    itemId: item?.internalItemId || item?.id,
    itemName: item?.name,
    itemSku: item?.sku,
    itemBarcode: item?.barcode,
    quantity: Number(counted),
    unit,
    sessionId,
    payload: { counted_quantity: counted, expected_quantity: expected, variance: counted - (expected || 0) },
  });
}

export function writeReplenishRecord({ item, quantity, unit, outcome, notes }) {
  writeScanOpsRecord({
    recordType: "replenishment",
    status: outcome || "filled",
    itemId: item?.internalItemId || item?.id,
    itemName: item?.name,
    itemSku: item?.sku,
    itemBarcode: item?.barcode,
    quantity: Number(quantity) || 0,
    unit,
    notes,
    outcomeLabel: outcome,
    payload: { outcome },
  });
}

export function writeReceivingRecord({ item, quantity, unit, condition, notes, poRef }) {
  writeScanOpsRecord({
    recordType: "receiving",
    status: "received",
    itemId: item?.internalItemId || item?.id,
    itemName: item?.name,
    itemSku: item?.sku,
    itemBarcode: item?.barcode,
    quantity: Number(quantity) || 0,
    unit,
    reason: condition,
    notes,
    payload: { po_ref: poRef, condition },
  });
}

export function writePriceCheckRecord({ item, outcome, scannedPrice, expectedPrice, notes }) {
  writeScanOpsRecord({
    recordType: "price_check",
    status: outcome || "verified",
    itemId: item?.internalItemId || item?.id,
    itemName: item?.name,
    itemSku: item?.sku,
    itemBarcode: item?.barcode,
    outcomeLabel: outcome,
    notes,
    payload: { scanned_price: scannedPrice, expected_price: expectedPrice, outcome },
  });
}

export function writeTransferRecord({ items, sourceLocation, destLocation, notes, status }) {
  writeScanOpsRecord({
    recordType: "transfer",
    status: status || "submitted",
    quantity: items?.length || 0,
    notes,
    locationId: sourceLocation,
    payload: { source_location: sourceLocation, destination_location: destLocation, item_count: items?.length || 0 },
  });
}

export function writeReorderFlagRecord({ item, shelfStock, backroomStock, threshold, unit }) {
  writeScanOpsRecord({
    recordType: "reorder_flag",
    status: "open",
    itemId: item?.internalItemId || item?.id,
    itemName: item?.name,
    itemSku: item?.sku,
    itemBarcode: item?.barcode,
    quantity: shelfStock,
    unit,
    payload: { shelf_stock: shelfStock, backroom_stock: backroomStock, threshold },
  });
}