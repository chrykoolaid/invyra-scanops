import { getLocalInventorySnapshot } from "./inventorySystemAdapter";
import { attachMatchToItem, getIdentityDisplay, getMatchReasonDisplay, resolveProductIdentityWithMatch, searchProductIdentities } from "./productIdentityResolver";

function clean(value) {
  return String(value ?? "").trim().toLowerCase();
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = clean(item.internalItemId || item.productId || item.sku || item.barcode || item.plu || item.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveItemEntry(input) {
  const value = typeof input === "object" ? input : String(input || "").trim();
  if (!value) return null;
  const items = getLocalInventorySnapshot().items || [];
  return attachMatchToItem(resolveProductIdentityWithMatch(value, items));
}

export function searchItemEntries(input, limit = 6) {
  const value = String(input || "").trim();
  if (value.length < 2) return [];
  const items = getLocalInventorySnapshot().items || [];
  return dedupe(searchProductIdentities(value, items, limit).map(attachMatchToItem).filter(Boolean)).slice(0, limit);
}

export function getItemEntryPrimaryValue(item) {
  const matchValue = item?._searchMatch?.matchedValue;
  return matchValue || item?.barcode || item?.gtin || item?.plu || item?.sku || item?.internalItemId || item?.name || "";
}

export function getItemEntrySecondaryLabel(item) {
  if (!item) return "";
  return [getIdentityDisplay(item), item.department || item.category, item.shelfLocation || item.location].filter(Boolean).join(" · ");
}

export function getItemEntryMatchLabel(item) {
  return getMatchReasonDisplay(item);
}
