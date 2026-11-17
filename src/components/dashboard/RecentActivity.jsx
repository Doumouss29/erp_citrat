import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogIn, LogOut } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecentActivity({ timeEntries, loading }) {
  if (loading) {
    return (
      <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100 p-6">
          <CardTitle className="text-xl font-bold">Activité Récente</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full mb-4" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100 p-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-600" />
          <CardTitle className="text-xl font-bold">Activité Récente</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {timeEntries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">Aucune activité récente</p>
            </div>
          ) : (
            timeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                  entry.entry_type === "entry"
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                    : entry.entry_type === "break_start"
                    ? "bg-gradient-to-br from-orange-400 to-orange-500"
                    : entry.entry_type === "break_end"
                    ? "bg-gradient-to-br from-green-500 to-green-600"
                    : "bg-gradient-to-br from-red-500 to-red-600"
                }`}>
                  {entry.entry_type === "entry" ? (
                    <LogIn className="w-5 h-5 text-white" />
                  ) : (
                    <LogOut className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{entry.employee_name}</p>
                  <p className="text-xs text-slate-500">
                    {({ entry: "Entrée", break_start: "Pause", break_end: "Reprise", exit: "Sortie" })[entry.entry_type] || "Sortie"} • {entry.time}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {format(parseISO(entry.date), "d MMM", { locale: fr })}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}