/**
 * useInventoryItems — live DB query, provider-aware.
 *
 * In inventory_bridge mode: fetches from Base44 InventoryItem entity and
 * refreshes the IndexedDB cache via InventoryBridgeProvider.
 * In mock mode: returns MOCK_INVENTORY_ITEMS from dev fixtures.
 *
 * HARD RULE: Does NOT fall back to mock items in inventory_bridge mode.
 * Returns empty array and surfaces an error instead.
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isMockMode } from "./inventory/inventoryConfig";
import { MOCK_INVENTORY_ITEMS } from "./dev/inventoryFixtures";
import { InventoryBridgeProvider } from "./inventory/inventoryBridgeProvider";

export function useInventoryItems() {
  return useQuery({
    queryKey: ["inventory_items", isMockMode() ? "mock" : "bridge"],
    queryFn: async () => {
      if (isMockMode()) {
        return MOCK_INVENTORY_ITEMS;
      }
      // Bridge mode: fetch from DB and warm IndexedDB cache
      const rows = await base44.entities.InventoryItem.list("-updated_date", 500);
      if (rows && rows.length > 0) {
        // Warm the IndexedDB cache in the background
        InventoryBridgeProvider.refreshInventoryCache().catch(() => {});
        return rows;
      }
      // No items in DB — do NOT fall back to mock. Return empty.
      return [];
    },
    staleTime: 30_000,
  });
}

export async function fetchInventoryItems() {
  if (isMockMode()) return MOCK_INVENTORY_ITEMS;
  try {
    const rows = await base44.entities.InventoryItem.list("-updated_date", 500);
    return rows && rows.length > 0 ? rows : [];
  } catch {
    return [];
  }
}