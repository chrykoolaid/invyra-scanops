// SO-1 foundation only.
// Do not import this module into production Home/runtime until a later activation phase is approved.

export const SCANOPS_ONBOARDING_ENABLED = false;
export const SCANOPS_DYNAMIC_HOME_ENABLED = false;

export const SCANOPS_PROFILE_SCHEMA_VERSION = 2;

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
  "manufacturing",
  "construction_trades",
  "automotive",
  "rental_hire",
  "agriculture_primary_production",
]);

export const INDUSTRY_SUBGROUP_IDS = Object.freeze({
  services: Object.freeze([
    "laundry_dry_cleaning",
    "repair_maintenance",
    "salon_beauty_wellness",
    "cleaning_services",
    "professional_business_services",
    "other_service_allied",
  ]),
  retail: Object.freeze([
    "convenience_stores",
    "sari_sari_stores",
    "mini_marts_groceries",
    "supermarkets_hypermarkets",
    "specialty_retail",
  ]),
  hospitality_food_beverage: Object.freeze([
    "restaurants",
    "cafes",
    "bars_pubs",
    "quick_service_restaurants",
  ]),
  hospitality_accommodation: Object.freeze([
    "hotels",
    "resorts",
    "motels",
    "lodges_guesthouses_serviced_accommodation",
  ]),
  healthcare: Object.freeze([
    "pharmacies",
    "clinics",
    "hospitals",
    "allied_health",
  ]),
  wholesale_distribution: Object.freeze([
    "wholesalers",
    "distributors",
    "b2b_fulfilment_operations",
  ]),
  manufacturing: Object.freeze([
    "food_beverage_manufacturing",
    "light_manufacturing",
    "assembly_manufacturing",
    "fabrication_workshop_manufacturing",
    "process_manufacturing",
    "textile_apparel_manufacturing",
    "pharmaceutical_regulated_manufacturing",
    "construction_materials_manufacturing",
    "other_general_manufacturing",
  ]),
  construction_trades: Object.freeze([
    "residential_construction",
    "commercial_construction",
    "electrical",
    "plumbing",
    "hvac_mechanical_services",
    "general_contractors_trade_services",
  ]),
  automotive: Object.freeze([
    "mechanical_workshops",
    "tyre_centres",
    "auto_electrical",
    "vehicle_service_centres",
    "motorcycle_workshops",
    "other_automotive_service_operations",
  ]),
  rental_hire: Object.freeze([
    "tool_hire",
    "equipment_rental",
    "machinery_hire",
    "party_event_hire",
    "vehicle_hire",
    "other_rental_operations",
  ]),
  agriculture_primary_production: Object.freeze([
    "crop_farming_growers",
    "livestock",
    "dairy",
    "poultry",
    "aquaculture",
    "fisheries",
    "nurseries_horticulture",
    "other_primary_production",
  ]),
});

export const CROSS_SECTOR_CAPABILITY_IDS = Object.freeze([
  "warehouse_operations",
  "ecommerce_overlay",
  "payroll_staff_rostering",
  "reporting_analytics",
  "multi_location",
  "integrations",
]);

export const WAREHOUSE_LOCATION_CAPABILITY_ID = "warehouse_operations";

export function getCanonicalHomeTileIds() {
  return [...CANONICAL_HOME_TILE_IDS];
}

export function isOperationalProfileShapeValid(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return false;
  if (profile.schemaVersion !== SCANOPS_PROFILE_SCHEMA_VERSION) return false;
  if (!SUPPORTED_INDUSTRY_PROFILE_IDS.includes(profile.industryProfileId)) return false;
  if (!INDUSTRY_SUBGROUP_IDS[profile.industryProfileId]?.includes(profile.subgroupId)) return false;
  if (!profile.location || typeof profile.location !== "object" || Array.isArray(profile.location)) return false;
  if (!Array.isArray(profile.location.capabilities)) return false;
  if (!profile.location.capabilities.every((capabilityId) => CROSS_SECTOR_CAPABILITY_IDS.includes(capabilityId))) return false;
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
