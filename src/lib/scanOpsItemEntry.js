/**
 * scanOpsItemEntry.js — Phase C refactor
 *
 * Item search/resolve now uses the active InventoryProvider (async).
 * Synchronous helpers (searchItemEntries, resolveItemEntry) retain their
 * sync signatures for compatibility with WorkflowHeader and existing pages,
 * but internally use the warmed _syncCache from inventorySystemAdapter.
 */
import { getLocalInventorySnapshot } from "./inventorySystemAdapter";
import { attachMatchToItem, getIdentityDisplay, getMatchReasonDisplay, resolveProductIdentityWithMatch, searchProductIdentities } from "./productIdentityResolver";
import { getActiveInventoryProvider } from "./inventory/activeInventoryProvider";

function clean(value) { return String(value ?? "").trim().toLowerCase(); }

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = clean(item.internalItemId || item.item_id || item.sku || item.barcode || item.plu || item.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Synchronous helpers (use warm in-memory cache from inventorySystemAdapter) ──

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

// ── Async helpers (use active provider — safe for non-scan contexts) ──

export async function searchItemEntriesAsync(input, limit = 6) {
  const value = String(input || "").trim();
  if (value.length < 2) return [];
  const provider = getActiveInventoryProvider();
  return provider.searchItems(value, limit);
}

export async function resolveItemEntryAsync(input) {
  if (!input) return null;
  const provider = getActiveInventoryProvider();
  const value = typeof input === "string" ? input : input?.barcode || input?.sku || "";
  return provider.getItemSnapshot(value);
}

// ── Display helpers (unchanged) ──

export function getItemEntryPrimaryValue(item) {
  const matchValue = item?._searchMatch?.matchedValue;
  return matchValue || item?.barcode || item?.gtin || item?.plu || item?.sku || item?.internalItemId || item?.item_id || item?.name || "";
}

export function getItemEntrySecondaryLabel(item) {
  if (!item) return "";
  return [getIdentityDisplay(item), item.department || item.category, item.shelfLocation || item.location_name || item.location].filter(Boolean).join(" · ");
}

export function getItemEntryMatchLabel(item) {
  return getMatchReasonDisplay(item);
}