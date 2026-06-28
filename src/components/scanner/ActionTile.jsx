import React from "react";
import { useNavigate } from "react-router-dom";

const emphasisClasses = {
  hero: "min-h-[128px] items-start justify-between rounded-[1.65rem] px-4 py-4 text-left",
  default: "h-[112px] min-h-[112px] items-center justify-center rounded-xl px-2.5 py-3 text-center",
};

const activeClasses = {
  hero: "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-950/30 active:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-300/40",
  default: "border-white/5 shadow-none focus-visible:ring-2 focus-visible:ring-blue-300/35",
};

const toneClasses = {
  default: {
    tile: "bg-slate-800 text-slate-100 active:bg-slate-700",
    icon: "bg-white/10 text-slate-100",
  },
  blue: {
    tile: "bg-blue-950/95 text-blue-50 active:bg-blue-900",
    icon: "bg-blue-300/15 text-blue-100",
  },
  green: {
    tile: "bg-emerald-950/95 text-emerald-50 active:bg-emerald-900",
    icon: "bg-emerald-300/15 text-emerald-100",
  },
  purple: {
    tile: "bg-purple-950/95 text-purple-50 active:bg-purple-900",
    icon: "bg-purple-300/15 text-purple-100",
  },
  grey: {
    tile: "bg-slate-800 text-slate-50 active:bg-slate-700",
    icon: "bg-slate-200/10 text-slate-100",
  },
  amber: {
    tile: "bg-amber-900/95 text-amber-50 active:bg-amber-800",
    icon: "bg-amber-200/15 text-amber-100",
  },
};

const heroIconClasses = "h-11 w-11 rounded-2xl bg-white/15 text-white";

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
        ${active ? activeTileClass : "bg-slate-800/60 border-transparent text-slate-500 opacity-60"}
        ${className}
      `}
    >
      <span className={`flex shrink-0 items-center justify-center ${active ? iconClass : "h-9 w-9 rounded-xl bg-white/5 text-slate-500"}`}>
        <Icon className={mode === "hero" ? "h-5 w-5" : "h-[18px] w-[18px]"} strokeWidth={2} />
      </span>

      <span className={mode === "hero" ? "mt-3 min-w-0" : "mt-2 min-w-0"}>
        <span className={`block font-black leading-tight ${mode === "hero" ? "text-sm" : "text-[13px]"} ${active ? "text-current" : "text-slate-500"}`}>
          {label}
        </span>
        {description && (
          <span className={`mt-1 block font-bold leading-snug ${mode === "hero" ? "text-xs" : "text-[10.5px]"} ${active ? "text-current/70" : "text-slate-500"}`}>
            {description}
          </span>
        )}
      </span>
    </button>
  );
}
