import React from "react";

export default function TransferStepCard({ title, helper, icon: Icon, children }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-4 space-y-3 min-w-0">
      <div className="flex items-start gap-3">
        {Icon && <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></div>}
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground break-words">{title}</h2>
          {helper && <p className="text-xs text-muted-foreground mt-1 break-words">{helper}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
