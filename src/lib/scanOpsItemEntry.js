import { getLocalInventorySnapshot } from "./inventorySystemAdapter";
import { normalizeInventoryItem } from "./inventorySnapshot";
import { resolveProductIdentity, getIdentityDisplay } from "./productIdentityResolver";

function clean(value) {
  return String(value ?? "").trim().toLowerCase();
}

function includesField(item, value) {
  const haystack = [
    item.name,
    item.item_name,
    item.sku,
    item.barcode,
    item.gtin,
    item.plu,
    item.scaleCode,
    item.internalItemId,
    item.batchId,
    item.lotId,
    item.department,
    item.category,
    item.shelfLocation,
    item.location,
    item.aisle,
    item.bay,
    item.shelf,
  ]
    .filter(Boolean)
    .map(clean);

  return haystack.some((field) => field.includes(value));
}

function exactField(item, value) {
  const exactable = [
    item.barcode,
    item.gtin,
    item.plu,
    item.scaleCode,
    item.sku,
    item.internalItemId,
    item.batchId,
    item.lotId,
    item.name,
    item.item_name,
  ];
  return exactable.some((field) => clean(field) && clean(field) === value);
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = clean(item.internalItemId || item.sku || item.barcode || item.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveItemEntry(input) {
  const value = clean(input);
  if (!value) return null;
  const items = getLocalInventorySnapshot().items || [];
  const direct = resolveProductIdentity(input, items);
  if (direct) return direct;
  const exactName = items.find((item) => exactField(item, value));
  return normalizeInventoryItem(exactName || null);
}

export function searchItemEntries(input, limit = 5) {
  const value = clean(input);
  if (value.length < 2) return [];
  const items = getLocalInventorySnapshot().items || [];
  const direct = resolveProductIdentity(input, items);
  const exactMatches = items.filter((item) => exactField(item, value)).map(normalizeInventoryItem).filter(Boolean);
  const partialMatches = items.filter((item) => includesField(item, value)).map(normalizeInventoryItem).filter(Boolean);
  return dedupe([direct, ...exactMatches, ...partialMatches].filter(Boolean)).slice(0, limit);
}

export function getItemEntryPrimaryValue(item) {
  return item?.barcode || item?.gtin || item?.sku || item?.plu || item?.internalItemId || item?.name || "";
}

export function getItemEntrySecondaryLabel(item) {
  if (!item) return "";
  return [getIdentityDisplay(item), item.department || item.category, item.shelfLocation || item.location].filter(Boolean).join(" · ");
}
