export const SCANOPS_OPERATIONAL_PROFILE_VERSION = "SCANOPS_OPERATIONAL_PROFILE_V1";

export const SCANOPS_INDUSTRIES = {
  SERVICES: "services",
  RETAIL: "retail",
  FOOD_BEVERAGE: "food_beverage",
  ACCOMMODATION: "accommodation",
  HEALTHCARE: "healthcare",
  WHOLESALE_DISTRIBUTION: "wholesale_distribution",
};

export const SCANOPS_CAPABILITIES = {
  WAREHOUSE_OPERATIONS: "warehouse_operations",
};

export const SCANOPS_TILE_IDS = {
  RECEIVE: "receive",
  COUNT: "count",
  TRANSFERS: "transfers",
  WASTE: "waste",
  MARKDOWN: "markdown",
  EXPIRY: "expiry",
  ORDER: "order",
  MOVEMENTS: "movements",
  TOOLS: "tools",
  PARTS: "parts",
  SERVICE_JOBS: "service_jobs",
  INGREDIENTS: "ingredients",
  BATCH_REGULATED: "batch_regulated",
  MINIBAR: "minibar",
  HOUSEKEEPING: "housekeeping",
  PUT_AWAY: "put_away",
  REPLENISH: "replenish",
  PICK: "pick",
  PACK: "pack",
  DISPATCH: "dispatch",
  CYCLE_COUNT: "cycle_count",
  EXCEPTIONS: "exceptions",
};

export const TILE_REGISTRY = {
  [SCANOPS_TILE_IDS.RECEIVE]: { label: "Receive", description: "PO Delivery", to: "/receiving", minRole: "Staff", tone: "blue", implemented: true },
  [SCANOPS_TILE_IDS.COUNT]: { label: "Count", description: "Stocktake", to: "/stock-count", minRole: "Staff", tone: "blue", implemented: true },
  [SCANOPS_TILE_IDS.TRANSFERS]: { label: "Transfers", description: "Locations", to: "/transfers", minRole: "Staff", tone: "green", implemented: true },
  [SCANOPS_TILE_IDS.WASTE]: { label: "Waste", description: "Record loss", to: "/waste", minRole: "Staff", tone: "green", implemented: true },
  [SCANOPS_TILE_IDS.MARKDOWN]: { label: "Markdown", description: "Price labels", to: "/markdowns", minRole: "Staff", tone: "purple", implemented: true },
  [SCANOPS_TILE_IDS.EXPIRY]: { label: "Expiry", description: "Freshness", to: "/expiry-check", minRole: "Staff", tone: "purple", implemented: true },
  [SCANOPS_TILE_IDS.ORDER]: { label: "Order", description: "Reorder", to: "/order", minRole: "Supervisor", tone: "amber", implemented: true },
  [SCANOPS_TILE_IDS.MOVEMENTS]: { label: "Movements", description: "Stock history", to: "/movements", minRole: "Staff", tone: "cyan", implemented: true },
  [SCANOPS_TILE_IDS.TOOLS]: { label: "Tools", description: "Support", to: "/more", minRole: "Staff", tone: "grey", implemented: true },

  // The following are governed profile slots only in SO-1. They remain non-interactive
  // until their operational workflows are implemented and certified.
  [SCANOPS_TILE_IDS.PARTS]: { label: "Parts", description: "Consumables", to: null, minRole: "Staff", tone: "cyan", implemented: false },
  [SCANOPS_TILE_IDS.SERVICE_JOBS]: { label: "Work Orders", description: "Service jobs", to: null, minRole: "Staff", tone: "grey", implemented: false },
  [SCANOPS_TILE_IDS.INGREDIENTS]: { label: "Ingredients", description: "Stock", to: null, minRole: "Staff", tone: "amber", implemented: false },
  [SCANOPS_TILE_IDS.BATCH_REGULATED]: { label: "Batch / Expiry", description: "Regulated stock", to: null, minRole: "Staff", tone: "purple", implemented: false },
  [SCANOPS_TILE_IDS.MINIBAR]: { label: "Minibar", description: "Stock", to: null, minRole: "Staff", tone: "cyan", implemented: false },
  [SCANOPS_TILE_IDS.HOUSEKEEPING]: { label: "Housekeeping", description: "Stock", to: null, minRole: "Staff", tone: "green", implemented: false },
  [SCANOPS_TILE_IDS.PUT_AWAY]: { label: "Put-away", description: "Storage", to: null, minRole: "Staff", tone: "amber", implemented: false },
  [SCANOPS_TILE_IDS.REPLENISH]: { label: "Replenish", description: "To pick", to: null, minRole: "Staff", tone: "amber", implemented: false },
  [SCANOPS_TILE_IDS.PICK]: { label: "Pick", description: "Orders", to: null, minRole: "Staff", tone: "amber", implemented: false },
  [SCANOPS_TILE_IDS.PACK]: { label: "Pack", description: "Orders", to: null, minRole: "Staff", tone: "amber", implemented: false },
  [SCANOPS_TILE_IDS.DISPATCH]: { label: "Dispatch", description: "Outbound", to: null, minRole: "Staff", tone: "amber", implemented: false },
  [SCANOPS_TILE_IDS.CYCLE_COUNT]: { label: "Cycle Count", description: "Inventory", to: null, minRole: "Staff", tone: "purple", implemented: false },
  [SCANOPS_TILE_IDS.EXCEPTIONS]: { label: "Exceptions", description: "Issues", to: null, minRole: "Supervisor", tone: "purple", implemented: false },
};

