import React from "react";
import { CheckCircle2 } from "lucide-react";
import { SectionCard } from "./WorkflowPrimitives";

export default function WorkflowStepGuide({ eyebrow = "Workflow", title, steps = [] }) {
  return (
    <SectionCard className="space-y-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
        {title && <h2 className="mt-1 text-lg font-black text-foreground">{title}</h2>}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {steps.map((step, index) => (
          <div key={`${step.label}-${index}`} className={`rounded-2xl border px-3 py-3 ${step.active ? "border-primary bg-primary/5" : step.done ? "border-primary/20 bg-primary/5" : "border-border bg-secondary/50"}`}>
            <div className="flex items-start gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${step.active ? "bg-primary text-primary-foreground" : step.done ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground"}`}>
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-black text-foreground">{step.label}</span>
                {step.helper && <span className="mt-0.5 block text-[11px] font-bold leading-snug text-muted-foreground">{step.helper}</span>}
              </span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
