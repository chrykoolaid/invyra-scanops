import fs from 'node:fs';

const home = fs.readFileSync('src/pages/Home.jsx', 'utf8');
const menu = fs.readFileSync('src/components/scanner/OperationalMenuPanel.jsx', 'utf8');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

assert(home.includes('label: "Sync & Handoff"'), 'home keeps Sync & Handoff tile');
assert(home.includes('to: "/sync-handoff",            minRole: "Manager"'), 'home Sync & Handoff is Manager-facing');
assert(!home.includes('to: "/sync-handoff",            minRole: "Staff"'), 'home must not expose Sync & Handoff to Staff');

assert(menu.includes('label: "Sync & Handoff"'), 'drawer keeps Sync & Handoff as single sync home');
assert(menu.includes('route: "/sync-handoff", minRole: "Manager"'), 'drawer Sync & Handoff is Manager-facing');
assert(!menu.includes('label: "Sync Review"'), 'Sync Review must not be a separate drawer item');
assert(!menu.includes('label: "Contract Preview"'), 'Contract Preview must not be a separate drawer item');
assert(!menu.includes('label: "Scanner Test", icon: ScanLine'), 'Scanner Test must not be a separate drawer item');
assert(menu.includes('function ScannerPanel'), 'Scanner diagnostics panel remains available');
assert(menu.includes('<ScannerPanel onMessage={onMessage} />'), 'Scanner diagnostics lives inside Scanner Settings');
assert(menu.includes('Scanner Test now lives here as diagnostics'), 'Scanner Settings explains diagnostics home');
assert(menu.includes('route: "/sync-queue"'), 'staff Sync Status remains available');
assert(!menu.includes('transport_active: true'), 'must not activate transport');
assert(!menu.includes('stock_mutation: true'), 'must not introduce stock mutation');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('P27D ScanOps navigation consolidation passed: Sync & Handoff is the single manager sync home, Contract Preview and Sync Review are not separate drawer entries, Scanner Test lives inside Scanner Settings, and no transport or mutation behavior was introduced.');
