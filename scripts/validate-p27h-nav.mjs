import fs from 'node:fs';

const home = fs.readFileSync('src/pages/Home.jsx', 'utf8');
const drawer = fs.readFileSync('src/components/scanner/OperationalMenuPanel.jsx', 'utf8');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const hiddenHomeLabels = [
  'Product Review',
  'Session Collab',
  'Device Governance',
  'Pilot Readiness',
];

for (const label of hiddenHomeLabels) {
  assert(!home.includes(`label: "${label}"`), `${label} must not be visible on Home`);
}

const hiddenDrawerLabels = [
  'Product Review',
  'Store Exceptions',
  'Pilot Readiness',
  'Device Governance',
  'Session Collab',
  'Sync & Handoff',
];

for (const label of hiddenDrawerLabels) {
  assert(!drawer.includes(`label: "${label}"`), `${label} must not be visible in drawer`);
}

assert(home.includes('label: "Store Exceptions"'), 'Store Exceptions remains as the one manager review tile');
assert(home.includes('to: "/store-ops-dashboard"'), 'Store Exceptions still routes to existing manager review page');
assert(home.includes('label: "Sync & Handoff"'), 'Sync & Handoff remains as Home tile');
assert(home.includes('label: "Product Lookup"'), 'Product Lookup remains visible');
assert(drawer.includes('Support Menu'), 'drawer remains support menu');
assert(drawer.includes('Scanner Settings'), 'drawer keeps Scanner Settings');
assert(drawer.includes('Help'), 'drawer keeps Help');
assert(drawer.includes('About ScanOps'), 'drawer keeps About');
assert(drawer.includes('End Session'), 'drawer keeps End Session');
assert(!drawer.includes('route: "/pilot-readiness"'), 'drawer no longer routes Report Issue to Pilot Readiness');
assert(!home.includes('route: "/device-governance"'), 'Device Governance route is not visible from Home');
assert(!home.includes('route: "/session-collaboration"'), 'Session Collaboration route is not visible from Home');
assert(!home.includes('route: "/product-identity-review"'), 'Product Review route is not visible from Home');
assert(!home.includes('route: "/pilot-readiness"'), 'Pilot Readiness route is not visible from Home');
assert(!home.includes('transport_active: true'), 'no transport activation');
assert(!drawer.includes('transport_active: true'), 'no drawer transport activation');
assert(!home.includes('stock_mutation: true'), 'no stock mutation');
assert(!drawer.includes('stock_mutation: true'), 'no drawer stock mutation');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('P27H navigation validation passed: experimental standalone tiles are hidden, Store Exceptions remains the manager review tile, drawer is support-only, and no transport/write/mutation behavior was introduced.');
