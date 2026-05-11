import React from "react";
import { Delete } from "lucide-react";

export default function NumericKeypad({ value, onChange, allowDecimal = false }) {
  const handleKey = (key) => {
    if (key === "del") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (!allowDecimal || value.includes(".")) return;
      onChange(value ? `${value}.` : "0.");
      return;
    }
    if (value.length < 7) {
      onChange(value + key);
    }
  };

  const keys = allowDecimal ? ["1","2","3","4","5","6","7","8","9",".","0","del"] : ["1","2","3","4","5","6","7","8","9","","0","del"];

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((key, i) => {
        if (key === "") return <div key={i} />;
        return (
          <button
            key={i}
            onClick={() => handleKey(key)}
            className="h-14 rounded-xl bg-secondary text-foreground font-bold text-xl active:scale-95 active:bg-border transition-all flex items-center justify-center"
          >
            {key === "del" ? <Delete className="w-5 h-5" /> : key}
          </button>
        );
      })}
    </div>
  );
}
