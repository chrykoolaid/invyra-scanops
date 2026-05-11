import { getNetworkMode } from "./scanOpsSync";
import { getScanOpsSession } from "./scanOpsSession";
import { normalizeSelectedScanItem } from "./scanOpsWorkflowBatch";

const RECEIVING_STORAGE_KEY = "invyra_scanops_receiving_requests_v1";
const TRANSFER_STORAGE_KEY = "invyra_scanops_transfer_requests_v1";

function nowIso() {
  return new Date().toISOString();
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

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getActorFields() {
  const session = getScanOpsSession();
  return {
    createdBy: session.actorName || session.user_name || "Scanner operator",
    createdRole: session.actorRole || session.role || "Staff",
    actorUserId: session.actorUserId || session.user_id || "staff_001",
    deviceId: session.deviceId || session.scannerId || "SCANOPS_001",
    storeId: session.storeId || session.location_id || "store_001",
  };
}

function requestStatusForNetwork() {
  return getNetworkMode() === "offline" ? "sync_pending" : "submitted";
}

export const RECEIVING_MODES = {
  AGAINST_PO: "against_po",
  ADHOC_DELIVERY: "adhoc_delivery",
};

export const RECEIVING_MODE_OPTIONS = [
  { id: RECEIVING_MODES.AGAINST_PO, label: "Against PO", helper: "Expected delivery or purchase order" },
  { id: RECEIVING_MODES.ADHOC_DELIVERY, label: "Ad-hoc Delivery", helper: "Delivery evidence without matched PO" },
];

export const RECEIVING_CONDITION_OPTIONS = [
  { id: "good", label: "Good" },
  { id: "damaged", label: "Damaged" },
  { id: "short_dated", label: "Short dated" },
  { id: "wrong_item", label: "Wrong item" },
  { id: "temperature_concern", label: "Temperature concern" },
  { id: "other", label: "Other" },
];

export const RECEIVING_DISCREPANCY_OPTIONS = [
  { id: "none", label: "None" },
  { id: "short_received", label: "Short received" },
  { id: "over_received", label: "Over received" },
  { id: "damaged_on_arrival", label: "Damaged on arrival" },
  { id: "wrong_item_supplied", label: "Wrong item supplied" },
  { id: "not_on_po", label: "Not on PO" },
  { id: "other", label: "Other" },
];

export const TRANSFER_REQUEST_TYPES = {
  BACKROOM_TO_SHELF: "backroom_to_shelf",
  SHELF_TO_BACKROOM: "shelf_to_backroom",
  STORE_TO_STORE: "store_to_store",
  DEPARTMENT_TO_DEPARTMENT: "department_to_department",
};

export const TRANSFER_REQUEST_TYPE_OPTIONS = [
  { id: TRANSFER_REQUEST_TYPES.BACKROOM_TO_SHELF, label: "Backroom → Shelf", helper: "Fill shelf from backroom" },
  { id: TRANSFER_REQUEST_TYPES.SHELF_TO_BACKROOM, label: "Shelf → Backroom", helper: "Move excess stock back" },
  { id: TRANSFER_REQUEST_TYPES.STORE_TO_STORE, label: "Store → Store", helper: "Request stock movement between stores" },
  { id: TRANSFER_REQUEST_TYPES.DEPARTMENT_TO_DEPARTMENT, label: "Department → Department", helper: "Move ownership between departments" },
];

export const TRANSFER_REASON_OPTIONS = [
  { id: "replenishment", label: "Replenishment" },
  { id: "stock_relocation", label: "Stock relocation" },
  { id: "customer_demand", label: "Customer demand" },
  { id: "display_fill", label: "Display fill" },
  { id: "damaged_area_cleanup", label: "Damaged area cleanup" },
  { id: "correction_request", label: "Correction request" },
  { id: "other", label: "Other" },
];

export const TRANSFER_LOCATION_OPTIONS = [
  { id: "backroom_a", label: "Backroom A" },
  { id: "dairy_shelf", label: "Dairy Shelf" },
  { id: "grocery_shelf", label: "Grocery Shelf" },
  { id: "produce_display", label: "Produce Display" },
  { id: "fresh_coolroom", label: "Fresh Coolroom" },
  { id: "store_002", label: "Store 002" },
  { id: "grocery_department", label: "Grocery Department" },
  { id: "fresh_department", label: "Fresh Department" },
];

export function getOptionLabel(options, id, fallback = "—") {
  return options.find((option) => option.id === id)?.label || id || fallback;
}

export function normalizeReceivingLine({ item, quantity, condition, discrepancy, supplierId, supplierName, poReference, receivingMode }) {
  const selected = normalizeSelectedScanItem(item, "manual_search");
  const expectedQty = Number(item?.pendingDeliveryQty ?? item?.pending_delivery_qty ?? 24);
  const receivedQty = Number(quantity || 0);
  return {
    requestItemId: makeId("recv_item"),
    itemId: selected?.itemId || makeId("item"),
    itemName: selected?.itemName || "Scanned item",
    sku: selected?.sku,
    barcode: selected?.barcode,
    expectedQty: Number.isFinite(expectedQty) ? expectedQty : undefined,
    alreadyReceivedQty: 0,
    receivedQty,
    quantity: receivedQty,
    unit: selected?.unit || item?.unitType || item?.unit_type || "each",
    condition,
    discrepancy,
    supplierId,
    supplierName,
    poReference,
    receivingMode,
    shelfStock: item?.shelfStock ?? item?.shelf_stock,
    backroomStock: item?.backroomStock ?? item?.backroom_stock,
    stockOnHand: item?.stockOnHand ?? item?.stock_on_hand,
    shelfLocation: item?.shelfLocation || item?.location || item?.shelf,
    rawItem: selected,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export function getReceivingLineKey(line) {
  return [line.itemId, line.condition || "good", line.discrepancy || "none"].join("|");
}

export function upsertReceivingLine(current = [], nextLine) {
  const nextKey = getReceivingLineKey(nextLine);
  let merged = false;
  const next = current.map((line) => {
    if (getReceivingLineKey(line) !== nextKey) return line;
    merged = true;
    const receivedQty = Number(line.receivedQty || 0) + Number(nextLine.receivedQty || 0);
    return {
      ...line,
      receivedQty: Number(receivedQty.toFixed(3)),
      quantity: Number(receivedQty.toFixed(3)),
      updatedAt: nowIso(),
    };
  });
  return merged ? next : [nextLine, ...current];
}

export function buildReceivingRequest({ supplierId, supplierName, poReference, receivingMode, items = [] }) {
  const createdAt = nowIso();
  return {
    requestId: makeId("recv_req"),
    supplierId,
    supplierName,
    poReference: poReference || undefined,
    receivingMode,
    status: requestStatusForNetwork(),
    sourceWorkflow: "ScanOps Receiving",
    items,
    ...getActorFields(),
    createdAt,
    submittedAt: createdAt,
    appliesStockDirectly: false,
    stockPostingOwner: "Invyra Inventory",
  };
}

export function saveReceivingRequest(request) {
  safeWrite(RECEIVING_STORAGE_KEY, [request, ...safeRead(RECEIVING_STORAGE_KEY)].slice(0, 100));
  return request;
}

export function getReceivingRequests() {
  return safeRead(RECEIVING_STORAGE_KEY);
}

export function buildTransferRequest({ transferType, sourceLocationId, destinationLocationId, reason, item, quantity, availableAtSource }) {
  const selected = normalizeSelectedScanItem(item, "manual_search");
  const createdAt = nowIso();
  return {
    requestId: makeId("trf_req"),
    transferType,
    sourceLocationId,
    destinationLocationId,
    reason,
    status: requestStatusForNetwork(),
    sourceWorkflow: "ScanOps Transfers",
    items: [
      {
        requestItemId: makeId("trf_item"),
        itemId: selected?.itemId || makeId("item"),
        itemName: selected?.itemName || "Scanned item",
        sku: selected?.sku,
        barcode: selected?.barcode,
        requestedQty: Number(quantity || 0),
        quantity: Number(quantity || 0),
        unit: selected?.unit || item?.unitType || item?.unit_type || "each",
        availableAtSource,
        sourceSnapshotAt: createdAt,
        rawItem: selected,
      },
    ],
    ...getActorFields(),
    createdAt,
    submittedAt: createdAt,
    appliesStockDirectly: false,
    stockPostingOwner: "Invyra Inventory",
  };
}

export function saveTransferRequest(request) {
  safeWrite(TRANSFER_STORAGE_KEY, [request, ...safeRead(TRANSFER_STORAGE_KEY)].slice(0, 100));
  return request;
}

export function getTransferRequests() {
  return safeRead(TRANSFER_STORAGE_KEY);
}
