import React from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export default function ActionTile({ icon: Icon, label, to, active = false }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleTap = () => {
    if (active && to) {
      navigate(to);
    } else {
      toast({
        description: "Coming in later stage",
        duration: 1500,
      });
    }
  };

  return (
    <button
      onClick={handleTap}
      className={`
        group flex h-[108px] min-h-[108px] w-full flex-col items-center justify-start rounded-2xl border px-2.5 pb-2.5 pt-3
        text-center transition-all duration-150 active:scale-[0.98]
        ${active
          ? "bg-card border-border shadow-sm active:bg-secondary focus-visible:ring-2 focus-visible:ring-primary/35"
          : "bg-secondary/50 border-transparent opacity-60"
        }
      `}
    >
      <span
        className={`
          flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
          ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
        `}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>

      <span
        className={`
          mt-2 flex h-8 w-full max-w-[86px] items-center justify-center text-center text-[11.5px] font-semibold leading-[1.12]
          ${active ? "text-foreground" : "text-muted-foreground"}
        `}
      >
        {label}
      </span>
    </button>
  );
}
