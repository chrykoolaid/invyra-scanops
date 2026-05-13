import { getNetworkMode } from "./scanOpsSync";
import { getScanOpsSession } from "./scanOpsSession";
import { normalizeSelectedScanItem } from "./scanOpsWorkflowBatch";

const RECEIVING_BATCH_STORAGE_KEY = "invyra_scanops_stagew_receiving_batches_v1";
const TRANSFER_BATCH_STORAGE_KEY = "invyra_scanops_stagew_transfer_batches_v1";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeRead(key) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn(`Unable to read ${key}`, error);
    return [];
  }
}

function safeWrite(key, rows) {
  if (typeof window === "undefined") return rows;
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch (error) {
    console.warn(`Unable to write ${key}`, error);
  }
  return rows;
}

function networkReviewStatus(normalStatus = "Submitted") {
  return getNetworkMode() === "offline" ? "Pending sync" : normalStatus;
}

export function actorSnapshot() {
  const session = getScanOpsSession();
  return {
    created_by: session.actorName || session.user_name || "Scanner operator",
    created_role: session.actorRole || session.role || "Staff",
    actor_id: session.actorUserId || session.user_id || "staff_001",
    actor_role: session.actorRole || session.role || "Staff",
    store_id: session.storeId || session.location_id || "store_001",
    device_id: session.deviceId || session.scannerId || "SCANOPS_001",
  };
}

export const RECEIVING_STATUSES = [
  "Draft",
  "In Progress",
  "Submitted",
  "Review Required",
  "Exception Review",
  "Accepted",
  "Closed",
  "Cancelled",
];

export const RECEIVING_REVIEW_STATES = [
  "No Exception",
  "Within Tolerance",
  "Review Required",
  "Follow-up Requested",
  "Supplier Issue",
  "Accepted",
  "Rejected",
  "Closed",
];

export const RECEIVING_EXCEPTION_OPTIONS_STAGEW = [
  { id: "none", label: "None / Normal receipt" },
  { id: "short_received", label: "Short Received" },
  { id: "over_received", label: "Over Received" },
  { id: "damaged_on_arrival", label: "Damaged on Arrival" },
  { id: "wrong_item_delivered", label: "Wrong Item Delivered" },
  { id: "unknown_item", label: "Unknown Item" },
  { id: "missing_delivery_line", label: "Missing Delivery Line" },
  { id: "expiry_short_dated", label: "Expiry / Short Dated" },
  { id: "mixed_lot_batch", label: "Mixed Lot / Batch" },
  { id: "supplier_substitution", label: "Supplier Substitution" },
  { id: "other", label: "Other" },
];

export const RECEIVING_CONDITION_OPTIONS_STAGEW = [
  { id: "normal", label: "Normal" },
  { id: "damaged", label: "Damaged" },
  { id: "short_dated", label: "Short dated" },
  { id: "mixed_lots", label: "Mixed lots" },
  { id: "temperature_concern", label: "Temperature concern" },
  { id: "other", label: "Other" },
];

export const TRANSFER_STATUSES = [
  "Draft",
  "Ready to Dispatch",
  "Dispatched",
  "In Transit",
  "Partially Received",
  "Received",
  "Exception Review",
  "Accepted",
  "Closed",
  "Cancelled",
];

export const TRANSFER_CONDITION_OPTIONS_STAGEW = [
  { id: "normal", label: "Normal" },
  { id: "damaged", label: "Damaged" },
  { id: "mixed_case", label: "Mixed case" },
  { id: "other", label: "Other" },
];

export const TRANSFER_EXCEPTION_OPTIONS_STAGEW = [
  { id: "none", label: "None / Normal receive" },
  { id: "short_received_destination", label: "Short Received at Destination" },
  { id: "over_received_destination", label: "Over Received at Destination" },
  { id: "damaged_in_transit", label: "Damaged in Transit" },
  { id: "wrong_item_received", label: "Wrong Item Received" },
  { id: "wrong_destination", label: "Wrong Destination" },
  { id: "return_to_source", label: "Return to Source" },
  { id: "missing_tote_container", label: "Missing Tote / Container" },
  { id: "mixed_case", label: "Mixed Case" },
  { id: "other", label: "Other" },
];

