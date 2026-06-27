import { buildScanOpsCandidateRoundtripClosure } from '../src/lib/scanOpsCandidateRoundtripClosure.js';

const training = buildScanOpsCandidateRoundtripClosure('TRAINING');
const test = buildScanOpsCandidateRoundtripClosure('TEST');
const live = buildScanOpsCandidateRoundtripClosure('LIVE');
const production = buildScanOpsCandidateRoundtripClosure('PRODUCTION');
const unknown = buildScanOpsCandidateRoundtripClosure('UNKNOWN');

const checks = [
  Object.isFrozen(training),
  training.candidate_roundtrip_closed === true,
  test.candidate_roundtrip_closed === true,
  live.candidate_roundtrip_closed === false,
  production.candidate_roundtrip_closed === false,
  unknown.candidate_roundtrip_closed === false,
  training.candidate_only === true,
  training.preview_only === true,
  training.transport_active === false,
  training.listener_active === false,
  training.desktop_call_attempted === false,
  training.event_sent === false,
  training.persisted === false,
  training.write_attempted === false,
  training.mutation_attempted === false,
];

if (!checks.every(Boolean)) {
  throw new Error('P28-G validation failed');
}

console.log('P28-G ScanOps candidate roundtrip closure passed.');
