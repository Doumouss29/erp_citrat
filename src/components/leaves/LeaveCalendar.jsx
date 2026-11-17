import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

export default function LeaveCalendar({ leaves, remainingDays }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getDayStatus = (day) => {
    for (const leave of leaves) {
      const leaveStart = new Date(leave.start_date);
      const leaveEnd = new Date(leave.end_date);
      
      if (isWithinInterval(day, { start: leaveStart, end: leaveEnd })) {
        return leave.status;
      }
    }
    return null;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const statusColors = {
    approved: "bg-green-500",
    pending: "bg-yellow-500",
    rejected: "bg-red-300"
  };

  return (
    <Card className="shadow-xl border-0 bg-white">
      <CardHeader className="border-b border-slate-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-purple-600" />
            <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">
              Calendrier des Congés
            </CardTitle>
          </div>
          <Badge className="bg-purple-100 text-purple-700 text-sm sm:text-base">
            Solde: {remainingDays} jours restants
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={previousMonth}
            className="rounded-xl"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-bold text-slate-900">
            {format(currentDate, "MMMM yyyy", { locale: fr })}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            className="rounded-xl"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
            <div key={i} className="text-center text-xs font-semibold text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day, i) => {
            const status = getDayStatus(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

            return (
              <div
                key={i}
                className={`aspect-square flex items-center justify-center rounded-lg text-sm transition-all ${
                  !isCurrentMonth
                    ? "text-slate-300"
                    : isToday
                    ? "bg-blue-100 text-blue-900 font-bold ring-2 ring-blue-500"
                    : status
                    ? `${statusColors[status]} text-white font-semibold`
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-sm text-slate-600">Approuvé</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500"></div>
            <span className="text-sm text-slate-600">En attente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 ring-2 ring-blue-500"></div>
            <span className="text-sm text-slate-600">Aujourd'hui</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}