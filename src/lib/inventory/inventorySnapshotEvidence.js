/**
 * inventorySnapshotEvidence
 *
 * Creates a compact, immutable evidence reference for the Inventory item snapshot
 * the operator saw at capture time. This is attached to Markdown requests,
 * attribute evidence, label handoffs, and event_outbox records so Inventory can
 * validate ScanOps events against the stock/price context used on the handheld.
 *
 * This module is read-only: it never mutates Inventory stock, Item Master price,
 * POS lines, or StockMovement records.
 */

const SNAPSHOT_SCHEMA_VERSION = "1.0.0";

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "") ?? null;
}

function sanitize(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function simpleHash(value) {
  const input = String(value || "");
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildInventorySnapshotEvidence(item = {}, overrides = {}) {
  const raw = item?.raw || item || {};
  const source = firstDefined(overrides.source, raw.source, item.source, "INVENTORY");
  const schemaVersion = firstDefined(overrides.schema_version, raw.schema_version, item.schema_version, SNAPSHOT_SCHEMA_VERSION);
  const itemId = firstDefined(
    overrides.item_id,
    raw.item_id,
    raw.internalItemId,
    raw.itemId,
    raw.productId,
    raw.id,
    item.item_id,
    item.itemId,
    item.internalItemId,
    item.id,
    raw.sku,
    item.sku
  );

  const snapshot = {
    item_id: itemId,
    sku: firstDefined(overrides.sku, raw.sku, item.sku),
    barcode: firstDefined(overrides.barcode, raw.barcode, raw.gtin, item.barcode, item.gtin),
    barcode_aliases: firstDefined(overrides.barcode_aliases, raw.barcode_aliases, raw.barcodeAliases, raw.aliasBarcodes, item.barcode_aliases, item.barcodeAliases, []),
    item_name: firstDefined(overrides.item_name, raw.item_name, raw.name, item.item_name, item.name, item.itemName),
    category: firstDefined(overrides.category, raw.category, raw.department, item.category, item.department),
    uom: firstDefined(overrides.uom, raw.uom, raw.unitType, raw.unit_type, raw.unit, item.uom, item.unitType, item.unit_type, item.unit, "each"),
    current_unit_price: numberOrNull(firstDefined(overrides.current_unit_price, raw.current_unit_price, raw.currentPrice, raw.current_price, raw.price, item.current_unit_price, item.currentPrice, item.current_price, item.price)),
    on_hand_qty: numberOrNull(firstDefined(overrides.on_hand_qty, raw.on_hand_qty, raw.stockOnHand, raw.stock_on_hand, raw.soh, item.on_hand_qty, item.stockOnHand, item.stock_on_hand, item.soh)),
    available_qty: numberOrNull(firstDefined(overrides.available_qty, raw.available_qty, raw.shelfStock, raw.shelf_stock, item.available_qty, item.shelfStock, item.shelf_stock)),
    stock_status: firstDefined(overrides.stock_status, raw.stock_status, raw.status, item.stock_status, item.status),
    location_id: firstDefined(overrides.location_id, raw.location_id, raw.locationId, raw.shelfLocation, item.location_id, item.locationId, item.shelfLocation),
    location_name: firstDefined(overrides.location_name, raw.location_name, raw.locationName, raw.location, raw.shelfLocation, item.location_name, item.locationName, item.location, item.shelfLocation),
    batch_id: firstDefined(overrides.batch_id, raw.batch_id, raw.batchId, item.batch_id, item.batchId),
    expiry_date: firstDefined(overrides.expiry_date, raw.expiry_date, raw.expiryDate, item.expiry_date, item.expiryDate),
    sell_by_date: firstDefined(overrides.sell_by_date, raw.sell_by_date, raw.sellByDate, raw.expiryDate, item.sell_by_date, item.sellByDate, item.expiryDate),
    markdown_status: firstDefined(overrides.markdown_status, raw.markdown_status, raw.markdownStatus, raw.markdownEligible === false ? "not_eligible" : raw.markdownEligible === true ? "eligible" : null, item.markdown_status, item.markdownStatus),
    active_markdown_overlay_id: firstDefined(overrides.active_markdown_overlay_id, raw.active_markdown_overlay_id, raw.activeMarkdownOverlayId, item.active_markdown_overlay_id, item.activeMarkdownOverlayId),
    inventory_record_version: firstDefined(overrides.inventory_record_version, raw.inventory_record_version, raw.updated_date, raw.updatedAt, raw.version, item.inventory_record_version, item.updated_date, item.updatedAt, item.version),
    last_price_sync_at: firstDefined(overrides.last_price_sync_at, raw.last_price_sync_at, raw.lastPriceSyncAt, raw.updated_date, item.last_price_sync_at, item.lastPriceSyncAt, item.updated_date),
    last_inventory_sync_at: firstDefined(overrides.last_inventory_sync_at, raw.last_inventory_sync_at, raw.lastInventorySyncAt, item.last_inventory_sync_at, item.lastInventorySyncAt, raw.updated_date, item.updated_date),
    source,
    schema_version: schemaVersion,
  };

  const snapshotHash = simpleHash(stableStringify(snapshot));
  const snapshotId = `inv_snap_${sanitize(source).toLowerCase()}_${sanitize(snapshot.item_id || snapshot.sku || snapshot.barcode)}_${snapshotHash}`;

  return {
    inventory_snapshot_id: snapshotId,
    inventory_snapshot_ref: snapshotId,
    inventory_snapshot_hash: snapshotHash,
    inventory_record_version: snapshot.inventory_record_version,
    last_inventory_sync_at: snapshot.last_inventory_sync_at,
    source,
    schema_version: schemaVersion,
    inventory_snapshot: snapshot,
  };
}

export function inventorySnapshotEventFields(evidence = {}) {
  return {
    inventory_snapshot_id: evidence.inventory_snapshot_id || evidence.inventorySnapshotId || null,
    inventory_snapshot_ref: evidence.inventory_snapshot_ref || evidence.inventorySnapshotRef || evidence.inventory_snapshot_id || evidence.inventorySnapshotId || null,
    inventory_snapshot_hash: evidence.inventory_snapshot_hash || evidence.inventorySnapshotHash || null,
    inventory_record_version: evidence.inventory_record_version || evidence.inventoryRecordVersion || null,
    last_inventory_sync_at: evidence.last_inventory_sync_at || evidence.lastInventorySyncAt || null,
    inventory_snapshot: evidence.inventory_snapshot || evidence.inventorySnapshot || null,
    source: evidence.source || evidence.inventory_snapshot?.source || evidence.inventorySnapshot?.source || "INVENTORY",
    schema_version: evidence.schema_version || evidence.inventory_snapshot?.schema_version || evidence.inventorySnapshot?.schema_version || SNAPSHOT_SCHEMA_VERSION,
  };
}
