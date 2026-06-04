/**
 * useInventoryItems — replaces static fixture reads with live DB data.
 * Falls back to the static snapshot when DB is empty (pilot safety net).
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { INVENTORY_SNAPSHOT_ITEMS } from "./inventorySnapshot";

export function useInventoryItems() {
  return useQuery({
    queryKey: ["inventory_items"],
    queryFn: async () => {
      const rows = await base44.entities.InventoryItem.list("-updated_date", 200);
      return rows && rows.length > 0 ? rows : INVENTORY_SNAPSHOT_ITEMS;
    },
    staleTime: 30_000,
    placeholderData: INVENTORY_SNAPSHOT_ITEMS,
  });
}

export async function fetchInventoryItems() {
  try {
    const rows = await base44.entities.InventoryItem.list("-updated_date", 200);
    return rows && rows.length > 0 ? rows : INVENTORY_SNAPSHOT_ITEMS;
  } catch {
    return INVENTORY_SNAPSHOT_ITEMS;
  }
}