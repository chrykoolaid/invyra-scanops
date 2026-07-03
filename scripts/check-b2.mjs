import fs from 'node:fs';

const source = fs.readFileSync('src/bridge/phase33/bridgePhase33B2.ts', 'utf8');

if (!source.includes('33.B2')) {
  process.exit(1);
}

console.log('B2 check passed.');
