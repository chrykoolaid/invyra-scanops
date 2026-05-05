import React from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function AppHeader() {
  const isOnline = true;

  return (
    <header className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-foreground tracking-tight">
            StockPilot
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sarah M. · Grocery
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium text-accent">Synced</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-destructive" />
              <span className="text-xs font-medium text-destructive">Offline</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}