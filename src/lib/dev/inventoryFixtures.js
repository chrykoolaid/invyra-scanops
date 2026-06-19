/**
 * DEV / DEMO FIXTURES — used ONLY when DATA_MODE = "mock"
 *
 * These are NOT real inventory records.
 * Must never be imported or used in inventory_bridge mode.
 * Named clearly as MOCK_ to prevent accidental production use.
 */

export const MOCK_SELL_TYPES = {
  PACKAGED: "PACKAGED",
  LOOSE_EACH: "LOOSE_EACH",
  LOOSE_WEIGHT: "LOOSE_WEIGHT",
  RANDOM_WEIGHT: "RANDOM_WEIGHT",
  CASE_PACK: "CASE_PACK",
  PREPARED_FOOD: "PREPARED_FOOD",
};

export const MOCK_INVENTORY_META = {
  snapshotId: "mock_inventory_dev_demo_v1",
  sourceSystem: "MOCK — Dev/Demo only",
  pulledAt: "2026-01-01T00:00:00.000Z",
  locationId: "store_dev_001",
  locationName: "[DEV] Pilot Demo Store",
};

export const MOCK_INVENTORY_ITEMS = [
  { internalItemId: "item_coke_125", sku: "GROC-COKE-NS-125", barcode: "930000000001", gtin: "930000000001", plu: null, scaleCode: null, batchId: null, lotId: null, name: "Coke No Sugar 1.25L", department: "Grocery", category: "Soft Drinks", sellType: MOCK_SELL_TYPES.PACKAGED, unitType: "each", currency: "₱", currentPrice: 98, shelfLocation: "Aisle 4 · Bay 2 · Shelf 3", backroomLocation: "Backroom Drinks Rack", aisle: "Aisle 4", bay: "Bay 2", shelf: "Shelf 3", shelfStock: 0, backroomStock: 18, stockOnHand: 18, minimumStock: 6, reorderPoint: 6, pendingDeliveryQty: 0, pendingDeliveryEta: null, expiryDate: null, freshnessStatus: "OK", markdownEligible: false, wasteReviewRequired: false, planogramStatus: "OK" },
  { internalItemId: "item_milk_2l", sku: "SKU-MILK-2L", barcode: "930000000002", gtin: "930000000002", barcodes: ["930000000002"], barcodeAliases: ["930000000022"], aliases: ["milk 2l", "full cream milk"], plu: null, scaleCode: null, batchId: null, lotId: null, name: "Milk 2L", brand: "Fresh Fields", size: "2L", department: "Dairy", category: "Milk", sellType: MOCK_SELL_TYPES.PACKAGED, unitType: "each", currency: "₱", currentPrice: 148, shelfLocation: "A2-B1", backroomLocation: "Coolroom A", aisle: "Aisle 2", bay: "Bay 1", shelf: "Shelf 2", shelfStock: 16, backroomStock: 30, stockOnHand: 46, minimumStock: 18, reorderPoint: 12, pendingDeliveryQty: 24, pendingDeliveryEta: "Tomorrow", expiryDate: "2026-05-18", freshnessStatus: "OK", markdownEligible: true, wasteReviewRequired: false, planogramStatus: "OK", status: "active" },
  { internalItemId: "item_yoghurt_1kg", sku: "SKU-YOG-1KG", barcode: "930000000004", gtin: "930000000004", barcodes: ["930000000004", "930000000099"], barcodeAliases: ["930000000099"], aliases: ["yoghurt 1kg", "greek yogurt 1kg"], plu: null, scaleCode: null, batchId: "batch_dairy_004", lotId: "lot_dairy_004", name: "Greek Yoghurt 1kg", brand: "Dairy Direct", size: "1kg", department: "Dairy", category: "Chilled Dairy", sellType: MOCK_SELL_TYPES.PACKAGED, unitType: "each", currency: "₱", currentPrice: 220, shelfLocation: "A4-B2", backroomLocation: "Coolroom B", aisle: "Aisle 2", bay: "Bay 8", shelf: "Shelf 1", shelfStock: 9, backroomStock: 12, stockOnHand: 21, minimumStock: 12, reorderPoint: 10, pendingDeliveryQty: 24, pendingDeliveryEta: "Tomorrow", expiryDate: "2026-05-06", freshnessStatus: "Near Expiry", markdownEligible: true, wasteReviewRequired: false, planogramStatus: "OK" },
  { internalItemId: "item_chicken_1kg", sku: "MEAT-CHICKEN-BREAST-1KG", barcode: "930000000008", gtin: "930000000008", barcodes: ["930000000008", "2201234506789"], barcodeAliases: ["2201234506789"], plu: null, scaleCode: "MEAT042", batchId: "batch_meat_042", lotId: "lot_meat_042", name: "Chicken Breast 1kg", department: "Fresh Meat", category: "Meat", sellType: MOCK_SELL_TYPES.RANDOM_WEIGHT, unitType: "each", currency: "₱", currentPrice: 265, pricePerKg: 280, unitCost: 185, shelfLocation: "Meat Chiller A", backroomLocation: "Meat Coolroom", aisle: "Fresh Zone", bay: "Meat Case 3", shelf: "Tray 2", shelfStock: 8, backroomStock: 14, stockOnHand: 22, minimumStock: 10, reorderPoint: 8, pendingDeliveryQty: 0, pendingDeliveryEta: null, expiryDate: "2026-05-04", freshnessStatus: "Expired", markdownEligible: false, wasteReviewRequired: true, coldChainRequired: true, planogramStatus: "OK" },
  { internalItemId: "item_strawberries_250g", sku: "PRODUCE-STRAWBERRIES-250G", barcode: "930000000009", gtin: "930000000009", plu: null, scaleCode: null, batchId: "batch_prod_009", lotId: "lot_prod_009", name: "Strawberries 250g", department: "Produce", category: "Produce", sellType: MOCK_SELL_TYPES.PACKAGED, unitType: "pack", currency: "₱", currentPrice: 155, shelfLocation: "Produce Table 1", backroomLocation: "Produce Coolroom", aisle: "Fresh Zone", bay: "Produce Table 1", shelf: "Crate 4", shelfStock: 18, backroomStock: 0, stockOnHand: 18, minimumStock: 12, reorderPoint: 8, pendingDeliveryQty: 0, pendingDeliveryEta: null, expiryDate: "", freshnessStatus: "Poor Appearance", markdownEligible: true, wasteReviewRequired: false, planogramStatus: "OK" },
  { internalItemId: "item_banana_loose", sku: "PRODUCE-BANANA-LOOSE", barcode: null, gtin: null, barcodes: [], aliases: ["banana", "bananas", "loose banana"], plu: "4011", pluType: "produce", scaleCode: "4011", batchId: null, lotId: null, name: "Bananas loose", department: "Produce", category: "Fruit", sellType: MOCK_SELL_TYPES.LOOSE_WEIGHT, unitType: "kg", currency: "₱", currentPrice: null, pricePerKg: 95, shelfLocation: "Produce Bay 2", aisle: "Fresh Zone", bay: "Produce Table 1", shelf: "Loose Fruit Bin 1", shelfStock: 18.5, backroomStock: 20, stockOnHand: 38.5, minimumStock: 20, reorderPoint: 15, pendingDeliveryQty: 0, expiryDate: "", freshnessStatus: "Condition Led", markdownEligible: true, wasteReviewRequired: false, planogramStatus: "OK", isWeighted: true, requiresScale: true, status: "active" },
  { internalItemId: "item_bread_loaf", sku: "BAKERY-BREAD-LOAF", barcode: "930000000010", gtin: "930000000010", barcodes: ["930000000010"], aliases: ["bread", "bread loaf", "white bread"], plu: null, scaleCode: null, batchId: null, lotId: null, name: "Bread loaf", department: "Bakery", category: "Bread", sellType: MOCK_SELL_TYPES.PACKAGED, unitType: "each", currency: "₱", currentPrice: 88, shelfLocation: "B1-A1", aisle: "Bakery", bay: "Bay 1", shelf: "Shelf A1", shelfStock: 14, backroomStock: 8, stockOnHand: 22, minimumStock: 10, reorderPoint: 8, pendingDeliveryQty: 0, expiryDate: "2026-05-13", freshnessStatus: "OK", markdownEligible: true, wasteReviewRequired: false, planogramStatus: "OK", status: "active" },
  { internalItemId: "item_seafood_500g", sku: "SEAFOOD-TRAY-500G", barcode: "930000000011", gtin: "930000000011", plu: null, scaleCode: "SEA011", batchId: "batch_sea_011", name: "Seafood Tray 500g", department: "Seafood", category: "Seafood", sellType: MOCK_SELL_TYPES.PACKAGED, unitType: "pack", currency: "₱", currentPrice: 340, unitCost: 250, shelfLocation: "Seafood Chiller B", aisle: "Fresh Zone", bay: "Seafood Chiller B", shelf: "Tray 4", shelfStock: 3, backroomStock: 2, stockOnHand: 5, minimumStock: 6, reorderPoint: 4, pendingDeliveryQty: 0, expiryDate: "2026-05-05", freshnessStatus: "Temperature Concern", markdownEligible: false, wasteReviewRequired: true, coldChainRequired: true, planogramStatus: "OK" },
];

// Re-export the old snapshot shape for any remaining legacy imports
export function getMockInventorySnapshot() {
  return {
    ...MOCK_INVENTORY_META,
    itemCount: MOCK_INVENTORY_ITEMS.length,
    items: MOCK_INVENTORY_ITEMS,
  };
}