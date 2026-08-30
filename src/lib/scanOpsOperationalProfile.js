// SO-1 foundation only.
// Do not import this module into production Home/runtime until a later activation phase is approved.

export const SCANOPS_ONBOARDING_ENABLED = false;
export const SCANOPS_DYNAMIC_HOME_ENABLED = false;

export const SCANOPS_PROFILE_SCHEMA_VERSION = 1;

export const CANONICAL_HOME_TILE_IDS = Object.freeze([
  "receive",
  "count",
  "transfers",
  "waste",
  "markdown",
  "expiry",
  "order",
  "movements",
  "tools",
]);

export const SUPPORTED_INDUSTRY_PROFILE_IDS = Object.freeze([
  "services",
  "retail",
  "hospitality_food_beverage",
  "hospitality_accommodation",
  "healthcare",
  "wholesale_distribution",
]);

export const WAREHOUSE_LOCATION_CAPABILITY_ID = "warehouse_operations";

export function getCanonicalHomeTileIds() {
  return [...CANONICAL_HOME_TILE_IDS];
}

export function isOperationalProfileShapeValid(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return false;
  if (profile.schemaVersion !== SCANOPS_PROFILE_SCHEMA_VERSION) return false;
  if (!SUPPORTED_INDUSTRY_PROFILE_IDS.includes(profile.industryProfileId)) return false;
  if (!profile.location || typeof profile.location !== "object" || Array.isArray(profile.location)) return false;
  if (!Array.isArray(profile.location.capabilities)) return false;
  if (!profile.employeeAccess || typeof profile.employeeAccess !== "object" || Array.isArray(profile.employeeAccess)) return false;
  if (!Array.isArray(profile.employeeAccess.permissions)) return false;
  return true;
}

/**
 * SO-1 fail-safe resolver.
 *
 * The runtime feature gates are intentionally hard-disabled. Until a later
 * activation phase explicitly changes those gates and wires a certified
 * resolver into Home, this function must always return the canonical 3x3
 * Home tile identities.
 */
export function resolveHomeTileIds({ profile } = {}) {
  if (!SCANOPS_ONBOARDING_ENABLED || !SCANOPS_DYNAMIC_HOME_ENABLED) {
    return getCanonicalHomeTileIds();
  }

  if (!isOperationalProfileShapeValid(profile)) {
    return getCanonicalHomeTileIds();
  }

  // Dynamic industry/location/permission resolution is intentionally deferred.
  return getCanonicalHomeTileIds();
}
