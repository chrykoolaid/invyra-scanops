import React from "react";

export default function InfoRow({ icon: Icon, label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${highlight ? "text-destructive" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}