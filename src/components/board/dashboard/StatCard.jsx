import React from 'react';
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, className, iconBg = "bg-blue-50", iconColor = "text-blue-600", borderColor = "" }) {
  return (
    <div className={cn("bg-gradient-to-br from-white to-slate-50/50 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm border-l-4 hover:shadow-md transition-shadow relative", borderColor || "border-slate-200", className)}>
      <div className="space-y-0.5 pr-10">
        <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">{title}</p>
        <p className="text-lg sm:text-3xl font-bold text-slate-900 break-words">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 truncate hidden sm:block">{subtitle}</p>}
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trendUp ? "text-emerald-600" : "text-red-500")}>
            <span>{trendUp ? "↑" : "↓"}</span>
            <span>{trend}</span>
          </div>
        )}
      </div>
      {Icon && (
        <div className={cn("absolute top-3 sm:top-6 right-3 sm:right-6 p-1.5 sm:p-3 rounded-lg sm:rounded-xl", iconBg)}>
          <Icon className={cn("w-3.5 h-3.5 sm:w-5 sm:h-5", iconColor)} />
        </div>
      )}
    </div>
  );
}