import React from "react";

const TABS = ["Summary", "Inventory", "Locations", "Sales"];

export default function ItemDetailTabs({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1" role="tablist" aria-label="Item detail tabs">
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab)}
            className={`relative min-h-9 flex-1 whitespace-nowrap rounded-xl px-3 text-xs font-black transition-colors ${
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground active:bg-secondary"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}