const RETAIL_PROFILE = [
  SCANOPS_TILE_IDS.RECEIVE,
  SCANOPS_TILE_IDS.COUNT,
  SCANOPS_TILE_IDS.TRANSFERS,
  SCANOPS_TILE_IDS.WASTE,
  SCANOPS_TILE_IDS.MARKDOWN,
  SCANOPS_TILE_IDS.EXPIRY,
  SCANOPS_TILE_IDS.ORDER,
  SCANOPS_TILE_IDS.MOVEMENTS,
  SCANOPS_TILE_IDS.TOOLS,
];

export const INDUSTRY_HOME_PROFILES = {
  [SCANOPS_INDUSTRIES.RETAIL]: RETAIL_PROFILE,
  [SCANOPS_INDUSTRIES.SERVICES]: [
    SCANOPS_TILE_IDS.RECEIVE,
    SCANOPS_TILE_IDS.COUNT,
    SCANOPS_TILE_IDS.PARTS,
    SCANOPS_TILE_IDS.WASTE,
    SCANOPS_TILE_IDS.TRANSFERS,
    SCANOPS_TILE_IDS.SERVICE_JOBS,
    SCANOPS_TILE_IDS.MOVEMENTS,
    SCANOPS_TILE_IDS.TOOLS,
    SCANOPS_TILE_IDS.ORDER,
  ],
  [SCANOPS_INDUSTRIES.FOOD_BEVERAGE]: [
    SCANOPS_TILE_IDS.RECEIVE,
    SCANOPS_TILE_IDS.COUNT,
    SCANOPS_TILE_IDS.TRANSFERS,
    SCANOPS_TILE_IDS.WASTE,
    SCANOPS_TILE_IDS.INGREDIENTS,
    SCANOPS_TILE_IDS.EXPIRY,
    SCANOPS_TILE_IDS.MOVEMENTS,
    SCANOPS_TILE_IDS.ORDER,
    SCANOPS_TILE_IDS.TOOLS,
  ],
  [SCANOPS_INDUSTRIES.ACCOMMODATION]: [
    SCANOPS_TILE_IDS.RECEIVE,
    SCANOPS_TILE_IDS.COUNT,
    SCANOPS_TILE_IDS.TRANSFERS,
    SCANOPS_TILE_IDS.MINIBAR,
    SCANOPS_TILE_IDS.HOUSEKEEPING,
    SCANOPS_TILE_IDS.WASTE,
    SCANOPS_TILE_IDS.EXPIRY,
    SCANOPS_TILE_IDS.MOVEMENTS,
    SCANOPS_TILE_IDS.TOOLS,
  ],
  [SCANOPS_INDUSTRIES.HEALTHCARE]: [
    SCANOPS_TILE_IDS.RECEIVE,
    SCANOPS_TILE_IDS.COUNT,
    SCANOPS_TILE_IDS.TRANSFERS,
    SCANOPS_TILE_IDS.BATCH_REGULATED,
    SCANOPS_TILE_IDS.WASTE,
    SCANOPS_TILE_IDS.EXPIRY,
    SCANOPS_TILE_IDS.MOVEMENTS,
    SCANOPS_TILE_IDS.ORDER,
    SCANOPS_TILE_IDS.TOOLS,
  ],
  [SCANOPS_INDUSTRIES.WHOLESALE_DISTRIBUTION]: [
    SCANOPS_TILE_IDS.RECEIVE,
    SCANOPS_TILE_IDS.COUNT,
    SCANOPS_TILE_IDS.TRANSFERS,
    SCANOPS_TILE_IDS.ORDER,
    SCANOPS_TILE_IDS.MOVEMENTS,
    SCANOPS_TILE_IDS.WASTE,
    SCANOPS_TILE_IDS.EXPIRY,
    SCANOPS_TILE_IDS.TOOLS,
    SCANOPS_TILE_IDS.EXCEPTIONS,
  ],
};

