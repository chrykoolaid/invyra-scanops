import { useEffect, useState } from "react";

/**
 * useBatteryStatus
 * Uses the Battery API (navigator.getBattery) when available.
 * Returns null when unsupported (desktop browsers, sandboxed iframes, etc.)
 * so callers can render a graceful fallback without a fake number.
 */
export function useBatteryStatus() {
  const [state, setState] = useState(null);

  useEffect(() => {
    let battery = null;
    let cancelled = false;

    const sync = () => {
      if (!battery || cancelled) return;
      setState({
        level: Math.round((battery.level || 0) * 100),
        charging: Boolean(battery.charging),
        supported: true,
      });
    };

    const attach = (b) => {
      battery = b;
      sync();
      const events = ["levelchange", "chargingchange"];
      events.forEach((evt) => b.addEventListener(evt, sync));
      b._scanopsDetach = () => events.forEach((evt) => b.removeEventListener(evt, sync));
    };

    if (typeof navigator !== "undefined" && typeof navigator.getBattery === "function") {
      navigator.getBattery().then((b) => {
        if (cancelled) return;
        attach(b);
      }).catch(() => {
        if (!cancelled) setState(null);
      });
    }

    return () => {
      cancelled = true;
      if (battery && typeof battery._scanopsDetach === "function") battery._scanopsDetach();
    };
  }, []);

  return state;
}