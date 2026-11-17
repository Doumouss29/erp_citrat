import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import TeamMonthCalendar from "@/components/calendar/TeamMonthCalendar";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";

export default function MonthlyCalendar({ absences, leaves }) {
  const [currentMonth] = useState(new Date());
  const [criticalPeriods, setCriticalPeriods] = useState([]);

  useEffect(() => {
    identifyCriticalPeriods();
  }, [absences, leaves, currentMonth]);

  const identifyCriticalPeriods = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const dailyAbsences = {};
    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      dailyAbsences[dateStr] = 0;
    });

    [...absences, ...leaves].forEach(request => {
      if (request.status === "approved") {
        const start = new Date(request.start_date);
        const end = new Date(request.end_date);
        const requestDays = eachDayOfInterval({ start, end });
        
        requestDays.forEach(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          if (dailyAbsences[dateStr] !== undefined && !isWeekend(day)) {
            dailyAbsences[dateStr]++;
          }
        });
      }
    });

    // Identifier les jours critiques (>5 absences)
    const critical = Object.entries(dailyAbsences)
      .filter(([date, count]) => count >= 5)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.count - a.count);

    setCriticalPeriods(critical);
  };

  // Mêmes données que la page Calendrier : demandes approuvées, congés en vert, absences en orange
  const events = [
    ...leaves.filter((r) => r.status === "approved").map((r) => ({ ...r, kind: "conge" })),
    ...absences.filter((r) => r.status === "approved").map((r) => ({ ...r, kind: "absence" })),
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }}
        className="xl:col-span-2"
      >
        <TeamMonthCalendar events={events} month={currentMonth} className="h-full" />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.2 }}
      >
        <Card className="shadow-xl border-0 bg-gradient-to-br from-red-50 to-orange-50 h-full">
          <CardHeader className="border-b border-red-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Périodes Critiques
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {criticalPeriods.length > 0 ? (
              <div className="space-y-3">
                {criticalPeriods.slice(0, 5).map(period => (
                  <div key={period.date} className="bg-white rounded-lg p-3 border border-red-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-slate-900">
                        {format(new Date(period.date), "dd MMM", { locale: fr })}
                      </p>
                      <Badge className="bg-red-600 text-white">{period.count}</Badge>
                    </div>
                    <p className="text-xs text-slate-600">
                      {period.count} employé{period.count > 1 ? 's' : ''} absent{period.count > 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500">Aucune période critique détectée</p>
                <p className="text-xs text-slate-400 mt-1">Seuil: 5+ absences/jour</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}