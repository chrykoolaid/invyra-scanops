import { INVENTORY_SNAPSHOT_ITEMS, normalizeInventoryItem, SELL_TYPES } from "./inventorySnapshot";

export const SEARCH_MATCH_TYPES = {
  BARCODE_EXACT: "barcode_exact",
  BARCODE_ALIAS: "barcode_alias",
  PLU_EXACT: "plu_exact",
  SKU_EXACT: "sku_exact",
  SUPPLIER_CODE: "supplier_code",
  NAME_EXACT: "name_exact",
  NAME_PARTIAL: "name_partial",
  DEPARTMENT: "department",
  SHELF_LOCATION: "shelf_location",
};

const MATCH_PRIORITY = {
  [SEARCH_MATCH_TYPES.BARCODE_EXACT]: 10,
  [SEARCH_MATCH_TYPES.BARCODE_ALIAS]: 20,
  [SEARCH_MATCH_TYPES.PLU_EXACT]: 30,
  [SEARCH_MATCH_TYPES.SKU_EXACT]: 40,
  [SEARCH_MATCH_TYPES.SUPPLIER_CODE]: 50,
  [SEARCH_MATCH_TYPES.NAME_EXACT]: 60,
  [SEARCH_MATCH_TYPES.NAME_PARTIAL]: 70,
  [SEARCH_MATCH_TYPES.DEPARTMENT]: 80,
  [SEARCH_MATCH_TYPES.SHELF_LOCATION]: 90,
};

function clean(value) {
  return String(value ?? "").trim().toLowerCase();
}

function compact(value) {
  return clean(value).replace(/[^a-z0-9]/g, "");
}