export function optionLabel(options, id, fallback = "—") {
  return options.find((option) => option.id === id)?.label || id || fallback;
}

export function expectedQuantityForItem(item) {
  const raw = item?.pendingDeliveryQty ?? item?.pending_delivery_qty ?? item?.expectedQty ?? item?.expected_qty;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function unitForItem(item) {
  return item?.unitType || item?.unit_type || item?.unit || "each";
}

export function differenceLabel(value) {
  if (value == null) return "—";
  return value > 0 ? `+${value}` : String(value);
}

function hasReceivingException(line) {
  return Boolean(line.exception_type && line.exception_type !== "none") || line.difference_quantity !== 0 || ["damaged", "short_dated", "mixed_lots", "temperature_concern"].includes(line.condition_snapshot);
}

function receivingExceptionFromLine(line) {
  if (line.exception_type && line.exception_type !== "none") return line.exception_type;
  if (line.difference_quantity < 0) return "short_received";
  if (line.difference_quantity > 0) return "over_received";
  if (line.condition_snapshot === "damaged") return "damaged_on_arrival";
  if (line.condition_snapshot === "short_dated") return "expiry_short_dated";
  if (line.condition_snapshot === "mixed_lots") return "mixed_lot_batch";
  if (line.condition_snapshot === "temperature_concern") return "other";
  return "none";
}

function hasTransferException(receiveLine) {
  return Boolean(receiveLine.exception_type && receiveLine.exception_type !== "none") || receiveLine.difference_quantity !== 0 || ["damaged", "mixed_case"].includes(receiveLine.condition_note);
}

function transferExceptionFromReceiveLine(receiveLine) {
  if (receiveLine.exception_type && receiveLine.exception_type !== "none") return receiveLine.exception_type;
  if (receiveLine.difference_quantity < 0) return "short_received_destination";
  if (receiveLine.difference_quantity > 0) return "over_received_destination";
  if (receiveLine.condition_note === "damaged") return "damaged_in_transit";
  if (receiveLine.condition_note === "mixed_case") return "mixed_case";
  return "none";
}

export function createReceivingBatch({ supplierId, supplierName, poRef, deliveryRef, assignedUserId, assignedRoleScope } = {}) {
  const createdAt = nowIso();
  const actor = actorSnapshot();
  const cleanPo = String(poRef || "").trim();
  const cleanDelivery = String(deliveryRef || "").trim();
  const batch = {
    id: makeId("recv_batch"),
    batch_ref: cleanPo || `RCV-${createdAt.slice(2, 10).replaceAll("-", "")}`,
    po_ref: cleanPo || null,
    supplier_id: supplierId || "manual_supplier",
    supplier_name: supplierName || "Manual supplier",
    delivery_ref: cleanDelivery || null,
    status: "In Progress",
    assigned_user_id: assignedUserId || actor.actor_id,
    assigned_role_scope: assignedRoleScope || actor.actor_role,
    lines: [],
    exceptions: [],
    events: [],
    ...actor,
    created_at: createdAt,
    started_at: createdAt,
    submitted_at: null,
    accepted_by: null,
    accepted_at: null,
    closed_at: null,
    cancelled_reason: null,
    applies_stock_directly: false,
    stock_posting_owner: "Invyra Inventory",
  };
  return batch;
}

export function makeReceivingLine({ batch, item, receivedQuantity, exceptionType = "none", condition = "normal", evidenceNote = "", attributeSnapshot = null }) {
  const selected = normalizeSelectedScanItem(item, item?._searchMatch?.matchType || "manual_search");
  const expected = expectedQuantityForItem(item);
  const received = Number(receivedQuantity || 0);
  const diff = expected == null ? null : Number((received - expected).toFixed(3));
  const createdAt = nowIso();
  const actor = actorSnapshot();
  const line = {
    id: makeId("recv_line"),
    batch_id: batch?.id,
    item_id: selected?.itemId || makeId("item"),
    sku: selected?.sku || null,
    barcode: selected?.barcode || null,
    plu: selected?.plu || null,
    item_snapshot: selected || { itemName: item?.name || "Scanned item" },
    expected_quantity: expected,
    received_quantity: received,
    difference_quantity: diff,
    unit_label: selected?.unit || unitForItem(item),
    line_status: "No Exception",
    exception_type: exceptionType,
    condition_snapshot: condition,
    evidence_note: evidenceNote || null,
    expiry_snapshot: attributeSnapshot?.expiry_snapshot || null,
    lot_batch_snapshot: attributeSnapshot?.lot_batch_snapshot || null,
    weighted_snapshot: attributeSnapshot?.weighted_snapshot || null,
    attribute_snapshot: attributeSnapshot,
    ...actor,
    created_at: createdAt,
    updated_at: createdAt,
  };
  const finalExceptionType = receivingExceptionFromLine(line);
  return {
    ...line,
    exception_type: finalExceptionType,
    line_status: finalExceptionType === "none" && !hasReceivingException(line) ? "No Exception" : "Review Required",
  };
}

export function makeReceivingException(batch, line) {
  if (!line || line.line_status === "No Exception") return null;
  const actor = actorSnapshot();
  return {
    id: makeId("recv_ex"),
    batch_id: batch.id,
    batch_line_id: line.id,
    item_id: line.item_id,
    item_name: line.item_snapshot?.itemName || "Scanned item",
    exception_type: line.exception_type,
    severity: ["wrong_item_delivered", "unknown_item", "missing_delivery_line"].includes(line.exception_type) ? "High" : "Medium",
    status: "Review Required",
    supplier_note: null,
    evidence_note: line.evidence_note,
    expected_quantity: line.expected_quantity,
    received_quantity: line.received_quantity,
    difference_quantity: line.difference_quantity,
    expiry_snapshot: line.expiry_snapshot,
    lot_batch_snapshot: line.lot_batch_snapshot,
    weighted_snapshot: line.weighted_snapshot,
    ...actor,
    created_at: nowIso(),
    reviewed_by: null,
    reviewed_at: null,
    review_decision: null,
    review_reason: null,
  };
}

export function addReceivingEvidence(batch, line) {
  const exceptions = batch.exceptions || [];
  const exception = makeReceivingException(batch, line);
  const nextExceptions = exception ? [exception, ...exceptions] : exceptions;
  const nextStatus = exception ? "Review Required" : (batch.status === "Draft" ? "In Progress" : batch.status);
  return {
    ...batch,
    status: nextStatus,
    lines: [line, ...(batch.lines || [])],
    exceptions: nextExceptions,
    updated_at: nowIso(),
  };
}

export function submitReceivingBatch(batch) {
  const hasExceptions = (batch.exceptions || []).some((exception) => !["Accepted", "Closed"].includes(exception.status));
  return {
    ...batch,
    status: hasExceptions ? "Exception Review" : networkReviewStatus("Submitted"),
    submitted_at: nowIso(),
    updated_at: nowIso(),
  };
}

export function reviewReceivingException(batch, exceptionId, decision, reason = "") {
  const actor = actorSnapshot();
  const exceptions = (batch.exceptions || []).map((exception) => {
    if (exception.id !== exceptionId) return exception;
    return {
      ...exception,
      status: decision,
      reviewed_by: actor.created_by,
      reviewed_role: actor.created_role,
      reviewed_at: nowIso(),
      review_decision: decision,
      review_reason: reason || null,
    };
  });
  const open = exceptions.some((exception) => ["Review Required", "Follow-up Requested", "Supplier Issue"].includes(exception.status));
  return {
    ...batch,
    exceptions,
    status: open ? "Exception Review" : "Accepted",
    accepted_by: open ? batch.accepted_by : actor.created_by,
    accepted_at: open ? batch.accepted_at : nowIso(),
    updated_at: nowIso(),
  };
}

export function saveReceivingBatches(batches) {
  return safeWrite(RECEIVING_BATCH_STORAGE_KEY, batches.slice(0, 80));
}

export function getReceivingBatches() {
  return safeRead(RECEIVING_BATCH_STORAGE_KEY);
}

export function createTransferBatch({ transferType, sourceLocationId, sourceLocationLabel, destinationLocationId, destinationLocationLabel, reason, assignedUserId, assignedRoleScope } = {}) {
  const createdAt = nowIso();
  const actor = actorSnapshot();
  return {
    id: makeId("trf_batch"),
    transfer_ref: `TR-${createdAt.slice(2, 10).replaceAll("-", "")}`,
    transfer_type: transferType || "backroom_to_shelf",
    source_location: sourceLocationLabel || sourceLocationId || "Source",
    source_location_id: sourceLocationId || null,
    destination_location: destinationLocationLabel || destinationLocationId || "Destination",
    destination_location_id: destinationLocationId || null,
    reason: reason || "replenishment",
    status: "Ready to Dispatch",
    assigned_user_id: assignedUserId || actor.actor_id,
    assigned_role_scope: assignedRoleScope || actor.actor_role,
    dispatch_lines: [],
    receive_lines: [],
    exceptions: [],
    events: [],
    ...actor,
    created_at: createdAt,
    dispatched_at: null,
    received_at: null,
    accepted_by: null,
    accepted_at: null,
    closed_at: null,
    cancelled_reason: null,
    applies_stock_directly: false,
    stock_posting_owner: "Invyra Inventory",
  };
}

export function makeTransferDispatchLine({ transfer, item, dispatchQuantity, condition = "normal", evidenceNote = "" }) {
  const selected = normalizeSelectedScanItem(item, item?._searchMatch?.matchType || "manual_search");
  const qty = Number(dispatchQuantity || 0);
  const actor = actorSnapshot();
  return {
    id: makeId("trf_dispatch"),
    transfer_id: transfer?.id,
    item_id: selected?.itemId || makeId("item"),
    sku: selected?.sku || null,
    barcode: selected?.barcode || null,
    plu: selected?.plu || null,
    item_snapshot: selected || { itemName: item?.name || "Scanned item" },
    dispatch_quantity: Number(qty.toFixed(3)),
    unit_label: selected?.unit || unitForItem(item),
    condition_note: condition,
    evidence_note: evidenceNote || null,
    ...actor,
    created_at: nowIso(),
  };
}

export function addTransferDispatchEvidence(transfer, line) {
  return {
    ...transfer,
    status: "In Transit",
    dispatch_lines: [line, ...(transfer.dispatch_lines || [])],
    dispatched_at: transfer.dispatched_at || nowIso(),
    updated_at: nowIso(),
  };
}

export function makeTransferReceiveLine({ transfer, dispatchLine, receivedQuantity, exceptionType = "none", condition = "normal", evidenceNote = "" }) {
  const received = Number(receivedQuantity || 0);
  const dispatched = Number(dispatchLine?.dispatch_quantity || 0);
  const difference = Number((received - dispatched).toFixed(3));
  const actor = actorSnapshot();
  const line = {
    id: makeId("trf_receive"),
    transfer_id: transfer?.id,
    dispatch_line_id: dispatchLine?.id,
    item_id: dispatchLine?.item_id,
    item_snapshot: dispatchLine?.item_snapshot,
    dispatched_quantity: dispatched,
    received_quantity: Number(received.toFixed(3)),
    difference_quantity: difference,
    unit_label: dispatchLine?.unit_label || "each",
    condition_note: condition,
    exception_type: exceptionType,
    evidence_note: evidenceNote || null,
    ...actor,
    created_at: nowIso(),
  };
  const finalExceptionType = transferExceptionFromReceiveLine(line);
  return {
    ...line,
    exception_type: finalExceptionType,
    line_status: finalExceptionType === "none" && !hasTransferException(line) ? "Received" : "Review Required",
  };
}

export function makeTransferException(transfer, dispatchLine, receiveLine) {
  if (!receiveLine || receiveLine.line_status !== "Review Required") return null;
  const actor = actorSnapshot();
  return {
    id: makeId("trf_ex"),
    transfer_id: transfer.id,
    dispatch_line_id: dispatchLine?.id,
    receive_line_id: receiveLine.id,
    item_id: dispatchLine?.item_id,
    item_name: dispatchLine?.item_snapshot?.itemName || "Scanned item",
    exception_type: receiveLine.exception_type,
    severity: ["wrong_destination", "return_to_source", "missing_tote_container"].includes(receiveLine.exception_type) ? "High" : "Medium",
    status: "Review Required",
    evidence_note: receiveLine.evidence_note,
    dispatched_quantity: receiveLine.dispatched_quantity,
    received_quantity: receiveLine.received_quantity,
    difference_quantity: receiveLine.difference_quantity,
    ...actor,
    created_at: nowIso(),
    reviewed_by: null,
    reviewed_at: null,
    review_decision: null,
    review_reason: null,
  };
}

export function addTransferReceiveEvidence(transfer, dispatchLine, receiveLine) {
  const exception = makeTransferException(transfer, dispatchLine, receiveLine);
  const exceptions = exception ? [exception, ...(transfer.exceptions || [])] : (transfer.exceptions || []);
  const allDispatchIds = new Set((transfer.dispatch_lines || []).map((line) => line.id));
  const nextReceiveIds = new Set([receiveLine, ...(transfer.receive_lines || [])].map((line) => line.dispatch_line_id));
  const allReceived = Array.from(allDispatchIds).every((id) => nextReceiveIds.has(id));
  return {
    ...transfer,
    status: exception ? "Exception Review" : (allReceived ? "Received" : "Partially Received"),
    receive_lines: [receiveLine, ...(transfer.receive_lines || [])],
    exceptions,
    received_at: allReceived ? nowIso() : transfer.received_at,
    updated_at: nowIso(),
  };
}

export function submitTransferBatch(transfer) {
  const openExceptions = (transfer.exceptions || []).some((exception) => !["Accepted", "Closed"].includes(exception.status));
  return {
    ...transfer,
    status: openExceptions ? "Exception Review" : networkReviewStatus("Accepted"),
    accepted_at: openExceptions ? transfer.accepted_at : nowIso(),
    accepted_by: openExceptions ? transfer.accepted_by : actorSnapshot().created_by,
    updated_at: nowIso(),
  };
}

export function reviewTransferException(transfer, exceptionId, decision, reason = "") {
  const actor = actorSnapshot();
  const exceptions = (transfer.exceptions || []).map((exception) => {
    if (exception.id !== exceptionId) return exception;
    return {
      ...exception,
      status: decision,
      reviewed_by: actor.created_by,
      reviewed_role: actor.created_role,
      reviewed_at: nowIso(),
      review_decision: decision,
      review_reason: reason || null,
    };
  });
  const open = exceptions.some((exception) => ["Review Required", "Follow-up Requested", "Supplier Issue"].includes(exception.status));
  return {
    ...transfer,
    exceptions,
    status: open ? "Exception Review" : "Accepted",
    accepted_by: open ? transfer.accepted_by : actor.created_by,
    accepted_at: open ? transfer.accepted_at : nowIso(),
    updated_at: nowIso(),
  };
}

export function saveTransferBatches(batches) {
  return safeWrite(TRANSFER_BATCH_STORAGE_KEY, batches.slice(0, 80));
}

export function getTransferBatches() {
  return safeRead(TRANSFER_BATCH_STORAGE_KEY);
}

export function batchReadOnly(status) {
  return ["Submitted", "Pending sync", "Sync Pending", "Accepted", "Closed", "Cancelled"].includes(status);
}
