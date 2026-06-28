import React from "react";
import { useNavigate } from "react-router-dom";

const emphasisClasses = {
  hero: "min-h-[128px] items-start justify-between rounded-[1.65rem] px-4 py-4 text-left",
  default: "h-[112px] min-h-[112px] items-center justify-center rounded-xl px-2.5 py-3 text-center",
};

const activeClasses = {
  hero: "bg-primary text-primary-foreground border-primary shadow-md active:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/35",
  default: "bg-card border-transparent shadow-none active:bg-secondary focus-visible:ring-2 focus-visible:ring-primary/35",
};

const toneClasses = {
  default: {
    tile: "",
    icon: "bg-primary/10 text-primary",
  },
  blue: {
    tile: "bg-blue-50/95 text-blue-950 active:bg-blue-100",
    icon: "bg-blue-600/12 text-blue-700",
  },
  green: {
    tile: "bg-emerald-50/95 text-emerald-950 active:bg-emerald-100",
    icon: "bg-emerald-600/12 text-emerald-700",
  },
  purple: {
    tile: "bg-purple-50/95 text-purple-950 active:bg-purple-100",
    icon: "bg-purple-600/12 text-purple-700",
  },
  grey: {
    tile: "bg-slate-100 text-slate-950 active:bg-slate-200",
    icon: "bg-slate-700/10 text-slate-700",
  },
  amber: {
    tile: "bg-amber-50/95 text-amber-950 active:bg-amber-100",
    icon: "bg-amber-500/15 text-amber-700",
  },
};

const heroIconClasses = "h-11 w-11 rounded-2xl bg-primary-foreground/15 text-primary-foreground";

export default function ActionTile({
  icon: Icon,
  label,
  description,
  to,
  active = false,
  emphasis = "default",
  tone = "default",
  className = ""
}) {
  const navigate = useNavigate();
  const mode = emphasisClasses[emphasis] ? emphasis : "default";
  const tileTone = toneClasses[tone] || toneClasses.default;

  const handleTap = () => {
    if (active && to) navigate(to);
  };

  const activeTileClass = mode === "hero"
    ? activeClasses.hero
    : `${activeClasses.default} ${tileTone.tile}`;

  const iconClass = mode === "hero" ? heroIconClasses : `h-9 w-9 rounded-xl ${tileTone.icon}`;

  return (
    <button
      type="button"
      onClick={handleTap}
      className={`
        group flex w-full flex-col border transition-all duration-150 active:scale-[0.98]
        ${emphasisClasses[mode]}
        ${active ? activeTileClass : "bg-secondary/50 border-transparent opacity-60"}
        ${className}
      `}
    >
      <span className={`flex shrink-0 items-center justify-center ${active ? iconClass : "h-9 w-9 rounded-xl bg-muted text-muted-foreground"}`}>
        <Icon className={mode === "hero" ? "h-5 w-5" : "h-[18px] w-[18px]"} strokeWidth={2} />
      </span>

      <span className={mode === "hero" ? "mt-3 min-w-0" : "mt-2 min-w-0"}>
        <span className={`block font-black leading-tight ${mode === "hero" ? "text-sm" : "text-[13px]"} ${active && mode === "hero" ? "text-primary-foreground" : active ? "text-current" : "text-muted-foreground"}`}>
          {label}
        </span>
        {description && (
          <span className={`mt-1 block font-bold leading-snug ${mode === "hero" ? "text-xs" : "text-[10.5px]"} ${active && mode === "hero" ? "text-primary-foreground/80" : active ? "text-current/65" : "text-muted-foreground"}`}>
            {description}
          </span>
        )}
      </span>
    </button>
  );
}
