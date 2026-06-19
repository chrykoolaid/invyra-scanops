/**
 * useInventoryCacheStatus — React hook for cache status + stale warnings.
 *
 * Returns:
 *   { isStale, lastSyncedAt, itemCount, mode, isBridgeMode, refresh, refreshing, refreshError }
 *
 * Stale behaviour by workflow severity:
 *   - Standard workflows (gap scan, stock count): show soft warning, allow save.
 *   - Price-sensitive workflows (markdowns, price check): show hard warning,
 *     block final submit/print unless manually refreshed or explicit offline override.
 */
import { useCallback, useEffect, useState } from "react";
import { getActiveInventoryProvider } from "./activeInventoryProvider";
import { isBridgeMode } from "./inventoryConfig";

export function useInventoryCacheStatus() {
  const [status, setStatus] = useState({
    isStale: false,
    lastSyncedAt: null,
    itemCount: 0,
    mode: "unknown",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);

  const checkStatus = useCallback(async () => {
    const provider = getActiveInventoryProvider();
    const s = await provider.getCacheStatus();
    setStatus(s);
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    const provider = getActiveInventoryProvider();
    const result = await provider.refreshInventoryCache();
    if (!result.ok) setRefreshError(result.error || "Refresh failed.");
    await checkStatus();
    setRefreshing(false);
    return result;
  }, [checkStatus]);

  return {
    ...status,
    isBridgeMode: isBridgeMode(),
    refresh,
    refreshing,
    refreshError,
  };
}

// Helper: should a price-sensitive workflow block submission due to stale cache?
export function isStaleCacheBlockingForPriceSensitiveWorkflow(cacheStatus) {
  return cacheStatus.isBridgeMode && cacheStatus.isStale;
}