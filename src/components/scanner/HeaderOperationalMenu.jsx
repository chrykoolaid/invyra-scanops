import React, { useState } from "react";
import { Menu } from "lucide-react";
import OperationalMenuPanel from "./OperationalMenuPanel";
import { createScanOpsAuditEvent } from "../../lib/scanOpsAudit";
import { SCANOPS_EVENT_TYPES } from "../../lib/scanOpsEvents";

export default function HeaderOperationalMenu() {
  const [open, setOpen] = useState(false);
  const openMenu = () => {
    createScanOpsAuditEvent(SCANOPS_EVENT_TYPES.OPERATIONAL_MENU_OPENED, { status: "viewed" });
    setOpen(true);
  };
  return (
    <>
      <button type="button" onClick={openMenu} className="w-10 h-10 shrink-0 rounded-xl bg-secondary text-foreground flex items-center justify-center active:scale-95 active:bg-border transition-all" aria-label="Open operational menu">
        <Menu className="w-5 h-5" strokeWidth={2.4} />
      </button>
      {open && <OperationalMenuPanel onClose={() => setOpen(false)} />}
    </>
  );
}
