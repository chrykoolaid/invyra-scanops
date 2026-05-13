export const DEVICE_SETUP_STATUS = Object.freeze({
  READY: "READY",
  READY_WITH_WARNINGS: "READY_WITH_WARNINGS",
  NOT_READY: "NOT_READY",
  SETUP_REQUIRED: "SETUP_REQUIRED",
});

export const DEVICE_TYPES = Object.freeze({
  HANDHELD_SCANNER: "HANDHELD_SCANNER",
  TABLET: "TABLET",
  PHONE: "PHONE",
  TEST_DEVICE: "TEST_DEVICE",
  UNKNOWN: "UNKNOWN",
});

export const DEVICE_ENVIRONMENTS = Object.freeze({
  LIVE: "LIVE",
  TRAINING: "TRAINING",
  TEST: "TEST",
  UNKNOWN: "UNKNOWN",
});

export const DEVICE_ASSIGNED_ROLE_MODES = Object.freeze({
  STAFF_DEFAULT: "STAFF_DEFAULT",
  SUPERVISOR_DEFAULT: "SUPERVISOR_DEFAULT",
  MANAGER_DEFAULT: "MANAGER_DEFAULT",
  ADMIN_DEFAULT: "ADMIN_DEFAULT",
  ROLE_PREVIEW: "ROLE_PREVIEW",
  UNKNOWN: "UNKNOWN",
});

export const DEVICE_WARNING_CODES = Object.freeze({
  NETWORK_NOT_CONFIRMED: "NETWORK_NOT_CONFIRMED",
  PRINTER_UNAVAILABLE: "PRINTER_UNAVAILABLE",
  OFFLINE_CACHE_NOT_CONFIRMED: "OFFLINE_CACHE_NOT_CONFIRMED",
  STORE_LOCATION_MISSING: "STORE_LOCATION_MISSING",
  OPERATOR_ROLE_NOT_CONFIRMED: "OPERATOR_ROLE_NOT_CONFIRMED",
  TIME_DATE_MISMATCH: "TIME_DATE_MISMATCH",
  BATTERY_PLAN_NOT_CONFIRMED: "BATTERY_PLAN_NOT_CONFIRMED",
  MANUAL_SEARCH_NOT_CONFIRMED: "MANUAL_SEARCH_NOT_CONFIRMED",
  SCANNER_INPUT_NOT_CONFIRMED: "SCANNER_INPUT_NOT_CONFIRMED",
});

export const DEVICE_WARNING_WORDING = Object.freeze({
  [DEVICE_WARNING_CODES.NETWORK_NOT_CONFIRMED]: "Network not confirmed",
  [DEVICE_WARNING_CODES.PRINTER_UNAVAILABLE]: "Printer unavailable",
  [DEVICE_WARNING_CODES.OFFLINE_CACHE_NOT_CONFIRMED]: "Offline cache not confirmed",
  [DEVICE_WARNING_CODES.STORE_LOCATION_MISSING]: "Store location missing",
  [DEVICE_WARNING_CODES.OPERATOR_ROLE_NOT_CONFIRMED]: "Operator role not confirmed",
  [DEVICE_WARNING_CODES.TIME_DATE_MISMATCH]: "Time/date mismatch",
  [DEVICE_WARNING_CODES.BATTERY_PLAN_NOT_CONFIRMED]: "Battery/charging plan not confirmed",
  [DEVICE_WARNING_CODES.MANUAL_SEARCH_NOT_CONFIRMED]: "Manual search not confirmed",
  [DEVICE_WARNING_CODES.SCANNER_INPUT_NOT_CONFIRMED]: "Scanner input not confirmed",
});

export const PRINTER_READINESS_STATUS = Object.freeze({
  AVAILABLE: "AVAILABLE",
  WARNING: "WARNING",
  UNAVAILABLE: "UNAVAILABLE",
  NOT_CONFIGURED: "NOT_CONFIGURED",
  UNKNOWN: "UNKNOWN",
});

export const PRINTER_READINESS_WORDING = Object.freeze({
  [PRINTER_READINESS_STATUS.AVAILABLE]: "Printer available",
  [PRINTER_READINESS_STATUS.WARNING]: "Printer warning",
  [PRINTER_READINESS_STATUS.UNAVAILABLE]: "Printer unavailable",
  [PRINTER_READINESS_STATUS.NOT_CONFIGURED]: "Printer not configured for this device",
  [PRINTER_READINESS_STATUS.UNKNOWN]: "Printer status unknown",
});

export const OFFLINE_READINESS_STATUS = Object.freeze({
  OFFLINE_READY: "OFFLINE_READY",
  LIMITED_OFFLINE_READY: "LIMITED_OFFLINE_READY",
  NOT_OFFLINE_READY: "NOT_OFFLINE_READY",
  UNKNOWN: "UNKNOWN",
});

export const OFFLINE_READINESS_WORDING = Object.freeze({
  [OFFLINE_READINESS_STATUS.OFFLINE_READY]: "Offline ready",
  [OFFLINE_READINESS_STATUS.LIMITED_OFFLINE_READY]: "Limited offline readiness",
  [OFFLINE_READINESS_STATUS.NOT_OFFLINE_READY]: "Not offline ready",
  [OFFLINE_READINESS_STATUS.UNKNOWN]: "Offline readiness unknown",
});

export const LOCATION_TYPES = Object.freeze({
  SALES_FLOOR: "SALES_FLOOR",
  STOCKROOM: "STOCKROOM",
  RECEIVING: "RECEIVING",
  WASTE: "WASTE",
  BACKROOM: "BACKROOM",
  OTHER: "OTHER",
});

export const DEVICE_IDENTITY_FIELDS = Object.freeze([
  "deviceId",
  "deviceName",
  "deviceType",
  "storeId",
  "locationId",
  "environment",
  "assignedRoleMode",
  "lastSetupCheckAt",
  "setupStatus",
]);

export const STORE_LOCATION_SETUP_FIELDS = Object.freeze([
  "storeId",
  "storeName",
  "locationId",
  "locationName",
  "locationType",
  "isDefaultReceivingLocation",
  "isDefaultSalesFloorLocation",
  "isDefaultStockroomLocation",
  "isWasteLocation",
]);

export const PILOT_DEVICE_READINESS_CHECKLIST = Object.freeze([
  "Device ID assigned",
  "Store ID assigned",
  "Location ID assigned",
  "Operator role can sign in / preview correctly",
  "Scanner input works",
  "Manual search works",
  "Offline banner/state appears correctly",
  "Saved-local behavior is understood",
  "Sync retry behavior is understood",
  "Printer unavailable wording is understood",
  "Time/date appears correct",
  "Battery/charging plan exists",
  "Device can return to Home safely",
]);
