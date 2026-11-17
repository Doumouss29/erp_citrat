import React from 'react';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatsCards({ stats = [], className }) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trend > 0 ? TrendingUp : stat.trend < 0 ? TrendingDown : Minus;
        
        return (
          <Card 
            key={index} 
            className="p-5 relative overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <div 
              className="absolute top-0 right-0 w-24 h-24 transform translate-x-6 -translate-y-6 rounded-full opacity-10"
              style={{ backgroundColor: stat.color }}
            />
            
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stat.value}
                </p>
                {stat.trend !== undefined && (
                  <div className={cn(
                    "flex items-center gap-1 mt-2 text-xs font-medium",
                    stat.trend > 0 ? "text-emerald-600" : 
                    stat.trend < 0 ? "text-red-600" : "text-slate-400"
                  )}>
                    <TrendIcon className="w-3 h-3" />
                    <span>{Math.abs(stat.trend)}% ce mois</span>
                  </div>
                )}
              </div>
              
              {Icon && (
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}