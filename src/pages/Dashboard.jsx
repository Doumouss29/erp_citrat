import React, { useState, useEffect } from "react";
import RhPageHeader from "@/components/rh/RhPageHeader";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, TrendingUp, TrendingDown, Calendar, FileX, AlertCircle, CheckCircle2, RefreshCw, LayoutDashboard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import MonthlyCalendar from "@/components/dashboard/MonthlyCalendar";
import AlertsNotifications from "@/components/dashboard/AlertsNotifications";
import PerformanceIndicators from "@/components/dashboard/PerformanceIndicators";
import DemographicKPIs from "@/components/reporting/DemographicKPIs";
import { useNavigate, Navigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { canAccessRh } from "@/lib/rhAccess";
import { loadWithRetry, logClientError } from "@/lib/resilientLoad";
import { autoGridStyle } from "@/components/cgesn/StatCard";
import { getMe, getEmployees } from "@/lib/rhSession";

const PAGE = "Dashboard";

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [workLogs, setWorkLogs] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [allTimeEntries, setAllTimeEntries] = useState([]);
  const [allWorkLogs, setAllWorkLogs] = useState([]);
  const [activeMissions, setActiveMissions] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [loadErrors, setLoadErrors] = useState([]);

  useEffect(() => {
    loadData();
  }, []);



  const loadData = async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const user = await getMe();
      setCurrentUser(user);

      const isHR = canAccessRh(user);

      if (isHR) {
        const now = new Date();
        const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");

        // Chargement indépendant + relance : un échec n'efface plus les autres cartes.
        const results = await Promise.all([
          // Arrivées du mois (pointages du jour + Top Ponctualité)
          loadWithRetry(PAGE, "TimeEntry.filter (arrivées du mois)", () =>
            base44.entities.TimeEntry.filter({ date: { $gte: monthStart }, entry_type: "entry" }, "-timestamp", 3000)),
          loadWithRetry(PAGE, "Absence.list", () => base44.entities.Absence.list("-created_date", 100)),
          loadWithRetry(PAGE, "LeaveRequest.list", () => base44.entities.LeaveRequest.list("-created_date", 100)),
          loadWithRetry(PAGE, "Employee.list", () => getEmployees()),
          // Journaux du mois entier (heures supplémentaires)
          loadWithRetry(PAGE, "DailyWorkLog.filter (mois)", () =>
            base44.entities.DailyWorkLog.filter({ date: { $gte: monthStart } }, "-date", 3000)),
          loadWithRetry(PAGE, "ActivityReport.filter (missions en cours)", () =>
            base44.entities.ActivityReport.filter({ mission_status: "en_cours" }, "-start_date", 100)),
        ]);

        const [timeEntries, absencesData, leavesData, employees, workLogsData, activitiesData] = results;
        setAllTimeEntries(timeEntries.data);
        setAbsences(absencesData.data);
        setLeaves(leavesData.data);
        setAllEmployees(employees.data);
        setAllWorkLogs(workLogsData.data);
        setActiveMissions(activitiesData.data);
        setLoadErrors(results.filter((r) => !r.ok));
      } else {
        const allEmployees = await getEmployees();
        let employeeData = allEmployees.find(emp => 
          emp.email?.toLowerCase() === user.email?.toLowerCase() ||
          emp.employee_code === user.employee_code
        );

        if (employeeData) {
          setEmployee(employeeData);

          const [logs, absencesData, leavesData] = await Promise.all([
            base44.entities.DailyWorkLog.filter({ employee_id: employeeData.id }, "-date", 20),
            base44.entities.Absence.filter({ employee_id: employeeData.id }, "-created_date", 20),
            base44.entities.LeaveRequest.filter({ employee_id: employeeData.id }, "-created_date", 20)
          ]);

          setWorkLogs(logs);
          setAbsences(absencesData);
          setLeaves(leavesData);
        }
      }
    } catch (error) {
      const info = await logClientError(PAGE, "auth.me / chargement", 1, error, 0);
      setLoadErrors([{ ok: false, request: "auth.me / chargement", ...info }]);
    }

    if (isAutoRefresh) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  };

  const refreshPendingRequests = async () => {
    setRefreshing(true);
    try {
      const [absencesData, leavesData] = await Promise.all([
        base44.entities.Absence.list("-created_date", 50),
        base44.entities.LeaveRequest.list("-created_date", 50)
      ]);
      setAbsences(absencesData);
      setLeaves(leavesData);
    } catch (error) {
      console.error("Error refreshing requests:", error);
    }
    setRefreshing(false);
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

  const isHR = canAccessRh(currentUser);

  // Les agents ont leur propre tableau de bord (DashboardAgent).
  if (currentUser && !isHR) {
    return <Navigate to={createPageUrl("DashboardAgent")} replace />;
  }

  if (!isHR && !employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Profil Employé Non Trouvé</h2>
            <p className="text-slate-600 mb-4">
              Aucun profil employé associé à votre compte. Contactez le service RH pour créer votre profil employé avec l'email suivant :
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

  const cumulativeBalance = workLogs.length > 0 ? workLogs[0].cumulative_balance : 0;
  const todayLog = workLogs.find(log => log.date === format(new Date(), "yyyy-MM-dd"));
  const pendingAbsences = absences.filter(a => a.status === "pending").length;
  const pendingLeaves = leaves.filter(l => l.status?.startsWith("pending") || l.status === "pending").length;

  const stats = isHR ? {
    todayEntries: allTimeEntries.filter(e => e.date === new Date().toISOString().split('T')[0] && e.entry_type === 'entry').length,
    pendingAbsences: absences.filter(a => a.status?.startsWith("pending") || a.status === "pending").length,
    pendingLeaves: leaves.filter(l => l.status?.startsWith("pending") || l.status === "pending").length,
    activeEmployees: allEmployees.filter(e => {
      // Exclure les comptes bureaux du décompte
      const officeEmails = [
        'abidjan.cgesn@gmail.com',
        'moussneko@gmail.com',
        'yakro.cgesn@gmail.com',
        'bouafle.cgesn@gmail.com',
        'sinfra.cgesn@gmail.com',
        'daloa.cgesn@gmail.com',
        'issia.cgesn@gmail.com'
      ];
      const isOfficeAccount = e.email && officeEmails.includes(e.email.toLowerCase());
      return e.is_active && !isOfficeAccount && e.contract_type !== "Prestation";
    }).length
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-2 sm:p-4 lg:p-6 xl:p-8">
      <div className="max-w-7xl mx-auto">
        <RhPageHeader icon={LayoutDashboard} eyebrow={isHR ? "Espace RH" : "Mon espace"}
          title={isHR ? "Tableau de bord RH" : "Mon Tableau de Bord"}
          subtitle={isHR ? "Présence du jour, demandes à traiter et statistiques du personnel" : undefined} />

        {isHR ? (
          <>
            {loadErrors.length > 0 && (
              <Alert className="mb-4 bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Certaines données n'ont pas pu être chargées : les chiffres concernés peuvent être à 0.</p>
                      <ul className="text-xs mt-1 space-y-0.5">
                        {loadErrors.map((e) => (
                          <li key={e.request}>• {e.request} — {e.status ? `HTTP ${e.status}` : "pas de réponse (réseau/délai)"} : {e.message}</li>
                        ))}
                      </ul>
                    </div>
                    <Button size="sm" variant="outline" disabled={refreshing} onClick={() => loadData(true)} className="border-red-300 text-red-700 shrink-0">
                      <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                      Réessayer
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
              <TabsList className="bg-slate-100 p-0 rounded-xl w-full grid grid-cols-3 gap-0 h-auto">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600 rounded-lg m-1 px-2 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-sm font-semibold transition-all"
                >
                  <span className="sm:hidden">Synthèse</span><span className="hidden sm:inline">Vue d'ensemble</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="calendar" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600 rounded-lg m-1 px-2 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-sm font-semibold transition-all"
                >
                  <span className="sm:hidden">Absences</span><span className="hidden sm:inline">Absences & Congés</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="orgchart" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600 rounded-lg m-1 px-2 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-sm font-semibold transition-all"
                >
                  <span className="sm:hidden">Stats</span><span className="hidden sm:inline">Statistiques</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 sm:space-y-6 lg:space-y-8">
                {/* Vue d'ensemble : présence du jour, demandes à traiter, effectifs, ponctualité */}
                <PerformanceIndicators 
                  timeEntries={allTimeEntries} 
                  workLogs={allWorkLogs}
                  employees={allEmployees}
                  activeMissions={activeMissions}
                  absences={absences}
                  leaves={leaves}
                  todayEntries={stats.todayEntries}
                  pendingAbsences={stats.pendingAbsences}
                  pendingLeaves={stats.pendingLeaves}
                  activeEmployees={stats.activeEmployees}
                  onNavigate={(page) => navigate(createPageUrl(page))}
                />

                {/* Alertes & Notifications */}
                <AlertsNotifications 
                  absences={absences}
                  leaves={leaves}
                  employees={allEmployees}
                />


              </TabsContent>

              <TabsContent value="calendar" className="space-y-6">
                <MonthlyCalendar 
                  absences={absences}
                  leaves={leaves}
                />
              </TabsContent>

              <TabsContent value="orgchart" className="space-y-8">
                <DemographicKPIs employees={allEmployees} />
              </TabsContent>
              </Tabs>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:gap-6 mb-6 sm:mb-8" style={autoGridStyle(220)}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Clock className="w-10 h-10 text-blue-600" />
                      <Badge className="bg-blue-600 text-white">Aujourd'hui</Badge>
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mb-1">Heures Travaillées</p>
                    <p className="text-3xl font-bold text-blue-900">
                      {todayLog ? `${todayLog.hours_worked}h` : '0h'}
                    </p>
                    {todayLog && (
                      <p className="text-sm text-slate-600 mt-2">
                        {todayLog.entry_time} → {todayLog.exit_time}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className={`shadow-xl border-0 ${
                  cumulativeBalance >= 0 
                    ? 'bg-gradient-to-br from-green-50 to-green-100' 
                    : 'bg-gradient-to-br from-red-50 to-red-100'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      {cumulativeBalance >= 0 ? (
                        <TrendingUp className="w-10 h-10 text-green-600" />
                      ) : (
                        <TrendingDown className="w-10 h-10 text-red-600" />
                      )}
                      <Badge className={cumulativeBalance >= 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                        Cumul
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mb-1">Balance Totale</p>
                    <p className={`text-3xl font-bold ${cumulativeBalance >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                      {cumulativeBalance >= 0 ? '+' : '-'}{Math.abs(cumulativeBalance)}h
                    </p>
                    <p className="text-sm text-slate-600 mt-2">
                      {cumulativeBalance >= 0 ? 'Heures en avance' : 'Heures à rattraper'}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="shadow-xl border-0 bg-gradient-to-br from-orange-50 to-orange-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <FileX className="w-10 h-10 text-orange-600" />
                      <Badge className="bg-orange-600 text-white">En attente</Badge>
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mb-1">Absences</p>
                    <p className="text-3xl font-bold text-orange-900">{pendingAbsences}</p>
                    <p className="text-sm text-slate-600 mt-2">Demandes en cours</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-purple-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Calendar className="w-10 h-10 text-purple-600" />
                      <Badge className="bg-purple-600 text-white">Solde</Badge>
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mb-1">Congés Restants</p>
                    <p className="text-3xl font-bold text-purple-900">{(employee?.remaining_year_days || 0) + (employee?.remaining_december_days || 0)}</p>
                    <p className="text-sm text-slate-600 mt-2">{employee?.remaining_year_days || 0}j année + {employee?.remaining_december_days || 0}j déc. • {pendingLeaves} en cours</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {workLogs.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-8">
                <Card className="shadow-2xl border-0 bg-white">
                  <CardHeader className="border-b border-slate-100 p-6">
                    <CardTitle className="text-2xl font-bold text-slate-900">
                      Suivi des Heures de Travail
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-2">Base: 8h/jour • Plage: 06h-22h</p>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {workLogs.slice(0, 10).map((log) => (
                        <div key={log.id} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-bold text-lg text-slate-900">{log.employee_name}</p>
                              <p className="text-sm text-slate-500">
                                {format(new Date(log.date), "EEEE dd MMMM yyyy", { locale: fr })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-600">
                                {log.entry_time} → {log.exit_time}
                              </p>
                              <p className="font-bold text-lg text-slate-900 mt-1">
                                {log.hours_worked}h travaillées
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                              log.balance >= 0 ? "bg-green-100" : "bg-red-100"
                            }`}>
                              {log.balance >= 0 ? (
                                <TrendingUp className="w-5 h-5 text-green-600" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-red-600" />
                              )}
                              <span className={`font-bold text-lg ${
                                log.balance >= 0 ? "text-green-600" : "text-red-600"
                              }`}>
                                {log.balance >= 0 ? '+' : '-'}{Math.abs(log.balance)}h
                              </span>
                            </div>
                            
                            <div className="h-8 w-px bg-slate-300" />
                            
                            <div>
                              <span className="text-sm text-slate-600">Cumul: </span>
                              <span className={`font-bold text-lg ${
                                log.cumulative_balance >= 0 ? "text-green-600" : "text-red-600"
                              }`}>
                                {log.cumulative_balance >= 0 ? '+' : '-'}{Math.abs(log.cumulative_balance)}h
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {(absences.length > 0 || leaves.length > 0) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
                  <CardHeader className="border-b border-slate-100 p-6">
                    <CardTitle className="text-xl font-bold text-slate-900">
                      Mes Demandes Récentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {absences.slice(0, 5).map((absence) => (
                        <div key={absence.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-200">
                          <div className="flex items-center gap-3">
                            <FileX className="w-8 h-8 text-orange-600" />
                            <div>
                              <p className="font-bold text-slate-900">Absence - {absence.absence_type}</p>
                              <p className="text-sm text-slate-600">
                                Du {format(new Date(absence.start_date), "dd/MM/yyyy")} au {format(new Date(absence.end_date), "dd/MM/yyyy")}
                              </p>
                            </div>
                          </div>
                          <Badge className={`${
                            absence.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                            absence.status === "approved" ? "bg-green-100 text-green-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {absence.status === "pending" && <AlertCircle className="w-3 h-3 mr-1" />}
                            {absence.status === "approved" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {absence.status === "pending" ? "En attente" : absence.status === "approved" ? "Approuvée" : "Refusée"}
                          </Badge>
                        </div>
                      ))}
                      {leaves.slice(0, 5).map((leave) => (
                        <div key={leave.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-200">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-purple-600" />
                            <div>
                              <p className="font-bold text-slate-900">Congé - {leave.leave_type}</p>
                              <p className="text-sm text-slate-600">
                                Du {format(new Date(leave.start_date), "dd/MM/yyyy")} au {format(new Date(leave.end_date), "dd/MM/yyyy")} ({leave.total_days} jours)
                              </p>
                            </div>
                          </div>
                          <Badge className={`${
                            (leave.status?.startsWith("pending") || leave.status === "pending") ? "bg-yellow-100 text-yellow-700" :
                            leave.status === "approved" ? "bg-green-100 text-green-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {(leave.status?.startsWith("pending") || leave.status === "pending") && <AlertCircle className="w-3 h-3 mr-1" />}
                            {leave.status === "approved" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {leave.status === "pending_level1" ? "⏳ Niveau 1" : 
                             leave.status === "pending_level2" ? "⏳ Niveau 2 (RH)" :
                             leave.status === "pending_level3" ? "⏳ Niveau 3 (DG)" :
                             leave.status === "approved" ? "Approuvé" : 
                             leave.status === "pending" ? "En attente" : "Refusé"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}