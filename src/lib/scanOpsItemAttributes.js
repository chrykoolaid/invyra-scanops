import { getScanOpsSession } from "./scanOpsSession";
import { normalizeSelectedScanItem } from "./scanOpsWorkflowBatch";
import { buildInventorySnapshotEvidence, inventorySnapshotEventFields } from "./inventory/inventorySnapshotEvidence";

const SNAPSHOT_STORAGE_KEY = "invyra_scanops_workflow_item_attribute_snapshots_v1";
const EXPIRY_STORAGE_KEY = "invyra_scanops_expiry_evidence_v1";
const LOT_STORAGE_KEY = "invyra_scanops_lot_batch_evidence_v1";
const WEIGHTED_STORAGE_KEY = "invyra_scanops_weighted_item_evidence_v1";
const ATTRIBUTE_STORAGE_KEY = "invyra_scanops_scan_item_attributes_v1";

export const QUANTITY_TYPE_OPTIONS = [
  { id: "packs", label: "Packs" },
  { id: "each", label: "Each" },
  { id: "kg", label: "kg" },
  { id: "g", label: "g" },
  { id: "cases", label: "Cases" },
];

export const WEIGHT_SOURCE_OPTIONS = [
  { id: "label_weight", label: "Label weight" },
  { id: "manual_entry", label: "Manual entry" },
  { id: "scale_unavailable", label: "Scale unavailable" },
  { id: "unknown", label: "Unknown" },
];

