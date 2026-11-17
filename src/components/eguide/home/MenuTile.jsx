import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function MenuTile({ to, title, Icon, accent = "indigo" }) {
  const accentClasses = {
    indigo: "from-indigo-300 to-indigo-200 hover:from-indigo-400 text-indigo-950",
    sky: "from-sky-300 to-sky-200 hover:from-sky-400 text-sky-950",
    emerald: "from-emerald-300 to-emerald-200 hover:from-emerald-400 text-emerald-950",
    amber: "from-amber-300 to-amber-200 hover:from-amber-400 text-amber-950",
    rose: "from-rose-300 to-rose-200 hover:from-rose-400 text-rose-950",
    violet: "from-violet-300 to-violet-200 hover:from-violet-400 text-violet-950",
    slate: "from-slate-200 to-slate-100 hover:from-slate-300 text-slate-950",
  };

  const accentIconColors = {
    indigo: "text-indigo-700",
    sky: "text-sky-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
    violet: "text-violet-700",
    slate: "text-slate-700",
  };

  return (
    <Link to={to} className="block">
      <div
        className={cn(
          "group relative w-full overflow-hidden rounded-2xl border border-slate-300 bg-gradient-to-b p-3 sm:p-5 shadow-sm sm:shadow-md transition-all min-h-[88px] sm:min-h-[96px]",
          "hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]",
          accentClasses[accent] || accentClasses.indigo
        )}
      >
        <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 text-center">
          <div className="rounded-lg sm:rounded-xl bg-white/90 border border-slate-300 p-2 sm:p-3 shadow-sm sm:shadow-md shrink-0">
            {Icon && <Icon className={cn("w-6 h-6 sm:w-7 sm:h-7", accentIconColors[accent] || "text-slate-700")} />}
          </div>
          <div>
            <div className="min-w-0 text-[12px] sm:text-base font-semibold leading-snug whitespace-normal break-words text-center uppercase font-display tracking-wide">{title}</div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/50 blur-2xl" />
      </div>
    </Link>
  );
}