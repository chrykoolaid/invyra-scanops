import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const profilePath = path.join(root, "src/lib/scanOpsOperationalProfile.js");
const homePath = path.join(root, "src/pages/Home.jsx");
const specPath = path.join(root, "docs/scanops/SO1_ONBOARDING_DYNAMIC_HOME_FOUNDATION.md");

const fail = (message) => {
  console.error(`SO-1 FAIL: ${message}`);
  process.exitCode = 1;
};

for (const required of [profilePath, homePath, specPath]) {
  if (!fs.existsSync(required)) fail(`missing required file: ${path.relative(root, required)}`);
}

if (process.exitCode) process.exit(process.exitCode);

const profile = fs.readFileSync(profilePath, "utf8");
const home = fs.readFileSync(homePath, "utf8");
const spec = fs.readFileSync(specPath, "utf8");

const requiredProfileTokens = [
  "SCANOPS_ONBOARDING_ENABLED = false",
  "SCANOPS_DYNAMIC_HOME_ENABLED = false",
  "SCANOPS_PROFILE_SCHEMA_VERSION = 2",
  '"receive"',
  '"count"',
  '"transfers"',
  '"waste"',
  '"markdown"',
  '"expiry"',
  '"order"',
  '"movements"',
  '"tools"',
  '"services"',
  '"retail"',
  '"hospitality_food_beverage"',
  '"hospitality_accommodation"',
  '"healthcare"',
  '"wholesale_distribution"',
  '"manufacturing"',
  '"construction_trades"',
  '"automotive"',
  '"rental_hire"',
  '"agriculture_primary_production"',
  '"warehouse_operations"',
  '"ecommerce_overlay"',
  '"payroll_staff_rostering"',
  '"reporting_analytics"',
  '"multi_location"',
  '"integrations"',
  'WAREHOUSE_LOCATION_CAPABILITY_ID = "warehouse_operations"',
];

for (const token of requiredProfileTokens) {
  if (!profile.includes(token)) fail(`operational profile foundation missing token: ${token}`);
}

const primaryIndustryIds = [
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
];

if (primaryIndustryIds.length !== 11) fail("validator primary industry list must contain exactly 11 profiles");

const forbiddenPrimaryIndustryIds = [
  "warehouse_operations",
  "ecommerce_overlay",
  "payroll_staff_rostering",
  "reporting_analytics",
  "multi_location",
  "integrations",
];

const supportedBlockMatch = profile.match(/SUPPORTED_INDUSTRY_PROFILE_IDS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
if (!supportedBlockMatch) {
  fail("could not locate SUPPORTED_INDUSTRY_PROFILE_IDS block");
} else {
  const supportedBlock = supportedBlockMatch[1];
  const foundPrimaryIds = primaryIndustryIds.filter((id) => supportedBlock.includes(`"${id}"`));
  if (foundPrimaryIds.length !== 11) fail(`supported industry registry contains ${foundPrimaryIds.length}/11 locked primary industries`);
  for (const forbidden of forbiddenPrimaryIndustryIds) {
    if (supportedBlock.includes(`"${forbidden}"`)) fail(`cross-sector capability incorrectly registered as primary industry: ${forbidden}`);
  }
}

const requiredSpecTokens = [
  "FOUNDATION ONLY / RUNTIME DISABLED",
  "v1.3 — LOCKED 11-INDUSTRY TAXONOMY",
  "scanops_onboarding_enabled = false",
  "scanops_dynamic_home_enabled = false",
  "Visible Home Tiles = Industry Profile ∩ Location Capabilities ∩ Employee Permissions",
  "Warehouse Operations is a cross-sector location capability",
  "A business selects one primary industry profile",
  "Disabled capabilities remain hidden to reduce cognitive load",
  "Industry readiness checklist fully passed and signed",
  "modify `src/pages/Home.jsx`",
];

for (const token of requiredSpecTokens) {
  if (!spec.includes(token)) fail(`SO-1 specification missing contract text: ${token}`);
}

if (home.includes("scanOpsOperationalProfile")) {
  fail("Home.jsx imports or references the dormant SO-1 operational profile foundation");
}

if (!home.includes("Keep this 3x3 grid fixed to protect scanner muscle memory.")) {
  fail("Home.jsx no longer contains the fixed 3x3 scanner muscle-memory contract");
}

const canonicalHomeLabels = [
  'label: "Receive"',
  'label: "Count"',
  'label: "Transfers"',
  'label: "Waste"',
  'label: "Markdown"',
  'label: "Expiry"',
  'label: "Order"',
  'label: "Movements"',
  'label: "Tools"',
];

for (const label of canonicalHomeLabels) {
  if (!home.includes(label)) fail(`current Home fallback missing canonical tile: ${label}`);
}

if (!process.exitCode) {
  console.log("SO-1 PASS: locked 11-industry taxonomy is represented dormantly; onboarding and dynamic Home remain disabled; canonical 3x3 Home is preserved.");
}
