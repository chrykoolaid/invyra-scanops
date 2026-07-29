export function valueOf(item, keys, fallback = "—") {
  if (!item) return fallback;
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

export function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

export function yesNo(value) {
  if (value === null || value === undefined) return "—";
  return value ? "Yes" : "No";
}

export function mergeItemData(lookupItem, viewItem) {
  const base = viewItem || {};
  const fallback = lookupItem || {};
  const pick = (keys) => {
    for (const key of keys) {
      if (hasValue(base[key])) return base[key];
      if (hasValue(fallback[key])) return fallback[key];
    }
    return null;
  };
  return {
    canonicalItemId: pick(["canonicalItemId", "canonical_item_id"]),
    itemName: pick(["itemName", "item_name"]),
    shortDisplayName: base.shortDisplayName || null,
    sku: pick(["sku"]),
    primaryBarcode: pick(["primaryBarcode", "primary_barcode"]),
    brand: pick(["brand"]),
    category: pick(["category"]),
    packSize: pick(["packSize", "pack_size"]),
    unitOfMeasure: pick(["unitOfMeasure", "unit_of_measure", "uom"]),
    lifecycleStatus: pick(["lifecycleStatus", "lifecycle_status"]),
    isActive: hasValue(base.isActive) ? base.isActive : fallback.isActive,
    primaryLocation: pick(["primaryLocation", "primary_location"]),
    authoritativeQuantity: pick(["authoritativeQuantity", "authoritative_quantity"]),
    alternateBarcodes: base.alternateBarcodes || fallback.alternateBarcodes || null,
    batchTracked: pick(["batchTracked", "batch_tracked"]),
    expiryTracked: pick(["expiryTracked", "expiry_tracked"]),
    serialised: pick(["serialised", "serialized"]),
    minimumShelfLifeDays: pick(["minimumShelfLifeDays", "minimum_shelf_life_days"]),
    storageGuidance: pick(["storageGuidance", "storage_guidance"]),
    updatedDate: pick(["updatedDate", "updated_date"]),
  };
}

export function describeItem(item) {
  const parts = [
    item.brand,
    item.packSize,
    item.category,
  ].filter(hasValue);
  return parts.length ? parts.join(" · ") : null;
}

export function identityLabel(item) {
  if (!item) return "—";
  const sellId = item.canonicalItemId ? `Sell ID: ${item.canonicalItemId}` : null;
  const sku = item.sku ? `SKU: ${item.sku}` : null;
  const barcode = item.primaryBarcode ? `Barcode: ${item.primaryBarcode}` : null;
  return [sellId, sku, barcode].filter(Boolean).join(" · ") || "—";
}

export function detectLookupType(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  if (/^\d{6,}$/.test(trimmed)) return "BARCODE";
  if (!/\s/.test(trimmed) && trimmed.length <= 32 && /^[A-Za-z0-9\-_]+$/.test(trimmed)) return "SKU";
  return "NAME";
}