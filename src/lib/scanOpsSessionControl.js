import { useEffect, useState, useRef } from "react";

const CONTROL_KEY = "invyra_scanops_session_control_v1";
const CONTROL_EVENT = "scanops-session-control-updated";
const LOCK_KEY = "invyra_scanops_session_locked_v1";
const LOCK_EVENT = "scanops-session-locked-updated";

const DEFAULT_CONTROL = { timeout: "30 min", lockEnabled: true };

const IDLE_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "pointerdown"];

function readControl() {
  if (typeof window === "undefined") return DEFAULT_CONTROL;
  try {
    const raw = window.localStorage.getItem(CONTROL_KEY);
    return raw ? { ...DEFAULT_CONTROL, ...JSON.parse(raw) } : DEFAULT_CONTROL;
  } catch {
    return DEFAULT_CONTROL;
  }
}

function writeControl(control) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CONTROL_KEY, JSON.stringify(control));
    window.dispatchEvent(new CustomEvent(CONTROL_EVENT, { detail: control }));
  }
  return control;
}

export function getScanOpsSessionControl() {
  return readControl();
}

export function setScanOpsSessionControl(patch = {}) {
  return writeControl({ ...readControl(), ...patch });
}

export function clearScanOpsSessionLock() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LOCK_KEY);
    window.dispatchEvent(new CustomEvent(LOCK_EVENT, { detail: false }));
  }
}

function readLocked() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LOCK_KEY) === "1";
}

function writeLocked(locked) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCK_KEY, locked ? "1" : "0");
    window.dispatchEvent(new CustomEvent(LOCK_EVENT, { detail: locked }));
  }
  return locked;
}

export function setScanOpsSessionLocked(locked) {
  return writeLocked(locked);
}

export function useScanOpsSessionControl() {
  const [control, setControl] = useState(() => readControl());
  useEffect(() => {
    const refresh = () => setControl(readControl());
    window.addEventListener(CONTROL_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CONTROL_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return control;
}

export function useScanOpsSessionLocked() {
  const [locked, setLocked] = useState(() => readLocked());
  useEffect(() => {
    const refresh = () => setLocked(readLocked());
    window.addEventListener(LOCK_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LOCK_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return locked;
}

function timeoutToMs(timeout) {
  if (!timeout || timeout === "Off") return 0;
  const mins = parseInt(String(timeout), 10);
  return Number.isNaN(mins) ? 0 : mins * 60 * 1000;
}

export function useScanOpsIdleGuard({ onAutoSignOut } = {}) {
  const control = useScanOpsSessionControl();
  const cbRef = useRef(onAutoSignOut);
  cbRef.current = onAutoSignOut;

  useEffect(() => {
    const ms = timeoutToMs(control.timeout);
    if (!ms) return undefined;

    let lastActivity = Date.now();
    const mark = () => {
      lastActivity = Date.now();
    };

    IDLE_EVENTS.forEach((evt) => window.addEventListener(evt, mark, { passive: true }));

    const interval = window.setInterval(() => {
      if (Date.now() - lastActivity >= ms) {
        lastActivity = Date.now();
        if (control.lockEnabled) {
          setScanOpsSessionLocked(true);
        } else {
          cbRef.current?.();
        }
      }
    }, 5000);

    return () => {
      IDLE_EVENTS.forEach((evt) => window.removeEventListener(evt, mark));
      window.clearInterval(interval);
    };
  }, [control.timeout, control.lockEnabled]);
}