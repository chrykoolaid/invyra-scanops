#!/usr/bin/env node
try {
  await import('./validate-phase39-0b-scanops-connection-setup.mjs');
} catch (error) {
  console.log(JSON.stringify({
    phase: '39-0B',
    repository: 'chrykoolaid/invyra-scanops',
    passed: false,
    failedChecks: 1,
    receivingIntegrationAuthorized: false,
    fatalError: {
      name: error?.name || 'Error',
      message: error?.message || String(error),
      stack: error?.stack || null,
    },
  }, null, 2));
  process.exit(1);
}
