import fs from 'node:fs';

const settings = fs.readFileSync('src/pages/ScannerSettings.jsx', 'utf8');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const removed = [
  'User Management',
  'Role Preview',
  'Device Assign',
  'Admin Approval',
  'SCANOPS_ROLES',
  'setScanOpsRolePreview',
  'updateScanOpsSession',
  'canChangeContext',
  'canManageOffline',
  'setNetworkMode',
  'changeRole',
  'changeDepartment',
  'changeNetwork',
  '<select',
  'Offline / Online Mode',
];

for (const term of removed) {
  assert(!settings.includes(term), `${term} must be removed from scanner settings`);
}

assert(settings.includes('Access & Identity'), 'read-only access identity section required');
assert(settings.includes('Current User'), 'current user shown');
assert(settings.includes('Current Role'), 'current role shown');
assert(settings.includes('Role Source'), 'role source shown');
assert(settings.includes('Assigned by login'), 'role source is login');
assert(settings.includes('Store / Department'), 'store/department shown read-only');
assert(settings.includes('Access Managed By'), 'access owner shown');
assert(settings.includes('Company Admin / Invyra Access'), 'external access owner shown');
assert(settings.includes('ScanOps applies permissions from login'), 'permission model explained');
assert(settings.includes('does not assign users, roles, stores, departments, devices, or approvals'), 'no assignment statement shown');
assert(settings.includes('Scanner Test'), 'scanner test remains');
assert(settings.includes('stock_mutation: false'), 'scanner test remains non-mutating');
assert(!settings.includes('stock_mutation: true'), 'no stock mutation');
assert(!settings.includes('transport_active: true'), 'no transport activation');
assert(!settings.includes('permission_mutation: true'), 'no permission mutation');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('P27G access UI validation passed: Scanner Settings shows read-only identity/status, removes user management, role preview, store/department selector, offline toggle, and introduces no sync/write/mutation behavior.');
