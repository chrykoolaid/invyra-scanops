import { INVENTORY_SNAPSHOT_ITEMS, normalizeInventoryItem } from "./inventorySnapshot";

function clean(value) { return String(value ?? "").trim().toLowerCase(); }
function same(a, b) { return clean(a) && clean(a) === clean(b); }

export function resolveByBarcode(barcode, items = INVENTORY_SNAPSHOT_ITEMS) {
  return normalizeInventoryItem(items.find((item) => same(item.barcode, barcode) || same(item.gtin, barcode)) || null);
}
export function resolveByGTIN(gtin, items = INVENTORY_SNAPSHOT_ITEMS) { return resolveByBarcode(gtin, items); }
export function resolveByPLU(plu, items = INVENTORY_SNAPSHOT_ITEMS) {
  return normalizeInventoryItem(items.find((item) => same(item.plu, plu) || same(item.scaleCode, plu)) || null);
}
export function resolveBySKU(sku, items = INVENTORY_SNAPSHOT_ITEMS) {
  return normalizeInventoryItem(items.find((item) => same(item.sku, sku)) || null);
}
export function resolveByScaleCode(scaleCode, items = INVENTORY_SNAPSHOT_ITEMS) { return resolveByPLU(scaleCode, items); }
export function resolveByBatchOrLot(batchOrLot, items = INVENTORY_SNAPSHOT_ITEMS) {
  return normalizeInventoryItem(items.find((item) => same(item.batchId, batchOrLot) || same(item.lotId, batchOrLot)) || null);
}
export function resolveByInternalItemId(internalItemId, items = INVENTORY_SNAPSHOT_ITEMS) {
  return normalizeInventoryItem(items.find((item) => same(item.internalItemId, internalItemId)) || null);
}
export function resolveProductIdentity(input, items = INVENTORY_SNAPSHOT_ITEMS) {
  if (!input) return null;
  if (typeof input === "object") {
    return resolveByInternalItemId(input.internalItemId || input.itemId || input.id, items)
      || resolveByBarcode(input.barcode, items)
      || resolveByGTIN(input.gtin, items)
      || resolveByPLU(input.plu, items)
      || resolveByScaleCode(input.scaleCode, items)
      || resolveByBatchOrLot(input.batchId || input.lotId, items)
      || resolveBySKU(input.sku, items);
  }
  const value = String(input).trim();
  return resolveByBarcode(value, items) || resolveByGTIN(value, items) || resolveByPLU(value, items) || resolveByScaleCode(value, items) || resolveByBatchOrLot(value, items) || resolveBySKU(value, items) || resolveByInternalItemId(value, items);
}
export function getSellTypeForItem(item) { return item?.sellType || "PACKAGED"; }
export function getIdentityDisplay(item) {
  if (!item) return "No identity";
  return [item.plu ? `PLU ${item.plu}` : null, item.gtin ? `GTIN ${item.gtin}` : null, item.sku ? `SKU ${item.sku}` : null, item.scaleCode ? `Scale ${item.scaleCode}` : null].filter(Boolean).join(" · ") || item.internalItemId || item.id || "Identity pending";
}