function same(a, b) {
  return clean(a) && clean(a) === clean(b);
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function itemKey(item) {
  return clean(item?.internalItemId || item?.productId || item?.itemId || item?.sku || item?.barcode || item?.name);
}

function normalized(item) {
  if (!item) return null;
  const normalizedItem = normalizeInventoryItem(item);
  const sellType = normalizedItem.sellType || normalizedItem.sell_type;
  const unit = normalizedItem.unitType || normalizedItem.unit_type || normalizedItem.unit || "each";
  return {
    ...normalizedItem,
    productId: normalizedItem.productId || normalizedItem.internalItemId || normalizedItem.id,
    itemId: normalizedItem.itemId || normalizedItem.internalItemId || normalizedItem.id,
    barcodes: unique([normalizedItem.barcode, normalizedItem.gtin, ...asArray(normalizedItem.barcodes)]),
    barcodeAliases: unique(asArray(normalizedItem.barcodeAliases || normalizedItem.aliasBarcodes)),
    aliases: unique(asArray(normalizedItem.aliases)),
    supplierCodes: unique(asArray(normalizedItem.supplierCodes)),
    unit,
    isWeighted: normalizedItem.isWeighted ?? (sellType === SELL_TYPES.LOOSE_WEIGHT || unit === "kg"),
    isRandomWeight: normalizedItem.isRandomWeight ?? (sellType === SELL_TYPES.RANDOM_WEIGHT),
    requiresScale: normalizedItem.requiresScale ?? (sellType === SELL_TYPES.LOOSE_WEIGHT || sellType === SELL_TYPES.RANDOM_WEIGHT),
    status: normalizedItem.status || "active",
  };
}

function makeMatch(rawItem, matchType, matchedValue, displayReason, confidence = "high", extra = {}) {
  const item = normalized(rawItem);
  if (!item) return null;
  return {
    productId: item.productId || item.internalItemId || item.id,
    item,
    matchType,
    confidence,
    matchedValue: matchedValue == null ? "" : String(matchedValue),
    displayReason,
    priority: MATCH_PRIORITY[matchType] || 999,
    ...extra,
  };
}

function exactFromList(values, input) {
  const match = asArray(values).find((value) => same(value, input));
  return match || null;
}

function partialFromList(values, input) {
  const value = clean(input);
  if (!value) return null;
  const match = asArray(values).find((entry) => clean(entry).includes(value));
  return match || null;
}

function isBarcodeLike(input) {
  const value = String(input || "").trim();
  return /^\d{8,14}$/.test(value);
}

function isPluLike(input) {
  const value = String(input || "").trim();
  return /^\d{3,5}$/.test(value);
}

function matchesForItem(rawItem, input) {
  const value = String(input ?? "").trim();
  const norm = clean(value);
  const packed = compact(value);
  if (!norm) return [];

  const item = normalized(rawItem);
  if (!item || item.status === "blocked") return [];

  const primaryBarcode = exactFromList([item.barcode, item.gtin], value);
  if (primaryBarcode) return [makeMatch(item, SEARCH_MATCH_TYPES.BARCODE_EXACT, primaryBarcode, "Matched by barcode", "high")];

  const barcodeAlias = exactFromList([...asArray(item.barcodes).filter((code) => !same(code, item.barcode) && !same(code, item.gtin)), ...asArray(item.barcodeAliases)], value);
  if (barcodeAlias) {
    const aliasType = asArray(item.cartonBarcodes).some((code) => same(code, barcodeAlias)) ? "carton barcode" : "barcode alias";
    return [makeMatch(item, SEARCH_MATCH_TYPES.BARCODE_ALIAS, barcodeAlias, `Matched by ${aliasType}`, "high", { aliasType })];
  }

  const plu = exactFromList([item.plu, item.scaleCode], value);
  if (plu && isPluLike(value)) return [makeMatch(item, SEARCH_MATCH_TYPES.PLU_EXACT, plu, "Matched by PLU", "high")];

  const sku = exactFromList([item.sku, item.internalItemId, item.productId, item.itemId], value);
  if (sku) return [makeMatch(item, SEARCH_MATCH_TYPES.SKU_EXACT, sku, "Matched by SKU", "high")];

  const supplierCode = exactFromList(item.supplierCodes, value);
  if (supplierCode) return [makeMatch(item, SEARCH_MATCH_TYPES.SUPPLIER_CODE, supplierCode, "Matched by supplier code", "high")];

  const exactName = exactFromList([item.name, item.item_name, ...asArray(item.aliases)], value);
  if (exactName) return [makeMatch(item, SEARCH_MATCH_TYPES.NAME_EXACT, exactName, "Matched by product name", "high")];

  const nameFields = [item.name, item.item_name, item.brand, item.size, ...asArray(item.aliases)].filter(Boolean);
  const partialName = partialFromList(nameFields, value) || nameFields.find((entry) => compact(entry).includes(packed));
  if (partialName && norm.length >= 2) return [makeMatch(item, SEARCH_MATCH_TYPES.NAME_PARTIAL, partialName, "Matched by product name", "medium")];

  const department = exactFromList([item.department, item.category, item.subcategory], value) || partialFromList([item.department, item.category, item.subcategory], value);
  if (department && norm.length >= 3) return [makeMatch(item, SEARCH_MATCH_TYPES.DEPARTMENT, department, "Matched by department", "low")];

  const shelf = exactFromList([item.shelfLocation, item.location, item.aisle, item.bay, item.shelf], value) || partialFromList([item.shelfLocation, item.location, item.aisle, item.bay, item.shelf], value);
  if (shelf && norm.length >= 2) return [makeMatch(item, SEARCH_MATCH_TYPES.SHELF_LOCATION, shelf, "Matched by shelf location", "low")];

  // Pure numeric product searches that did not hit a barcode/PLU should stay unknown, not fuzzy-match random SKUs.
  if (/^\d+$/.test(value) && (isBarcodeLike(value) || isPluLike(value))) return [];

  return [];
}

export function searchProductIdentities(input, items = INVENTORY_SNAPSHOT_ITEMS, limit = 8) {
  const value = String(input ?? "").trim();
  if (!value) return [];

  const bestByItem = new Map();
  (items || []).forEach((rawItem) => {
    const matches = matchesForItem(rawItem, value);
    matches.forEach((match) => {
      if (!match) return;
      const key = itemKey(match.item);
      const current = bestByItem.get(key);
      if (!current || match.priority < current.priority) bestByItem.set(key, match);
    });
  });

  return [...bestByItem.values()]
    .sort((a, b) => a.priority - b.priority || String(a.item.name || "").localeCompare(String(b.item.name || "")))
    .slice(0, limit);
}

export function resolveProductIdentityWithMatch(input, items = INVENTORY_SNAPSHOT_ITEMS) {
  if (!input) return null;
  if (typeof input === "object" && input.item) return input;
  if (typeof input === "object" && input._searchMatch) {
    const item = normalized(input);
    return item ? { ...input._searchMatch, item, productId: item.productId || item.internalItemId || item.id } : null;
  }
  if (typeof input === "object" && (input.internalItemId || input.itemId || input.id || input.productId || input.sku || input.barcode || input.gtin || input.plu || input.scaleCode)) {
    const identityInput = input.internalItemId || input.itemId || input.id || input.productId || input.barcode || input.gtin || input.plu || input.scaleCode || input.sku;
    const match = searchProductIdentities(identityInput, items, 1)[0];
    if (match) return match;
    const normalizedInput = normalized(input);
    return normalizedInput ? makeMatch(normalizedInput, SEARCH_MATCH_TYPES.SKU_EXACT, getIdentityDisplay(normalizedInput), "Selected item", "high") : null;
  }
  return searchProductIdentities(input, items, 1)[0] || null;
}

export function resolveByBarcode(barcode, items = INVENTORY_SNAPSHOT_ITEMS) {
  const match = searchProductIdentities(barcode, items, 1).find((entry) => [SEARCH_MATCH_TYPES.BARCODE_EXACT, SEARCH_MATCH_TYPES.BARCODE_ALIAS].includes(entry.matchType));
  return match?.item || null;
}
export function resolveByGTIN(gtin, items = INVENTORY_SNAPSHOT_ITEMS) { return resolveByBarcode(gtin, items); }
export function resolveByPLU(plu, items = INVENTORY_SNAPSHOT_ITEMS) {
  const match = searchProductIdentities(plu, items, 1).find((entry) => entry.matchType === SEARCH_MATCH_TYPES.PLU_EXACT);
  return match?.item || null;
}
export function resolveBySKU(sku, items = INVENTORY_SNAPSHOT_ITEMS) {
  const match = searchProductIdentities(sku, items, 1).find((entry) => entry.matchType === SEARCH_MATCH_TYPES.SKU_EXACT);
  return match?.item || null;
}
export function resolveByScaleCode(scaleCode, items = INVENTORY_SNAPSHOT_ITEMS) { return resolveByPLU(scaleCode, items); }
export function resolveByBatchOrLot(batchOrLot, items = INVENTORY_SNAPSHOT_ITEMS) {
  const value = String(batchOrLot || "").trim();
  return normalized((items || []).find((item) => same(item.batchId, value) || same(item.lotId, value)) || null);
}
export function resolveByInternalItemId(internalItemId, items = INVENTORY_SNAPSHOT_ITEMS) {
  const value = String(internalItemId || "").trim();
  return normalized((items || []).find((item) => same(item.internalItemId, value) || same(item.productId, value) || same(item.itemId, value)) || null);
}
export function resolveProductIdentity(input, items = INVENTORY_SNAPSHOT_ITEMS) {
  const match = resolveProductIdentityWithMatch(input, items);
  return attachMatchToItem(match);
}
export function getSellTypeForItem(item) { return item?.sellType || "PACKAGED"; }
export function getIdentityDisplay(item) {
  if (!item) return "No identity";
  const parts = [
    item.plu ? `PLU ${item.plu}` : null,
    item.gtin || item.barcode ? `GTIN ${item.gtin || item.barcode}` : null,
    item.sku ? `SKU ${item.sku}` : null,
    item.scaleCode && item.scaleCode !== item.plu ? `Scale ${item.scaleCode}` : null,
  ].filter(Boolean);
  return parts.join(" · ") || item.internalItemId || item.id || "Identity pending";
}
export function getMatchReasonDisplay(itemOrMatch) {
  const match = itemOrMatch?.matchType ? itemOrMatch : itemOrMatch?._searchMatch;
  return match?.displayReason || "Selected item";
}
export function attachMatchToItem(match) {
  if (!match?.item) return null;
  return {
    ...match.item,
    _searchMatch: {
      productId: match.productId,
      matchType: match.matchType,
      confidence: match.confidence,
      displayReason: match.displayReason,
      matchedValue: match.matchedValue,
      aliasType: match.aliasType,
    },
  };
}
