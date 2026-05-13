import React from "react";
import { ShieldAlert } from "lucide-react";
import PageHeader from "./PageHeader";
import { PageShell, SectionCard, WorkflowMain } from "./WorkflowPrimitives";
import { hasRoleAtLeast, restrictedActionReason } from "../../lib/scanOpsPermissions";
import { useScanOpsSession } from "../../lib/scanOpsSession";

export default function RoleGate({ requiredRole = "Staff", title = "Access restricted", children }) {
  const session = useScanOpsSession();
  const allowed = hasRoleAtLeast(session?.actorRole, requiredRole);

  if (allowed) return children;

  return (
    <PageShell>
      <PageHeader title={title} subtitle={restrictedActionReason(requiredRole)} />
      <WorkflowMain>
        <SectionCard className="border-amber-200 bg-amber-50/70">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="min-w-0">
              <h2 className="text-base font-black text-foreground">{restrictedActionReason(requiredRole)}</h2>
              <p className="mt-1 text-sm font-bold leading-snug text-muted-foreground">
                Current role: {session?.actorRole || "Staff"}.
              </p>
            </div>
          </div>
        </SectionCard>
      </WorkflowMain>
    </PageShell>
  );
}
