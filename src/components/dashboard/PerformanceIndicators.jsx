import React, { useState, useEffect } from 'react';
import { Clock, Award, Briefcase, Users, FileX, CalendarDays, CheckCircle2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { autoGridStyle } from "@/components/cgesn/StatCard";
import { upcomingEndCounts } from "@/lib/departures";
import { base44 } from "@/api/base44Client";

// Nom de bureau normalisé (majuscules, sans accents) pour comparer fiches et terminaux
const normOffice = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toUpperCase();

// Vue d'ensemble du tableau de bord RH : présence du jour, demandes à traiter, effectifs, présence par bureau
export default function PerformanceIndicators({ timeEntries, workLogs, employees, activeMissions = [], absences = [], leaves = [], todayEntries, pendingAbsences, pendingLeaves, activeEmployees, onNavigate }) {
  const [stats, setStats] = useState({
    attendanceRate: 0,
    totalRequiringAttendance: 0,
    presentToday: 0,
    overtimeHours: 0,
    officePresence: []
  });

  // Bureaux dont le terminal de pointage est désactivé : leurs agents ne sont pas attendus au pointage
  const [disabledOffices, setDisabledOffices] = useState(null);
  useEffect(() => {
    base44.entities.OfficeTerminal.list(null, 200)
      .then((list) => setDisabledOffices(new Set((list || []).filter((t) => t.is_active === false).map((t) => normOffice(t.office_name)))))
      .catch(() => setDisabledOffices(new Set()));
  }, []);

  useEffect(() => {
    calculateStats();
  }, [timeEntries, workLogs, employees, activeMissions, absences, leaves, disabledOffices]);

  const calculateStats = () => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthStartStr = format(monthStart, "yyyy-MM-dd");
    const monthEndStr = format(monthEnd, "yyyy-MM-dd");

    // IDs des employés actuellement en mission active
    const employeeIdsOnMission = new Set(activeMissions.map(m => m.employee_id));

    // Employés en congé ou en absence approuvé(e) couvrant aujourd'hui : ils ne sont pas attendus
    const coversToday = (r) => r && r.status === "approved" && r.start_date && r.start_date <= todayStr && (r.end_date || r.start_date) >= todayStr;
    const employeeIdsExcused = new Set(
      [...(absences || []), ...(leaves || [])].filter(coversToday).map(r => r.employee_id)
    );

    // Taux de présence JOURNALIER - employés "Actif - Pointage requis", déjà embauchés,
    // ni en mission, ni en congé / absence approuvé(e) aujourd'hui
    const employeesRequiringAttendance = employees.filter(e => 
      e.is_active && 
      e.attendance_status === "Actif - Pointage requis" &&
      !(e.hire_date && e.hire_date > todayStr) &&
      !(disabledOffices && disabledOffices.has(normOffice(e.office))) &&
      !employeeIdsOnMission.has(e.id) &&
      !employeeIdsExcused.has(e.id)
    );
    const totalRequiringAttendance = employeesRequiringAttendance.length;

    // Compter une seule entrée par employé aujourd'hui (première entrée du jour)
    const presentToday = new Set();
    timeEntries
      .filter(e => e.date === todayStr && e.entry_type === "entry")
      .forEach(entry => {
        const emp = employeesRequiringAttendance.find(e => e.id === entry.employee_id);
        if (emp) presentToday.add(emp.id);
      });

    const attendanceRate = totalRequiringAttendance > 0 ? Math.round((presentToday.size / totalRequiringAttendance) * 100) : 0;

    // Heures supplémentaires du mois
    const monthWorkLogs = workLogs.filter(log => 
      log.date >= monthStartStr && log.date <= monthEndStr
    );
    const overtimeHours = monthWorkLogs
      .filter(log => log.balance > 0)
      .reduce((sum, log) => sum + log.balance, 0);

    // Taux de présence du jour par bureau : même calcul que le taux global (présents / attendus)
    const officeStats = {};

    employeesRequiringAttendance.forEach(emp => {
      if (!emp.office) return;
      if (!officeStats[emp.office]) {
        officeStats[emp.office] = { present: 0, expected: 0 };
      }
      officeStats[emp.office].expected += 1;
      if (presentToday.has(emp.id)) {
        officeStats[emp.office].present += 1;
      }
    });

    // Bureaux dont le pointage est activé et qui ont des agents attendus (y compris 0 présent),
    // pour que la somme par bureau corresponde au total global
    const officePresence = Object.entries(officeStats)
      .map(([office, s]) => ({
        name: office,
        rate: Math.round((s.present / s.expected) * 100),
        present: s.present,
        expected: s.expected
      }))
      .sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name, "fr"));

    setStats({
      attendanceRate,
      totalRequiringAttendance,
      presentToday: presentToday.size,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      officePresence
    });
  };

  const officeLabels = {
    "Abidjan": "Bureau Abidjan",
    "Yamoussoukro": "Bureau Yamoussoukro",
    "Daloa": "Bureau Daloa",
    "Bouaflé": "Bureau Bouaflé",
    "Sinfra": "Bureau Sinfra",
    "Issia": "Bureau Issia",
    "Siege": "Siège"
  };

  const todayLabel = (() => { const d = format(new Date(), "EEEE d MMMM", { locale: fr }); return d.charAt(0).toUpperCase() + d.slice(1); })();
  const rate = Math.max(0, Math.min(100, stats.attendanceRate || 0));
  const R = 46, C = 2 * Math.PI * R;
  const toValidate = (pendingAbsences || 0) + (pendingLeaves || 0);
  const upcomingEnds = upcomingEndCounts(employees);
  const go = (page) => onNavigate && onNavigate(page);

  // Charte RH-CGESN : vert pétrole + doré (même identité que le terminal de pointage)
  const GOLD = "#d4af6a";
  const rateColor = (r) => (r >= 90 ? "#34d399" : r >= 75 ? GOLD : "#f87171");
  const barColor = (r) => (r >= 90 ? "#137f8c" : r >= 75 ? "#c9a24f" : "#dc2626");

  // Tuile cliquable « verre » posée sur le bandeau sombre
  const Tile = ({ label, sub, value, Icon, onClick, highlight }) => {
    const Comp = onClick ? "button" : "div";
    return (
      <Comp
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={`group w-full min-h-[48px] flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
          onClick ? "hover:bg-[#F0F6F7] cursor-pointer" : ""
        } bg-white ring-1 ring-[#DFE8EA]`}
      >
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-none bg-[#F6EBD5]" style={{ color: "#A7792E" }}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs sm:text-sm font-medium text-[#0D5C66] whitespace-normal break-normal leading-snug">{label}</span>
          {sub && <span className="hidden xl:block text-[11px] text-[#667A82] whitespace-normal break-normal">{sub}</span>}
        </span>
        <span className="shrink-0 text-right text-base sm:text-lg xl:text-xl font-semibold tabular-nums" style={{ color: highlight ? "#B8862E" : "#0D5C66" }}>{value}</span>
        {/* Emplacement de la flèche toujours réservé : les chiffres restent alignés */}
        <ChevronRight className={`w-4 h-4 flex-none transition-colors ${onClick ? "text-[#8BA3AA] group-hover:text-[#0D5C66]" : "invisible"}`} aria-hidden={!onClick} />
      </Comp>
    );
  };

  const SectionTitle = ({ children, right }) => (
    <div className="flex items-center justify-between gap-2 mb-3 min-h-[22px]">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "#A7792E" }}>{children}</p>
      {right}
    </div>
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Bandeau RH-CGESN : présence du jour · à traiter · effectifs */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="relative overflow-hidden rounded-2xl text-[#0D5C66] shadow-sm border border-[#DFE8EA]"
        style={{ background: "#F3F7F8" }}
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl" style={{ background: "rgba(13,92,102,0.025)" }} aria-hidden />
        <div className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-[#E8F2F3]/30 blur-3xl" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, transparent, #D4AF6A, transparent)` }} aria-hidden />

        <div className="relative grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 xl:items-stretch">
          {/* Présence */}
          <div className="p-3 sm:p-4 flex flex-col min-w-0">
            <SectionTitle>Présence · {todayLabel}</SectionTitle>
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex-1 flex items-center gap-3 sm:gap-4 min-w-0 min-h-[78px]">
                <div className="relative flex-none w-[68px] h-[68px] sm:w-[76px] sm:h-[76px]" role="img" aria-label={`Taux de présence : ${Math.round(rate)} %`}>
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#D9E6E8" strokeWidth="9" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#0D5C66" strokeWidth="9" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={(2 * Math.PI * 42) * (1 - rate / 100)}
                      className="transition-all duration-500" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm sm:text-base font-semibold text-[#0D5C66] tabular-nums">{Math.round(rate)}%</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-semibold leading-tight tabular-nums text-[#0D5C66]">
                    {stats.presentToday}<span className="text-base sm:text-lg font-medium text-[#667A82]"> / {stats.totalRequiringAttendance}</span>
                  </p>
                  <p className="mt-1 text-xs text-[#667A82]">agents présents</p>
                </div>
              </div>
              <div className="flex">
                <Tile label="En mission" value={activeMissions.length} Icon={Briefcase} onClick={() => go("MissionsHistory")} />
              </div>
            </div>
          </div>

          {/* À traiter */}
          <div className="p-3 sm:p-4 border-t md:border-t-0 md:border-l border-[#DFE8EA] flex flex-col min-w-0">
            <SectionTitle
              right={toValidate > 0
                ? <span className="rounded-full text-[11px] font-bold px-2.5 py-1" style={{ background: "#E8F2F3", color: "#0D5C66" }}>{toValidate} en attente</span>
                : <span className="inline-flex items-center gap-1 rounded-full bg-white/10 text-[#0D5C66] text-[11px] font-bold px-2.5 py-1"><CheckCircle2 className="w-3.5 h-3.5" />À jour</span>}
            >
              À traiter
            </SectionTitle>
            <div className="flex-1 flex flex-col gap-2">
              <div className="md:flex-1 flex"><Tile label="Demandes d'absence" sub={(pendingAbsences || 0) > 0 ? "En attente de validation" : "Aucune demande"}
                value={pendingAbsences || 0} Icon={FileX} onClick={() => go("Validation")} highlight={(pendingAbsences || 0) > 0} /></div>
              <div className="md:flex-1 flex"><Tile label="Demandes de congé" sub={(pendingLeaves || 0) > 0 ? "En attente de validation" : "Aucune demande"}
                value={pendingLeaves || 0} Icon={CalendarDays} onClick={() => go("Validation")} highlight={(pendingLeaves || 0) > 0} /></div>
            </div>
          </div>

          {/* Effectifs */}
          <div className="p-3 sm:p-4 md:col-span-2 xl:col-span-1 border-t xl:border-t-0 xl:border-l border-[#DFE8EA] flex flex-col min-w-0">
            <SectionTitle>Effectifs</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-2">
              <Tile label="Employés actifs" value={activeEmployees ?? 0} Icon={Users} />
              <Tile label="Fins de contrat · 30 jours" value={upcomingEnds.total} Icon={CalendarDays} onClick={() => go("GestionPersonnel?tab=departures")} />
              <Tile label="Heures sup. du mois" value={`${stats.overtimeHours}h`} Icon={Clock} />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Taux de présence par bureau */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-3xl overflow-hidden shadow-sm ring-1 ring-[#0d5c66]/10"
        style={{ background: "linear-gradient(180deg,#f1f6f7 0%,#ffffff 70%)" }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap px-5 sm:px-7 py-4 border-b border-[#0d5c66]/10">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "#0d5c66" }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#0d5c66", color: GOLD }}>
              <Award className="w-4 h-4" />
            </span>
            Taux de présence par bureau
          </h3>
          <span className="text-xs font-semibold rounded-full px-3 py-1" style={{ background: "rgba(13,92,102,0.08)", color: "#0d5c66" }}>
            {todayLabel}
          </span>
        </div>
        <div className="px-5 sm:px-7 py-5">
          {stats.officePresence.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun agent connecté pour le moment.</p>
          ) : (
            <div className="grid gap-x-8 gap-y-4" style={autoGridStyle(260)}>
              {stats.officePresence.map((dept, idx) => (
                <div key={dept.name} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700 truncate">
                      <span className="font-bold mr-1.5" style={{ color: "#c9a24f" }}>{idx + 1}.</span>{officeLabels[dept.name] || dept.name}
                    </span>
                    <span className="flex-none text-sm tabular-nums">
                      <span className="text-xs font-medium text-slate-500 mr-1.5">{dept.present}/{dept.expected}</span>
                      <span className="font-bold" style={{ color: barColor(dept.rate) }}>{dept.rate}%</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ background: "rgba(13,92,102,0.08)" }}>
                    <motion.div className="h-full rounded-full" style={{ background: barColor(dept.rate) }}
                      initial={{ width: 0 }} animate={{ width: `${dept.rate}%` }} transition={{ duration: 0.8, delay: 0.25 + idx * 0.06 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}
