/**
 * activeInventoryProvider — returns the correct provider based on DATA_MODE.
 *
 * Usage:
 *   import { getActiveInventoryProvider } from "@/lib/inventory/activeInventoryProvider";
 *   const provider = getActiveInventoryProvider();
 *   const item = await provider.resolveByBarcode("930000000004");
 *
 * In inventory_bridge mode, a null return means "not found in Inventory cache."
 * Callers MUST NOT fall back to mock fixtures.
 */
import { isMockMode } from "./inventoryConfig";
import { MockInventoryProvider } from "./mockInventoryProvider";
import { InventoryBridgeProvider } from "./inventoryBridgeProvider";

export function getActiveInventoryProvider() {
  return isMockMode() ? MockInventoryProvider : InventoryBridgeProvider;
}