import { getScanOpsSession } from "./scanOpsSession";

function nowIso() {
  return new Date().toISOString();
}

function clean(value) {
  return String(value ?? "").trim();
}

export function getItemUnit(item) {
  return item?.unitType || item?.unit_type || "each";
}

export function getItemKey(item) {
  return clean(item?.internalItemId || item?.id || item?.sku || item?.barcode || item?.plu || item?.name || item?.item_name || "unknown-item");
}

export function normalizeSelectedScanItem(item, scanSource = "manual_search") {
  if (!item) return null;
  const now = nowIso();
  return {
    itemId: getItemKey(item),
    itemName: item.name || item.item_name || "Scanned item",
    sku: item.sku || undefined,
    barcode: item.barcode || item.gtin || undefined,
    plu: item.plu || item.scaleCode || item.scale_code || undefined,
    department: item.department || undefined,
    category: item.category || undefined,
    shelfLocation: item.shelfLocation || item.location || item.shelf || undefined,
    backroomLocation: item.backroomLocation || undefined,
    soh: item.stockOnHand ?? item.stock_on_hand ?? item.shelfStock ?? item.shelf_stock ?? undefined,
    price: item.currentPrice ?? item.current_price ?? item.pricePerKg ?? undefined,
    unit: getItemUnit(item),
    lastScannedAt: now,
    scanSource,
    raw: item,
  };
}

export function makeWorkflowBatchItem({ workflowType, item, quantity = undefined, reason = undefined, condition = undefined, markdownPercent = undefined, ticketType = undefined, ticketReason = undefined, sourceLocation = undefined, destinationLocation = undefined, meta = {} }) {
  const session = getScanOpsSession();
  const selected = normalizeSelectedScanItem(item, meta.scanSource || "manual_search");
  const createdAt = nowIso();
  return {
    batchItemId: `${workflowType}_${selected?.itemId || "item"}_${createdAt}_${Math.random().toString(36).slice(2, 7)}`,
    workflowType,
    item: selected,
    quantity,
    reason,
    condition,
    markdownPercent,
    ticketType,
    ticketReason,
    sourceLocation,
    destinationLocation,
    createdBy: session.actorName || session.user_name || "Scanner operator",
    createdRole: session.actorRole || session.role || "Staff",
    createdAt,
    updatedAt: createdAt,
    ...meta,
  };
}

export function getBatchContextKey(line) {
  return [
    line.workflowType,
    line.item?.itemId,
    line.reason || "",
    line.condition || "",
    line.markdownPercent ?? "",
    line.ticketType || "",
    line.ticketReason || "",
    line.sourceLocation || "",
    line.destinationLocation || "",
  ].join("|");
}

export function upsertWorkflowBatchItem(current = [], nextLine) {
  const nextKey = getBatchContextKey(nextLine);
  let merged = false;
  const lines = current.map((line) => {
    if (getBatchContextKey(line) !== nextKey) return line;
    merged = true;
    const currentQty = Number(line.quantity ?? 0);
    const nextQty = Number(nextLine.quantity ?? 0);
    const hasQuantity = line.quantity !== undefined || nextLine.quantity !== undefined;
    return {
      ...line,
      ...nextLine,
      batchItemId: line.batchItemId,
      createdAt: line.createdAt,
      createdBy: line.createdBy,
      createdRole: line.createdRole,
      quantity: hasQuantity ? Number((currentQty + nextQty).toFixed(3)) : nextLine.quantity,
      updatedAt: nowIso(),
    };
  });
  return merged ? lines : [nextLine, ...current];
}

export function replaceWorkflowBatchItem(current = [], batchItemId, patch = {}) {
  return current.map((line) => line.batchItemId === batchItemId ? { ...line, ...patch, updatedAt: nowIso() } : line);
}

export function removeWorkflowBatchItem(current = [], batchItemId) {
  return current.filter((line) => line.batchItemId !== batchItemId);
}

export function makeWorkflowBatch({ batchId, workflowType, status = "draft", items = [], supplierId, poReference, sourceLocation, destinationLocation }) {
  const session = getScanOpsSession();
  const createdAt = nowIso();
  return {
    batchId: batchId || `${workflowType}_batch_${createdAt}_${Math.random().toString(36).slice(2, 7)}`,
    workflowType,
    status,
    supplierId,
    poReference,
    sourceLocation,
    destinationLocation,
    items,
    createdBy: session.actorName || session.user_name || "Scanner operator",
    createdRole: session.actorRole || session.role || "Staff",
    createdAt,
    updatedAt: createdAt,
  };
}
