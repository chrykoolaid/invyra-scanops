import fs from 'node:fs';

const source = fs.readFileSync('docs/bridge/phase34/PHASE_34_ROADMAP.md', 'utf8');

const requiredMarkers = [
  'Phase 34 is locked as a planning, governance, architecture, and readiness phase only.',
  'Inventory Desktop is the system of record.',
  'ScanOps is the handheld operational layer.',
  'The bridge remains inactive throughout Phase 34.',
  'No live bridge activation.',
  'No runtime bridge activation.',
  'No transport activation.',
  'No fixture execution.',
  'No persistence.',
  'No queue processing.',
  'No inbox processing.',
  'No Inventory mutation.',
  'No ScanOps mutation.',
  'No stock mutation.',
  'No ledger mutation.',
  'No pricing mutation.',
  'No POS mutation.',
  'No order mutation.',
  'No approval mutation.',
  'No Item Master mutation.',
  'Every Phase 34 pull request must map to exactly one roadmap section from 34-A through 34-J.',
  '34-A — Planning & Governance',
  '34-B — Bridge Contracts',
  '34-C — Cross-Repository Consistency',
  '34-D — Transport Architecture',
  '34-E — Queue Architecture',
  '34-F — Persistence Architecture',
  '34-G — Recovery & Failure Strategy',
  '34-H — Security & Trust',
  '34-I — End-to-End Bridge Review',
  '34-J — Phase 34 Closeout',
  'Runtime allowed: no.',
  'Transport activation allowed: no.',
  'Queue processing allowed: no.',
  'Persistence allowed: no.',
  'Phase 34 is complete only when:',
  'All ten roadmap sections from 34-A through 34-J are complete.',
  'Zero runtime behavior is introduced.',
  'Zero transport behavior is activated.',
  'Zero persistence behavior is introduced.',
  'Zero queue or inbox processing is introduced.',
  'Zero Inventory or ScanOps mutation is introduced.',
  'All guardrails remain intact.',
  'Phase 34-A2 planning and governance readiness',
];

let ok = true;

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
}

console.log('Phase 34 roadmap check passed.');
