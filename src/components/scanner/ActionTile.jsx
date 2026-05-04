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
        flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 aspect-square
        transition-all duration-150 active:scale-95
        ${active 
          ? "bg-card border-border shadow-sm active:bg-secondary" 
          : "bg-secondary/50 border-transparent opacity-60"
        }
      `}
    >
      <div className={`
        w-11 h-11 rounded-xl flex items-center justify-center
        ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
      `}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <span className={`text-xs font-semibold leading-tight text-center ${
        active ? "text-foreground" : "text-muted-foreground"
      }`}>
        {label}
      </span>
    </button>
  );
}