export const COUNT_CONDITION_NOTE_OPTIONS = [
  { id: "normal", label: "Normal" },
  { id: "short_dated", label: "Short dated" },
  { id: "damaged", label: "Damaged" },
  { id: "mixed_lots", label: "Mixed lots" },
];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clean(value) {
  return String(value ?? "").trim();
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

function getActorFields() {
  const session = getScanOpsSession();
  return {
    created_by: session.actorName || session.user_name || "Scanner operator",
    created_role: session.actorRole || session.role || "Staff",
    actor_user_id: session.actorUserId || session.user_id || "staff_001",
    device_id: session.deviceId || session.scannerId || "SCANOPS_001",
    store_id: session.storeId || session.location_id || "store_001",
  };
}

export function isWeightedBarcodeCandidate(value) {
  const raw = clean(value).replace(/\s/g, "");
  return /^2\d{12}$/.test(raw);
}

export function isWeightedItem(item) {
  if (!item) return false;
  const sellType = item.sellType || item.sell_type;
  const unit = item.unitType || item.unit_type || item.unit;
  return Boolean(item.isWeighted || item.isRandomWeight || item.requiresScale || sellType === "RANDOM_WEIGHT" || sellType === "LOOSE_WEIGHT" || unit === "kg");
}

export function getCapturedBarcode(item, scanValue = "") {
  return clean(scanValue) || item?._searchMatch?.matchedValue || item?.barcode || item?.gtin || "";
}

export function getDefaultExpiryDate(item) {
  return item?.expiryDate || item?.expiry_date || "";
}

export function getDefaultLotBatch(item) {
  return item?.lotId || item?.lot_id || item?.batchId || item?.batch_id || "";
}

export function getDefaultQuantityType(item) {
  const unit = item?.unitType || item?.unit_type || item?.unit || "each";
  if (unit === "kg") return "kg";
  if (unit === "g") return "g";
  if (unit === "case" || unit === "cases") return "cases";
  if (unit === "pack" || unit === "packs") return "packs";
  return "each";
}

export function needsWeightedEvidence(item, rawBarcode = "") {
  return isWeightedItem(item) || isWeightedBarcodeCandidate(rawBarcode || item?._searchMatch?.matchedValue || item?.barcode || item?.gtin);
}

export function buildWorkflowItemAttributeSnapshot({
  workflowType,
  workflowItemId,
  item,
  scanValue = "",
  expiryDate = "",
  lotBatch = "",
  quantityType = "each",
  enteredQuantity = "",
  weightSource = "unknown",
  conditionNote = "",
  source = "operator_entry",
}) {
  const selected = normalizeSelectedScanItem(item, "attribute_capture");
  const rawBarcode = getCapturedBarcode(item, scanValue);
  const weightedCandidate = needsWeightedEvidence(item, rawBarcode);
  const normalizedExpiry = clean(expiryDate);
  const normalizedLotBatch = clean(lotBatch);
  const normalizedQuantity = clean(enteredQuantity);
  const normalizedCondition = clean(conditionNote);
  const createdAt = nowIso();
  const idBase = makeId("attr_snapshot");
  const actor = getActorFields();
  const itemId = selected?.itemId || item?.internalItemId || item?.itemId || item?.id || item?.sku || "unknown_item";

  const inventoryEvidence = buildInventorySnapshotEvidence(item, {
    item_id: itemId,
    sku: selected?.sku,
    barcode: selected?.barcode || rawBarcode || undefined,
  });
  const inventoryEvidenceFields = inventorySnapshotEventFields(inventoryEvidence);

  const itemSnapshot = selected ? {
    item_id: itemId,
    sku: selected.sku,
    barcode: selected.barcode || rawBarcode || undefined,
    plu: selected.plu,
    item_name: selected.itemName,
    department: selected.department,
    category: selected.category,
    unit: selected.unit,
    sell_type: item?.sellType || item?.sell_type,
    weighted_item: isWeightedItem(item),
    ...inventoryEvidenceFields,
  } : null;

  const expirySnapshot = normalizedExpiry ? {
    id: makeId("expiry_ev"),
    workflow_id: workflowItemId || idBase,
    workflow_type: workflowType,
    item_id: itemId,
    expiry_date: normalizedExpiry,
    confidence: "operator_entered",
    source,
    ...actor,
    created_at: createdAt,
  } : null;

  const lotBatchSnapshot = normalizedLotBatch ? {
    id: makeId("lot_ev"),
    workflow_id: workflowItemId || idBase,
    workflow_type: workflowType,
    item_id: itemId,
    lot_batch_value: normalizedLotBatch,
    source,
    ...actor,
    created_at: createdAt,
  } : null;

  const weightedSnapshot = weightedCandidate || normalizedQuantity ? {
    id: makeId("weight_ev"),
    workflow_id: workflowItemId || idBase,
    workflow_type: workflowType,
    item_id: itemId,
    raw_barcode: rawBarcode || undefined,
    weighted_candidate: Boolean(weightedCandidate),
    quantity_type: quantityType || getDefaultQuantityType(item),
    entered_quantity: normalizedQuantity ? Number(normalizedQuantity) : null,
    weight_source: weightSource || "unknown",
    source,
    ...actor,
    created_at: createdAt,
  } : null;

  const attributeRows = [
    normalizedExpiry ? { attribute_type: "expiry", value: normalizedExpiry } : null,
    normalizedLotBatch ? { attribute_type: "lot_batch", value: normalizedLotBatch } : null,
    weightedSnapshot ? { attribute_type: "weighted_evidence", value: [weightedSnapshot.quantity_type, weightedSnapshot.entered_quantity, weightedSnapshot.weight_source].filter((part) => part !== null && part !== undefined && part !== "").join(" · ") } : null,
    normalizedCondition ? { attribute_type: "condition_note", value: normalizedCondition } : null,
  ].filter(Boolean).map((row) => ({
    id: makeId("scan_attr"),
    item_id: itemId,
    sku: selected?.sku,
    barcode: selected?.barcode || rawBarcode || undefined,
    source_workflow: workflowType,
    source,
    ...actor,
    created_at: createdAt,
    ...row,
  }));

  const snapshot = {
    id: idBase,
    workflow_type: workflowType,
    workflow_item_id: workflowItemId || idBase,
    item_snapshot: itemSnapshot,
    ...inventoryEvidenceFields,
    expiry_snapshot: expirySnapshot,
    lot_batch_snapshot: lotBatchSnapshot,
    weighted_snapshot: weightedSnapshot,
    condition_note: normalizedCondition || undefined,
    scan_item_attributes: attributeRows,
    created_at: createdAt,
  };

  return {
    ...snapshot,
    attributeKey: [normalizedExpiry, normalizedLotBatch, weightedSnapshot?.quantity_type, weightedSnapshot?.entered_quantity, weightedSnapshot?.weight_source, normalizedCondition].filter(Boolean).join("|") || "none",
  };
}

export function saveWorkflowItemAttributeSnapshot(snapshot) {
  if (!snapshot) return null;
  safeWrite(SNAPSHOT_STORAGE_KEY, [snapshot, ...safeRead(SNAPSHOT_STORAGE_KEY)].slice(0, 120));
  if (snapshot.expiry_snapshot) safeWrite(EXPIRY_STORAGE_KEY, [snapshot.expiry_snapshot, ...safeRead(EXPIRY_STORAGE_KEY)].slice(0, 120));
  if (snapshot.lot_batch_snapshot) safeWrite(LOT_STORAGE_KEY, [snapshot.lot_batch_snapshot, ...safeRead(LOT_STORAGE_KEY)].slice(0, 120));
  if (snapshot.weighted_snapshot) safeWrite(WEIGHTED_STORAGE_KEY, [snapshot.weighted_snapshot, ...safeRead(WEIGHTED_STORAGE_KEY)].slice(0, 120));
  if (snapshot.scan_item_attributes?.length) safeWrite(ATTRIBUTE_STORAGE_KEY, [...snapshot.scan_item_attributes, ...safeRead(ATTRIBUTE_STORAGE_KEY)].slice(0, 200));
  return snapshot;
}

export function getWorkflowItemAttributeSnapshots() {
  return safeRead(SNAPSHOT_STORAGE_KEY);
}

export function summarizeAttributeSnapshot(snapshot) {
  if (!snapshot) return "No attribute evidence";
  const parts = [];
  if (snapshot.expiry_snapshot?.expiry_date) parts.push(`Expiry ${snapshot.expiry_snapshot.expiry_date}`);
  if (snapshot.lot_batch_snapshot?.lot_batch_value) parts.push(`Lot ${snapshot.lot_batch_snapshot.lot_batch_value}`);
  if (snapshot.weighted_snapshot?.weighted_candidate || snapshot.weighted_snapshot?.entered_quantity) {
    const weight = snapshot.weighted_snapshot.entered_quantity ? `${snapshot.weighted_snapshot.entered_quantity} ${snapshot.weighted_snapshot.quantity_type || ""}`.trim() : "candidate";
    parts.push(`Weighted ${weight}`);
  }
  if (snapshot.condition_note) parts.push(`Condition ${snapshot.condition_note.replace(/_/g, " ")}`);
  return parts.join(" · ") || "No attribute evidence";
}
