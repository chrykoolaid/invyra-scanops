import fs from 'node:fs';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const drawer = fs.readFileSync('src/components/scanner/OperationalMenuPanel.jsx', 'utf8');
const settings = fs.readFileSync('src/pages/ScannerSettings.jsx', 'utf8');
const handoff = fs.readFileSync('src/pages/SyncHandoff.jsx', 'utf8');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const duplicateDrawerLabels = [
  'Product Lookup',
  'Receiving',
  'Stock Count',
  'Replenish',
  'Price Check',
  'Shelf Tickets',
  'Markdown',
  'Waste',
  'Transfers',
  'My Tasks',
  'Sync & Handoff',
  'Sync Status',
  'Device Status',
  'User Management',
];

for (const label of duplicateDrawerLabels) {
  assert(!drawer.includes(`label: "${label}"`), `drawer must not duplicate ${label}`);
}

assert(drawer.includes('Support Menu'), 'drawer must be support menu');
assert(drawer.includes('Scanner Settings'), 'drawer links to scanner settings');
assert(drawer.includes('route: "/scanner-settings"'), 'drawer scanner settings route exists');
assert(drawer.includes('Report Issue'), 'drawer keeps report issue');
assert(drawer.includes('Help'), 'drawer keeps help');
assert(drawer.includes('About ScanOps'), 'drawer keeps about');
assert(drawer.includes('End Session'), 'drawer keeps end session');
assert(drawer.includes('Store Exceptions'), 'drawer keeps manager exceptions');
assert(drawer.includes('Product Review'), 'drawer keeps product review');

assert(app.includes('import ScannerSettings'), 'app imports scanner settings');
assert(app.includes('path="/scanner-settings"'), 'scanner settings route exists');
assert(settings.includes('Device Behaviour'), 'scanner settings has behaviour section');
assert(settings.includes('Diagnostics'), 'scanner settings has diagnostics section');
assert(settings.includes('Shift & Device'), 'scanner settings has shift/device section');
assert(settings.includes('Access & Users'), 'scanner settings has access/users section');
assert(settings.includes('Scanner Test'), 'scanner test lives in scanner settings');
assert(settings.includes('User Management'), 'user management lives in scanner settings');
assert(settings.includes('Device Status'), 'device status lives in scanner settings');
assert(settings.includes('stock_mutation: false'), 'scanner test must not mutate stock');
assert(!settings.includes('transport_active: true'), 'scanner settings must not activate transport');
assert(!settings.includes('stock_mutation: true'), 'scanner settings must not mutate stock');

assert(handoff.includes('Sync Status'), 'handoff includes sync status');
assert(handoff.includes('Local Queue'), 'handoff includes local queue health');
assert(handoff.includes('Transport') && handoff.includes('Not active'), 'handoff shows transport inactive');
assert(handoff.includes('Mutation') && handoff.includes('Blocked'), 'handoff shows mutation blocked');
assert(!handoff.includes('LIVE transport is active'), 'handoff must not claim live transport active');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('P27F UI validation passed: drawer is support-only, duplicate Home navigation removed, Scanner Settings is the device hub, Sync Status lives in Sync & Handoff, and no transport/write/mutation behavior was introduced.');
