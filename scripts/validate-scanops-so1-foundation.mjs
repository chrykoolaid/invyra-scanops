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
  '"receive"',
  '"count"',
  '"transfers"',
  '"waste"',
  '"markdown"',
  '"expiry"',
  '"order"',
  '"movements"',
  '"tools"',
  'WAREHOUSE_LOCATION_CAPABILITY_ID = "warehouse_operations"',
];

for (const token of requiredProfileTokens) {
  if (!profile.includes(token)) fail(`operational profile foundation missing token: ${token}`);
}

const requiredSpecTokens = [
  "FOUNDATION ONLY / RUNTIME DISABLED",
  "scanops_onboarding_enabled = false",
  "scanops_dynamic_home_enabled = false",
  "Visible Home Tiles = Industry Profile ∩ Location Capabilities ∩ Employee Permissions",
  "Warehouse Operations is a cross-sector location capability",
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
  console.log("SO-1 PASS: onboarding and dynamic Home foundation remain dormant; canonical 3x3 Home is preserved.");
}
