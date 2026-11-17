import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Calendrier commun « Absences & Congés Planifiés » (page Calendrier et tableau de bord admin).
 * events : [{ id, kind: "conge" | "absence", employee_name, start_date, end_date }]
 */
export default function TeamMonthCalendar({ events = [], month = new Date(), error = null, className = "" }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const monthStart = startOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(month) });

  const getEventsForDate = (date) => {
    const d = format(date, "yyyy-MM-dd");
    return events.filter((ev) => {
      const s = String(ev.start_date || "").slice(0, 10);
      const e = String(ev.end_date || ev.start_date || "").slice(0, 10);
      return s && d >= s && d <= e;
    });
  };

  const firstName = (name) => (name || "Employé").split(" ")[0];
  const selectedEvents = selectedDay ? getEventsForDate(selectedDay) : [];

  return (
    <Card className={`shadow-xl border-0 bg-white ${className}`}>
      <CardHeader className="border-b border-slate-100 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base sm:text-xl font-bold text-slate-900 leading-tight">
              Absences & Congés Planifiés
            </CardTitle>
            <p className="mt-0.5 text-sm sm:text-base font-semibold text-blue-600 capitalize">
              {format(month, "MMMM yyyy", { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600 pt-3">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500" /> Congé</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-500" /> Absence</span>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
        )}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="text-center text-[10px] sm:text-xs font-bold text-slate-500 py-1 sm:py-2">{d}</div>
          ))}
          {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const weekend = isWeekend(day);
            return (
              <button
                type="button"
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[56px] sm:min-h-[88px] p-0.5 sm:p-1 rounded-lg text-left transition-colors border
                  ${weekend ? "bg-slate-100" : "bg-white hover:bg-slate-50"}
                  ${isToday ? "border-blue-500" : "border-transparent"}
                  ${isSelected ? "ring-2 ring-blue-400" : ""}`}
              >
                <div className={`font-semibold text-center text-[10px] sm:text-sm ${isToday ? "text-blue-600" : "text-slate-700"}`}>
                  {format(day, "d")}
                </div>
                {dayEvents.length > 0 && (
                  <div className="mt-0.5 sm:mt-1 space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={`${ev.kind}-${ev.id}`}
                        className={`text-[7px] sm:text-[9px] text-white px-0.5 sm:px-1 py-0.5 rounded truncate text-center uppercase ${ev.kind === "conge" ? "bg-green-500" : "bg-orange-500"}`}
                      >
                        {firstName(ev.employee_name)}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[7px] sm:text-[9px] text-slate-600 font-bold text-center">+{dayEvents.length - 2}</div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-slate-900 mb-2 capitalize">
              {format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })}
            </p>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-slate-500">Personne n'est en congé ou absent ce jour-là.</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedEvents.map((ev) => (
                  <li key={`${ev.kind}-${ev.id}`} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className={`w-2.5 h-2.5 rounded-full ${ev.kind === "conge" ? "bg-green-500" : "bg-orange-500"}`} />
                    <span className="font-medium">{ev.employee_name}</span>
                    <span className="text-slate-500">— {ev.kind === "conge" ? "Congé" : "Absence"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
