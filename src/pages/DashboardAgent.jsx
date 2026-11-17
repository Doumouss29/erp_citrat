import React, { useState, useEffect } from "react";
import RhPageHeader from "@/components/rh/RhPageHeader";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown, FileX, Calendar } from "lucide-react";

import { Navigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { usePullToRefresh, PullToRefreshIndicator } from "@/components/mobile/PullToRefresh";
import ExternalHome from "@/components/rh/ExternalHome";
import { isExternalUser } from "@/lib/externalAccess";
import { getMe, getEmployees } from "@/lib/rhSession";

export default function DashboardAgentPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [workLogs, setWorkLogs] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [todayEntries, setTodayEntries] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allEmployees, setAllEmployees] = useState([]);
  const { containerRef, isRefreshing } = usePullToRefresh(() => loadData({ fresh: true }));

  useEffect(() => {
    loadData();
  }, []);



  const loadData = async (options) => {
    setLoading(true);
    try {
      // Utilisateur et annuaire partagés avec le menu (déjà chargés la plupart du temps)
      const [user, allEmployees] = await Promise.all([getMe(options), getEmployees(options)]);
      setCurrentUser(user);

      setAllEmployees(allEmployees);
      let employeeData = allEmployees.find(emp => 
        emp.email?.toLowerCase() === user.email?.toLowerCase() ||
        emp.employee_code === user.employee_code
      );

      if (employeeData) {
        setEmployee(employeeData);
        // Un externe n'a ni pointage ni solde : son accueil charge ses propres données.
        if (isExternalUser(user)) return;

        // Les 5 requêtes (petites, filtrées sur l'agent) partent en même temps ;
        // chacune reste indépendante : un échec n'efface pas les autres cartes.
        const [logsR, absencesR, leavesR, todayR, recentR] = await Promise.allSettled([
          base44.entities.DailyWorkLog.filter({ employee_code: employeeData.employee_code }, "-date", 30),
          base44.entities.Absence.filter({ employee_email: user.email }, "-created_date", 15),
          base44.entities.LeaveRequest.filter({ employee_email: user.email }, "-created_date", 15),
          base44.entities.TimeEntry.filter({ employee_code: employeeData.employee_code, date: format(new Date(), "yyyy-MM-dd") }, "-timestamp", 5),
          base44.entities.TimeEntry.filter({ employee_code: employeeData.employee_code }, "-timestamp", 8),
        ]);
        const value = (r, label) => {
          if (r.status === "fulfilled") return r.value || [];
          console.error(`Erreur ${label}:`, r.reason);
          return [];
        };
        setWorkLogs(processWorkLogs(value(logsR, "logs")));
        setAbsences(value(absencesR, "absences"));
        setLeaves(value(leavesR, "congés"));
        setTodayEntries(value(todayR, "pointages du jour"));
        setRecentEntries(value(recentR, "historique"));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processWorkLogs = (workLogsData) => {
    const recalculatedLogs = workLogsData.map(log => {
      if (log.entry_time && log.exit_time && log.entry_time !== '-' && log.exit_time !== '-') {
        const [entryH, entryM] = log.entry_time.split(':').map(Number);
        const [exitH, exitM] = log.exit_time.split(':').map(Number);
        const entryMinutes = entryH * 60 + entryM;
        const exitMinutes = exitH * 60 + exitM;
        const hoursWorked = (exitMinutes - entryMinutes) / 60;
        const balance = hoursWorked - 8;
        
        return {
          ...log,
          hours_worked: hoursWorked,
          balance: balance
        };
      }
      return log;
    });

    let cumulativeBalance = 0;
    return recalculatedLogs
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(log => {
        cumulativeBalance += (log.balance || 0);
        return {
          ...log,
          cumulative_balance: cumulativeBalance
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (isExternalUser(currentUser)) {
    return <ExternalHome user={currentUser} employee={employee} />;
  }

  // Un administrateur sans fiche employé (ex. super administrateur) n'a pas de tableau de bord
  // personnel : il est envoyé sur le Dashboard RH au lieu du message « aucun profil ».
  if (!employee && currentUser?.role === "admin") {
    return <Navigate to={createPageUrl("Dashboard")} replace />;
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600 mb-4">
              Aucun profil employé associé à votre compte. Contactez le service RH.
            </p>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-sm font-semibold text-slate-700">Email du compte:</p>
              <p className="text-blue-700 font-mono">{currentUser?.email}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const departmentColors = {
    "direction_generale": "from-purple-500 to-purple-600",
    "administratif_financier": "from-blue-500 to-blue-600",
    "grand_projet_developpement": "from-green-500 to-green-600",
    "bureau_abidjan": "from-indigo-500 to-indigo-600",
    "bureau_yamoussoukro": "from-cyan-500 to-cyan-600",
    "bureau_daloa": "from-teal-500 to-teal-600",
    "bureau_bouafle": "from-emerald-500 to-emerald-600",
    "bureau_sinfra": "from-amber-500 to-amber-600",
    "bureau_issia": "from-orange-500 to-orange-600"
  };

  const employeeColor = departmentColors[employee.department] || "from-slate-500 to-slate-600";

  const cumulativeBalance = workLogs.length > 0 ? workLogs[0].cumulative_balance || 0 : 0;
  const todayLog = workLogs.find(log => log.date === format(new Date(), "yyyy-MM-dd"));
  const pendingAbsences = absences.filter(a => a.status?.startsWith("pending")).length;
  const pendingLeaves = leaves.filter(l => l.status?.startsWith("pending")).length;

  // Calcul du cumul total des heures travaillées et jours valides
  const validWorkLogs = workLogs.filter(log => 
    log.entry_time && log.exit_time && 
    log.entry_time !== '-' && log.exit_time !== '-'
  );
  
  const totalHoursWorked = validWorkLogs.reduce((total, log) => {
    return total + (log.hours_worked || 0);
  }, 0);

  // Fonction pour formater les heures en heures:minutes
  const formatHoursMinutes = (hours) => {
    const totalMinutes = Math.round(Math.abs(hours * 60));
    if (totalMinutes < 60) {
      return `${totalMinutes}min`;
    }
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${h}h`;
  };

  // Utiliser directement les données de l'employé synchronisées
  const totalAbsenceDays = employee?.absence_days_used || 0;

  const approvedLeaves = leaves.filter(l => l.status === "approved");
  const totalLeaveDays = approvedLeaves.reduce((total, leave) => {
    return total + (leave.total_days || 0);
  }, 0);
  
  // Total des demandes en cours (absences + congés)
  const totalPendingRequests = pendingAbsences + pendingLeaves;

  // Calculer les congés restants réels
  const totalRemainingDays = (employee?.remaining_year_days || 0) + (employee?.remaining_december_days || 0);

  // Calculer solde absence (utiliser totalAbsenceDays calculé localement)
  const absenceDaysRemaining = Math.max(0, 10 - totalAbsenceDays);

  const stats = [
    {
      title: "Heures Travaillées",
      value: todayLog?.hours_worked ? formatHoursMinutes(todayLog.hours_worked) : '0h',
      subtitle: todayLog ? `${todayLog.entry_time} → ${todayLog.exit_time || '...'}` : 'Aucun pointage aujourd\'hui',
      icon: Clock,
      bgColor: "from-[#137f8c] to-[#0C3D85]",
      badge: "Aujourd'hui"
    },
    {
      title: "Cumul Heures Travaillées",
      value: formatHoursMinutes(totalHoursWorked),
      subtitle: `${validWorkLogs.length} jour(s) travaillé(s)`,
      icon: TrendingUp,
      bgColor: "from-[#c9a24f] to-[#a8873f]",
      badge: "Total"
    },
    {
      title: "Balance Totale",
      value: `${cumulativeBalance >= 0 ? '+' : '-'}${formatHoursMinutes(cumulativeBalance)}`,
      subtitle: cumulativeBalance >= 0 ? 'Heures en avance' : 'Heures à rattraper',
      icon: cumulativeBalance >= 0 ? TrendingUp : TrendingDown,
      bgColor: cumulativeBalance >= 0 ? "from-green-500 to-green-600" : "from-red-500 to-red-600",
      badge: "Cumul"
    },
    {
      title: "Demandes en Cours",
      value: totalPendingRequests,
      subtitle: `${pendingAbsences} absence(s), ${pendingLeaves} congé(s)`,
      icon: FileX,
      bgColor: "from-orange-500 to-orange-600",
      badge: "En attente"
    },
    {
      title: "Solde Absence",
      value: `${absenceDaysRemaining}j`,
      subtitle: `${totalAbsenceDays} jour(s) utilisé(s) sur 10`,
      icon: FileX,
      bgColor: "from-slate-500 to-slate-700",
      badge: "Restant"
    },
    {
      title: "Solde Congés",
      value: `${totalRemainingDays}j`,
      subtitle: `Jan-Nov: ${employee?.remaining_year_days || 0}j | Déc: ${employee?.remaining_december_days || 0}j`,
      icon: Calendar,
      bgColor: "from-rose-500 to-rose-600",
      badge: "Restant"
    },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-3 md:p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {isRefreshing && <PullToRefreshIndicator isRefreshing={true} pullDistance={100} />}
        <RhPageHeader eyebrow="Mon espace" title="Mon tableau de bord"
          subtitle={`Bienvenue ${employee?.first_name || ""} ${employee?.last_name || ""}`.trim()}
          avatar={employee?.photo_url ? (
            <img
              src={employee.photo_url}
              alt={`${employee.first_name} ${employee.last_name}`}
              className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover ring-2 ring-[#d4af6a] shadow-lg flex-none"
            />
          ) : (
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#0C3D85] ring-2 ring-[#d4af6a] flex items-center justify-center text-[#d4af6a] text-2xl font-bold flex-none">
              {employee?.first_name?.[0]?.toUpperCase() || employee?.last_name?.[0]?.toUpperCase() || 'U'}
            </div>
          )} />

        {/* 2 tuiles par ligne sur mobile, 3 sur tablette et ordinateur */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="min-w-0"
              >
                <Card className="h-full shadow-sm border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0 h-full flex flex-col">
                    <div className={`bg-gradient-to-r ${stat.bgColor} px-3 py-2 sm:p-3 flex items-center justify-between gap-2`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white flex-none" />
                      <span className="bg-white/20 text-white text-xs font-semibold rounded-full px-2 py-0.5 truncate">{stat.badge}</span>
                    </div>
                    <div className="p-3 sm:p-4 flex-1 flex flex-col">
                      <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-snug line-clamp-2">{stat.title}</p>
                      <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 leading-none tabular-nums">{stat.value}</p>
                      <p className="mt-auto pt-2 text-xs text-slate-500 leading-snug line-clamp-2">{stat.subtitle}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {todayEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <Card className="shadow-lg border-0 bg-white">
              <CardContent className="p-4">
                <h3 className="text-base font-bold text-slate-900 mb-3">Pointages du jour</h3>
                <div className="flex flex-wrap gap-2">
                  {todayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-sm ${
                        entry.entry_type === 'entry'
                          ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                          : 'bg-slate-700 text-white border-2 border-slate-900'
                      }`}
                    >
                      {({ entry: '→ Arrivée', break_start: '☕ Pause', break_end: '↺ Reprise', exit: '← Départ' })[entry.entry_type] || '← Départ'} • {entry.time}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {recentEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg font-bold text-slate-900">Historique des Pointages</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(() => {
                    // Grouper les pointages par date
                    const groupedByDate = recentEntries.reduce((acc, entry) => {
                      const date = entry.date;
                      if (!acc[date]) {
                        acc[date] = [];
                      }
                      acc[date].push(entry);
                      return acc;
                    }, {});

                    // Trier par date décroissante et limiter aux 3 dernières journées
                    const sortedDates = Object.keys(groupedByDate)
                      .sort((a, b) => b.localeCompare(a))
                      .slice(0, 3);

                    return sortedDates.map((date) => {
                      const entries = groupedByDate[date].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
                      return (
                        <div key={date} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-slate-600" />
                            <p className="text-sm font-medium text-slate-700">
                              {format(new Date(date), "dd/MM/yyyy", { locale: fr })}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {entries.map((entry) => (
                              <div key={entry.id} className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                <Badge className={`${
                                  entry.entry_type === 'entry' ? 'bg-slate-900' : 'bg-slate-600'
                                } text-white text-xs`}>
                                  {({ entry: 'Entrée', break_start: 'Pause', break_end: 'Reprise', exit: 'Sortie' })[entry.entry_type] || 'Sortie'}
                                </Badge>
                                <span className="font-bold text-slate-900 text-sm">{entry.time}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}



      </div>
    </div>
  );
}