export const WAREHOUSE_HOME_PROFILE = [
  SCANOPS_TILE_IDS.RECEIVE,
  SCANOPS_TILE_IDS.PUT_AWAY,
  SCANOPS_TILE_IDS.REPLENISH,
  SCANOPS_TILE_IDS.PICK,
  SCANOPS_TILE_IDS.PACK,
  SCANOPS_TILE_IDS.DISPATCH,
  SCANOPS_TILE_IDS.CYCLE_COUNT,
  SCANOPS_TILE_IDS.EXCEPTIONS,
  SCANOPS_TILE_IDS.TRANSFERS,
];

const ROLE_LEVELS = { Staff: 1, Supervisor: 2, Manager: 3, Admin: 4 };
const roleLevel = (role) => ROLE_LEVELS[role] || ROLE_LEVELS.Staff;

function normalizeCapabilities(capabilities) {
  if (Array.isArray(capabilities)) return new Set(capabilities);
  if (capabilities && typeof capabilities === "object") {
    return new Set(Object.entries(capabilities).filter(([, enabled]) => Boolean(enabled)).map(([key]) => key));
  }
  return new Set();
}

function normalizePermissions(permissions) {
  if (!Array.isArray(permissions) || permissions.length === 0) return null;
  return new Set(permissions);
}

export function resolveScanOpsHomeProfile({
  industry = SCANOPS_INDUSTRIES.RETAIL,
  locationCapabilities = [],
  employeeWorkflowPermissions = null,
  actorRole = "Staff",
} = {}) {
  const capabilities = normalizeCapabilities(locationCapabilities);
  const permissions = normalizePermissions(employeeWorkflowPermissions);
  const warehouseEnabled = capabilities.has(SCANOPS_CAPABILITIES.WAREHOUSE_OPERATIONS);
  const profileId = warehouseEnabled ? "warehouse_operations" : industry;
  const profile = warehouseEnabled
    ? WAREHOUSE_HOME_PROFILE
    : (INDUSTRY_HOME_PROFILES[industry] || RETAIL_PROFILE);

  const tiles = profile.slice(0, 9).map((tileId, slotIndex) => {
    const definition = TILE_REGISTRY[tileId];
    const roleAllowed = roleLevel(actorRole) >= roleLevel(definition.minRole);
    const permissionAllowed = permissions === null || permissions.has(tileId);
    const visible = roleAllowed && permissionAllowed;

    return {
      slot: slotIndex + 1,
      tileId,
      ...definition,
      visible,
      active: visible && definition.implemented && Boolean(definition.to),
      blockedReason: !roleAllowed
        ? "role"
        : !permissionAllowed
          ? "permission"
          : !definition.implemented
            ? "workflow_not_implemented"
            : null,
    };
  });

  return {
    version: SCANOPS_OPERATIONAL_PROFILE_VERSION,
    industry,
    profileId,
    warehouseEnabled,
    tiles,
  };
}
