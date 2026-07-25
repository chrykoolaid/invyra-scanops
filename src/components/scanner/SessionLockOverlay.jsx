import React from "react";
import { LockKeyhole, LogOut, Unlock } from "lucide-react";
import { useScanOpsSessionLocked, setScanOpsSessionLocked } from "../../lib/scanOpsSessionControl";
import { useScanOpsSession } from "../../lib/scanOpsSession";
import { useAuth } from "@/lib/AuthContext";

export default function SessionLockOverlay() {
  const locked = useScanOpsSessionLocked();
  const session = useScanOpsSession();
  const { logout } = useAuth();

  if (!locked) return null;

  const unlock = () => setScanOpsSessionLocked(false);
  const signOut = () => {
    setScanOpsSessionLocked(false);
    logout(true);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background px-6 text-center"
      aria-label="Session locked"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-foreground">
        <LockKeyhole className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-xl font-black text-foreground">Session locked</h2>
      <p className="mt-1 max-w-xs text-sm font-semibold leading-snug text-muted-foreground">
        Idle timeout reached. The handheld is locked to protect the active session.
      </p>
      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
        {session.actorName} · {session.actorRole}
      </p>
      <div className="mt-6 grid w-full max-w-xs grid-cols-2 gap-3">
        <button
          type="button"
          onClick={unlock}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-secondary px-3 text-sm font-black text-secondary-foreground active:scale-[0.98]"
        >
          <Unlock className="h-4 w-4" /> Unlock
        </button>
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-destructive px-3 text-sm font-black text-destructive-foreground active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
      <p className="mt-4 text-[10px] font-bold text-muted-foreground">PIN and biometric unlock are on the session roadmap.</p>
    </div>
  );
}