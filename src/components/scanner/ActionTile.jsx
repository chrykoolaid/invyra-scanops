import React from "react";
import { useNavigate } from "react-router-dom";

const emphasisClasses = {
  hero: "min-h-[132px] items-start justify-between rounded-[1.65rem] px-4 py-4 text-left",
  default: "h-[124px] min-h-[124px] items-start justify-start rounded-2xl px-3 pb-3 pt-3 text-left",
};

const activeClasses = {
  hero: "bg-primary text-primary-foreground border-primary shadow-md active:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/35",
  default: "bg-card border-border shadow-sm active:bg-secondary focus-visible:ring-2 focus-visible:ring-primary/35",
};

const iconClasses = {
  hero: "h-11 w-11 rounded-2xl bg-primary-foreground/15 text-primary-foreground",
  default: "h-10 w-10 rounded-2xl bg-primary/10 text-primary",
};

export default function ActionTile({
  icon: Icon,
  label,
  description,
  to,
  active = false,
  emphasis = "default",
  className = "",
}) {
  const navigate = useNavigate();
  const mode = emphasisClasses[emphasis] ? emphasis : "default";

  const handleTap = () => {
    if (active && to) navigate(to);
  };

  return (
    <button
      type="button"
      onClick={handleTap}
      className={`
        group flex w-full flex-col border transition-all duration-150 active:scale-[0.98]
        ${emphasisClasses[mode]}
        ${active ? activeClasses[mode] : "bg-secondary/50 border-transparent opacity-60"}
        ${className}
      `}
    >
      <span className={`flex shrink-0 items-center justify-center ${active ? iconClasses[mode] : "h-10 w-10 rounded-2xl bg-muted text-muted-foreground"}`}>
        <Icon className={mode === "hero" ? "h-5 w-5" : "h-[18px] w-[18px]"} strokeWidth={2} />
      </span>

      <span className="mt-3 min-w-0">
        <span className={`block text-sm font-black leading-tight ${active && mode === "hero" ? "text-primary-foreground" : active ? "text-foreground" : "text-muted-foreground"}`}>
          {label}
        </span>
        {description && (
          <span className={`mt-1 block text-xs font-bold leading-snug ${active && mode === "hero" ? "text-primary-foreground/80" : active ? "text-muted-foreground" : "text-muted-foreground"}`}>
            {description}
          </span>
        )}
      </span>
    </button>
  );
}
