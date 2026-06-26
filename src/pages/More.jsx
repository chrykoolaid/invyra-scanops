import React from "react";
import AppHeader from "../components/scanner/AppHeader";

export default function More() {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <AppHeader title="More" subtitle="Secondary ScanOps workflows" />
      <main data-scanops-scroll className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-24 space-y-2">
        <section className="scanops-work-card">
          <p className="text-sm font-black text-foreground">More workflows</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">Receiving, transfers, markdowns, stock count, reports, settings, and help live here.</p>
        </section>
      </main>
    </div>
  );
}
