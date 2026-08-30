import assert from "node:assert/strict";
import {
  INDUSTRY_HOME_PROFILES,
  SCANOPS_CAPABILITIES,
  SCANOPS_INDUSTRIES,
  SCANOPS_OPERATIONAL_PROFILE_VERSION,
  SCANOPS_TILE_IDS,
  WAREHOUSE_HOME_PROFILE,
  resolveScanOpsHomeProfile,
} from "../src/lib/scanOpsOperationalProfile.js";

assert.equal(SCANOPS_OPERATIONAL_PROFILE_VERSION, "SCANOPS_OPERATIONAL_PROFILE_V1");

for (const [industry, profile] of Object.entries(INDUSTRY_HOME_PROFILES)) {
  assert.equal(profile.length, 9, `${industry} must define exactly nine Home slots`);
  assert.equal(new Set(profile).size, 9, `${industry} must not duplicate a Home tile`);

  const resolved = resolveScanOpsHomeProfile({ industry, actorRole: "Admin" });
  assert.equal(resolved.tiles.length, 9, `${industry} must resolve exactly nine Home slots`);
  assert.equal(resolved.profileId, industry, `${industry} should remain its own default profile`);
}

assert.equal(WAREHOUSE_HOME_PROFILE.length, 9, "warehouse overlay must define exactly nine Home slots");
assert.equal(new Set(WAREHOUSE_HOME_PROFILE).size, 9, "warehouse overlay must not duplicate a Home tile");

const retail = resolveScanOpsHomeProfile({
  industry: SCANOPS_INDUSTRIES.RETAIL,
  actorRole: "Admin",
});
assert.deepEqual(
  retail.tiles.map((tile) => tile.tileId),
  [
    SCANOPS_TILE_IDS.RECEIVE,
    SCANOPS_TILE_IDS.COUNT,
    SCANOPS_TILE_IDS.TRANSFERS,
    SCANOPS_TILE_IDS.WASTE,
    SCANOPS_TILE_IDS.MARKDOWN,
    SCANOPS_TILE_IDS.EXPIRY,
    SCANOPS_TILE_IDS.ORDER,
    SCANOPS_TILE_IDS.MOVEMENTS,
    SCANOPS_TILE_IDS.TOOLS,
  ],
  "retail must preserve the approved current 3x3 tile order",
);

const warehouse = resolveScanOpsHomeProfile({
  industry: SCANOPS_INDUSTRIES.RETAIL,
  locationCapabilities: [SCANOPS_CAPABILITIES.WAREHOUSE_OPERATIONS],
  actorRole: "Admin",
});
assert.equal(warehouse.warehouseEnabled, true);
assert.equal(warehouse.profileId, "warehouse_operations");
assert.deepEqual(warehouse.tiles.map((tile) => tile.tileId), WAREHOUSE_HOME_PROFILE);
assert.equal(
  warehouse.industry,
  SCANOPS_INDUSTRIES.RETAIL,
  "warehouse capability must overlay the location and must not replace the company industry",
);

const staffRetail = resolveScanOpsHomeProfile({
  industry: SCANOPS_INDUSTRIES.RETAIL,
  actorRole: "Staff",
});
const orderSlot = staffRetail.tiles.find((tile) => tile.tileId === SCANOPS_TILE_IDS.ORDER);
assert.equal(orderSlot.visible, false, "role gating must hide supervisor-only Order from Staff");
assert.equal(orderSlot.blockedReason, "role");
assert.equal(staffRetail.tiles.length, 9, "role filtering must not collapse the 3x3 slot contract");

const permissionRestricted = resolveScanOpsHomeProfile({
  industry: SCANOPS_INDUSTRIES.RETAIL,
  actorRole: "Admin",
  employeeWorkflowPermissions: [SCANOPS_TILE_IDS.RECEIVE, SCANOPS_TILE_IDS.COUNT],
});
assert.equal(permissionRestricted.tiles.find((tile) => tile.tileId === SCANOPS_TILE_IDS.RECEIVE).visible, true);
assert.equal(permissionRestricted.tiles.find((tile) => tile.tileId === SCANOPS_TILE_IDS.COUNT).visible, true);
assert.equal(permissionRestricted.tiles.find((tile) => tile.tileId === SCANOPS_TILE_IDS.WASTE).visible, false);
assert.equal(permissionRestricted.tiles.find((tile) => tile.tileId === SCANOPS_TILE_IDS.WASTE).blockedReason, "permission");
assert.equal(permissionRestricted.tiles.length, 9, "permission filtering must not collapse the 3x3 slot contract");

const unknownIndustry = resolveScanOpsHomeProfile({ industry: "unknown", actorRole: "Admin" });
assert.deepEqual(
  unknownIndustry.tiles.map((tile) => tile.tileId),
  retail.tiles.map((tile) => tile.tileId),
  "unknown industries must safely fall back to the Retail pilot profile until governed configuration is known",
);

console.log("SO-1 ScanOps operational profile / dynamic Home: PASS");
