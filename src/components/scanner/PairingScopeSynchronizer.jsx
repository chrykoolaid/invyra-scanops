import { useEffect } from 'react';
import { getLiveConnectionProfile } from '../../lib/scanOpsLiveConnectivity';
import { getScanOpsSession, updateScanOpsSession } from '../../lib/scanOpsSession';

const ALLOWED_ENVIRONMENTS = Object.freeze(['TEST', 'TRAINING']);
const RECONCILE_INTERVAL_MS = 500;

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function reconcileTrustedPairingScope() {
  const profile = getLiveConnectionProfile();
  if (!profile) return { reconciled: false, reason: 'PAIRING_PROFILE_UNAVAILABLE' };

  const session = getScanOpsSession();
  const sessionDeviceId = asText(session.deviceId || session.scannerId);
  const sessionSessionId = asText(session.sessionId || session.shiftId || `session-${sessionDeviceId || 'scanops'}`);
  const profileEnvironment = asText(profile.environment).toUpperCase();

  if (sessionDeviceId !== asText(profile.deviceId)) {
    return { reconciled: false, reason: 'DEVICE_ID_CHANGED' };
  }
  if (sessionSessionId !== asText(profile.sessionId)) {
    return { reconciled: false, reason: 'SESSION_SCOPE_MISMATCH' };
  }
  if (!ALLOWED_ENVIRONMENTS.includes(profileEnvironment)) {
    return { reconciled: false, reason: 'ENVIRONMENT_BLOCKED' };
  }

  const profileStoreId = asText(profile.storeId);
  if (!profileStoreId) return { reconciled: false, reason: 'STORE_SCOPE_REQUIRED' };

  const patch = {};
  if (asText(session.storeId) !== profileStoreId) {
    patch.storeId = profileStoreId;
    patch.storeName = profileStoreId;
  }
  if (asText(session.environment).toUpperCase() !== profileEnvironment) {
    patch.environment = profileEnvironment;
  }

  if (Object.keys(patch).length === 0) {
    return { reconciled: false, reason: 'SCOPE_ALREADY_ALIGNED' };
  }

  updateScanOpsSession(patch);
  return {
    reconciled: true,
    reason: 'TRUSTED_PAIRING_SCOPE_APPLIED',
    storeId: profileStoreId,
    environment: profileEnvironment,
  };
}

export default function PairingScopeSynchronizer() {
  useEffect(() => {
    const reconcile = () => reconcileTrustedPairingScope();
    reconcile();

    const interval = window.setInterval(reconcile, RECONCILE_INTERVAL_MS);
    window.addEventListener('focus', reconcile);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', reconcile);
    };
  }, []);

  return null;
}
