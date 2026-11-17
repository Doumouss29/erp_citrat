import { useState, useEffect } from "react";
import RhPageHeader from "@/components/rh/RhPageHeader";
import { CalendarDays } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TeamMonthCalendar from "@/components/calendar/TeamMonthCalendar";
import {
  format, startOfMonth, endOfMonth,
} from "date-fns";

// Menu « Calendrier » visible par tous : Absences & Congés Planifiés.
// Les données viennent de la fonction serveur getTeamCalendar, qui ne
// renvoie que le nom, les dates et congé/absence (aucun motif ni justificatif).
export default function CalendrierPage() {
  // Toujours le mois en cours
  const [currentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const loadEvents = async () => {
    setError(null);
    try {
      const res = await base44.functions.invoke("getTeamCalendar", {
        start: format(monthStart, "yyyy-MM-dd"),
        end: format(monthEnd, "yyyy-MM-dd"),
      });
      const data = res?.data ?? res;
      setEvents(Array.isArray(data?.events) ? data.events : []);
    } catch (e) {
      console.error("Erreur calendrier:", e);
      setError("Impossible de charger le calendrier. Veuillez réessayer.");
      setEvents([]);
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-2 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <RhPageHeader icon={CalendarDays} eyebrow="Mon espace" title="Calendrier de l'équipe" subtitle="Congés, absences et missions du mois" />
        <TeamMonthCalendar events={events} month={currentMonth} error={error} />
      </div>
    </div>
  );
}
