import React, { useState, useEffect } from "react";
import RhPageHeader from "@/components/rh/RhPageHeader";
import { sendMail } from "@/components/utils/emailTemplate";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Download, BarChart3, ShieldAlert, Lock, Users, Clock, Calendar, FileX, 
  RefreshCw, CheckCircle, AlertTriangle, Database, Filter, Search, X, Send, Bell,
  PartyPopper, ChevronDown, ChevronUp, SlidersHorizontal, CalendarDays, Briefcase
} from "lucide-react";
import { format } from "date-fns";
import { syncAllData, verifyDataIntegrity } from "@/components/utils/dataSync";
import { motion } from "framer-motion";
import EvenementsTab from "@/components/reporting/EvenementsTab";
import { canAccessRh } from "@/lib/rhAccess";
import { loadWorkflowValidators, getLevel2Validator, getLevel3Validator } from "@/lib/workflowValidators";
import { getMe } from "@/lib/rhSession";


const REPORTING_TTL = 2 * 60 * 1000;
let reportingCache = null; // { token, at, data }
const sessionToken = () => {
  try { return localStorage.getItem("base44_access_token") || ""; } catch { return ""; }
};

export default function ReportingSyncPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [data, setData] = useState({ absences: [], employees: [], leaves: [], workLogs: [], timeEntries: [], activities: [] });
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    department: 'all',
    employeeId: 'all'
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncResults, setSyncResults] = useState(null);
  const [verifyResults, setVerifyResults] = useState(null);
  const [activeTab, setActiveTab] = useState("reporting");
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState('all');
  const [employeeMonthFilter, setEmployeeMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [reportingStartDate, setReportingStartDate] = useState("");
  const [reportingEndDate, setReportingEndDate] = useState("");
  const [reportingSearchTerm, setReportingSearchTerm] = useState("");
  const [relaunching, setRelaunching] = useState(false);
  const [relanceResults, setRelanceResults] = useState(null);
  const [relancingPointage, setRelancingPointage] = useState(false);
  const [pointageResults, setPointageResults] = useState(null);
  const [relancingInterns, setRelancingInterns] = useState(false);
  const [internsResults, setInternsResults] = useState(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [validators, setValidators] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    loadWorkflowValidators().then(setValidators);
  }, []);

  // Chargement à l'ouverture seulement : les filtres (département, employé, période) sont
  // appliqués en mémoire, ils ne doivent pas relancer le téléchargement de toutes les tables.
  useEffect(() => {
    if (canAccessRh(currentUser)) {
      loadData();
    }
  }, [currentUser]);

  const checkAuth = async () => {
    try {
      const user = await getMe();
      setCurrentUser(user);
      if (!canAccessRh(user)) setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  // Charge toutes les fiches d'une entité, par pages de 5 000 (sinon l'export était tronqué à 5 000)
  const listAll = async (entity, sort) => {
    const PAGE = 5000;
    let all = [];
    for (let skip = 0; skip < 100000; skip += PAGE) {
      const batch = await entity.list(sort, PAGE, skip);
      all = all.concat(batch || []);
      if (!batch || batch.length < PAGE) break;
    }
    return all;
  };

  const loadData = async ({ fresh = false } = {}) => {
    // Données gardées 2 min entre deux visites de la page (même session)
    if (!fresh && reportingCache && reportingCache.token === sessionToken() && Date.now() - reportingCache.at < REPORTING_TTL) {
      setData(reportingCache.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [absences, employees, leaves, workLogs, timeEntries, activities] = await Promise.all([
      listAll(base44.entities.Absence, "-created_date"),
      listAll(base44.entities.Employee),
      listAll(base44.entities.LeaveRequest, "-created_date"),
      listAll(base44.entities.DailyWorkLog, "-date"),
      listAll(base44.entities.TimeEntry, "-timestamp"),
      listAll(base44.entities.ActivityReport, "-start_date")
    ]);
    const loaded = { absences, employees, leaves, workLogs, timeEntries, activities };
    reportingCache = { token: sessionToken(), at: Date.now(), data: loaded };
    setData(loaded);
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResults(null);
    try {
      const results = await syncAllData();
      setSyncResults(results);
      await loadData({ fresh: true });
    } catch (error) {
      console.error("Erreur synchronisation:", error);
    }
    setSyncing(false);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResults(null);
    try {
      const issues = await verifyDataIntegrity();
      setVerifyResults(issues);
    } catch (error) {
      console.error("Erreur vérification:", error);
    }
    setVerifying(false);
  };

  const relaunchAllNotifications = async () => {
    if (!window.confirm("Voulez-vous relancer les notifications pour TOUTES les demandes en attente ?")) return;
    
    setRelaunching(true);
    setRelanceResults(null);
    
    try {
      let countLeaves = 0;
      let countAbsences = 0;
      let countActivities = 0;

      // Congés en attente
      const pendingLeaves = data.leaves.filter(l => l.status?.startsWith("pending"));
      for (const leave of pendingLeaves) {
        const level = leave.status === "pending_level1" ? 1 : leave.status === "pending_level2" ? 2 : 3;
        const validatorEmail = level === 1 ? leave.level1_approver_email : level === 2 ? getLevel2Validator(validators)?.email : getLevel3Validator(validators)?.email;
        
        if (validatorEmail) {
          try {
            await base44.entities.Notification.create({
              user_email: validatorEmail,
              type: "new_leave_request",
              title: `🔔 Rappel - Demande de congé à valider (Niveau ${level})`,
              message: `${leave.employee_name} - Congé du ${format(new Date(leave.start_date), "dd/MM/yyyy")} au ${format(new Date(leave.end_date), "dd/MM/yyyy")} (${leave.total_days}j). En attente de votre validation.`,
              related_id: leave.id
            });
            countLeaves++;
          } catch (e) {
            console.log("Erreur notification:", e);
          }
        }
      }

      // Absences en attente
      const pendingAbsences = data.absences.filter(a => a.status?.startsWith("pending"));
      for (const absence of pendingAbsences) {
        const level = absence.status === "pending_level1" ? 1 : absence.status === "pending_level2" ? 2 : 3;
        const validatorEmail = level === 1 ? absence.level1_approver_email : level === 2 ? getLevel2Validator(validators)?.email : getLevel3Validator(validators)?.email;
        
        if (validatorEmail) {
          try {
            await base44.entities.Notification.create({
              user_email: validatorEmail,
              type: "new_absence_request",
              title: `🔔 Rappel - Demande d'absence à valider (Niveau ${level})`,
              message: `${absence.employee_name} - Absence du ${format(new Date(absence.start_date), "dd/MM/yyyy")} au ${format(new Date(absence.end_date), "dd/MM/yyyy")} (${absence.total_days}j). En attente de votre validation.`,
              related_id: absence.id
            });
            countAbsences++;
          } catch (e) {
            console.log("Erreur notification:", e);
          }
        }
      }

      // Activités en attente
      const pendingActivities = data.activities.filter(a => a.status?.startsWith("pending"));
      for (const activity of pendingActivities) {
        const level = activity.status === "pending_level1" ? 1 : 2;
        const validatorEmail = level === 1 ? activity.level1_approver_email : getLevel2Validator(validators)?.email;
        
        if (validatorEmail) {
          try {
            await base44.entities.Notification.create({
              user_email: validatorEmail,
              type: "new_activity_request",
              title: `🔔 Rappel - Déclaration d'activité à valider (Niveau ${level})`,
              message: `${activity.employee_name} - Activité du ${format(new Date(activity.start_date), "dd/MM/yyyy")} au ${format(new Date(activity.end_date), "dd/MM/yyyy")}. En attente de votre validation.`,
              related_id: activity.id
            });
            countActivities++;
          } catch (e) {
            console.log("Erreur notification:", e);
          }
        }
      }

      const totalCount = countLeaves + countAbsences + countActivities;
      setRelanceResults({
        total: totalCount,
        leaves: countLeaves,
        absences: countAbsences,
        activities: countActivities,
        summary: `${totalCount} notification(s) envoyée(s) avec succès`
      });
    } catch (error) {
      console.error("Erreur relance notifications:", error);
      alert("Erreur lors de la relance des notifications.");
    }
    setRelaunching(false);
  };

  const relancerPointageArrivee = async () => {
    if (!window.confirm("Relancer les employés qui n'ont pas pointé à l'arrivée après 9h ?")) return;
    
    setRelancingPointage(true);
    setPointageResults(null);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const now = new Date();
      const currentHour = now.getHours();
      
      // Vérifier qu'il est au moins 9h
      if (currentHour < 9) {
        alert("⚠️ Cette relance est prévue pour après 9h du matin.");
        setRelancingPointage(false);
        return;
      }

      // Employés actifs qui doivent pointer
      const employeesRequiringAttendance = data.employees.filter(e => 
        e.is_active && e.attendance_status === "Actif - Pointage requis"
      );

      // Pointages d'entrée du jour
      const todayEntries = data.timeEntries.filter(t => 
        t.date === today && t.entry_type === "entry"
      );
      const employeesWhoClocked = new Set(todayEntries.map(t => t.employee_id));

      // Employés qui n'ont PAS encore pointé
      const employeesNotClocked = employeesRequiringAttendance.filter(e => 
        !employeesWhoClocked.has(e.id)
      );

      let count = 0;
      for (const emp of employeesNotClocked) {
        if (emp.email) {
          try {
            await base44.entities.Notification.create({
              user_email: emp.email,
              type: "general",
              title: "⏰ Rappel de pointage à l'arrivée",
              message: `Bonjour ${emp.first_name}, il est ${format(now, 'HH:mm')}. N'oubliez pas d'effectuer votre pointage d'arrivée si vous êtes présent(e).`
            });

            // Email
            setTimeout(() => {
              sendMail({
                to: emp.email,
                subject: "⏰ Rappel de pointage - Arrivée",
                body: `Bonjour ${emp.first_name} ${emp.last_name},\n\nNous remarquons que vous n'avez pas encore effectué votre pointage d'arrivée aujourd'hui (${format(now, 'dd/MM/yyyy à HH:mm')}).\n\nSi vous êtes présent(e) au bureau, merci de bien vouloir pointer dès que possible.\n\nCordialement,\nSystème RH - CITRAT`
              }).catch(e => console.log("Email non envoyé:", e));
            }, count * 200);

            count++;
          } catch (e) {
            console.log("Erreur notification:", e);
          }
        }
      }

      setPointageResults({
        type: "arrivee",
        total: count,
        hour: format(now, 'HH:mm'),
        summary: `${count} employé(s) relancé(s) pour pointage d'arrivée`
      });
    } catch (error) {
      console.error("Erreur relance pointage:", error);
      alert("Erreur lors de la relance.");
    }
    setRelancingPointage(false);
  };

  const relancerPointageSortie = async () => {
    if (!window.confirm("Relancer tous les employés pour le pointage de sortie à 16h ?")) return;
    
    setRelancingPointage(true);
    setPointageResults(null);
    
    try {
      const now = new Date();
      
      // Employés actifs qui doivent pointer
      const employeesRequiringAttendance = data.employees.filter(e => 
        e.is_active && e.attendance_status === "Actif - Pointage requis"
      );

      let count = 0;
      for (const emp of employeesRequiringAttendance) {
        if (emp.email) {
          try {
            await base44.entities.Notification.create({
              user_email: emp.email,
              type: "general",
              title: "🔔 Rappel de pointage de sortie",
              message: `Bonjour ${emp.first_name}, pensez à effectuer votre pointage de sortie en fin de journée avant de quitter le bureau.`
            });

            // Email
            setTimeout(() => {
              sendMail({
                to: emp.email,
                subject: "🔔 Rappel de pointage - Sortie",
                body: `Bonjour ${emp.first_name} ${emp.last_name},\n\nCeci est un rappel pour ne pas oublier d'effectuer votre pointage de sortie en fin de journée avant de quitter le bureau.\n\nMerci de votre coopération.\n\nCordialement,\nSystème RH - CITRAT`
              }).catch(e => console.log("Email non envoyé:", e));
            }, count * 200);

            count++;
          } catch (e) {
            console.log("Erreur notification:", e);
          }
        }
      }

      setPointageResults({
        type: "sortie",
        total: count,
        hour: format(now, 'HH:mm'),
        summary: `${count} employé(s) relancé(s) pour pointage de sortie`
      });
    } catch (error) {
      console.error("Erreur relance pointage:", error);
      alert("Erreur lors de la relance.");
    }
    setRelancingPointage(false);
  };

  const relancerContratsExpirants = async () => {
    if (!window.confirm("Envoyer des emails aux stagiaires dont les contrats expirent dans 30 jours ou sont déjà expirés ?")) return;
    
    setRelancingInterns(true);
    setInternsResults(null);
    
    try {
      // Stagiaires dont le contrat expire dans 30 jours ou est déjà expiré
      const expiringInterns = data.employees.filter(e => {
        if (!e.internship_type || !e.internship_end_date) return false;
        const daysRemaining = Math.ceil((new Date(e.internship_end_date) - new Date()) / (1000 * 60 * 60 * 24));
        return daysRemaining <= 30;
      });

      let count = 0;
      for (const intern of expiringInterns) {
        if (intern.email) {
          try {
            const daysRemaining = Math.ceil((new Date(intern.internship_end_date) - new Date()) / (1000 * 60 * 60 * 24));
            const isExpired = daysRemaining <= 0;
            
            // Messages différents selon si expiré ou va expirer
            const notifTitle = isExpired 
              ? "🔴 Contrat de stage expiré - Action urgente requise"
              : "📋 Fin de contrat de stage - Action requise";
            
            const notifMessage = isExpired
              ? `Bonjour ${intern.first_name}, votre contrat de stage a expiré le ${format(new Date(intern.internship_end_date), 'dd/MM/yyyy')}. Merci de contacter URGEMMENT M. ABOUBACAR SIDIBE pour régulariser votre situation.`
              : `Bonjour ${intern.first_name}, votre contrat de stage expire le ${format(new Date(intern.internship_end_date), 'dd/MM/yyyy')}. Merci de contacter M. ABOUBACAR SIDIBE pour la procédure administrative.`;
            
            const emailSubject = isExpired
              ? "🔴 Contrat de stage expiré - Action urgente requise"
              : "📋 Fin de contrat de stage - Action requise";
            
            const emailBody = isExpired
              ? `Bonjour ${intern.first_name} ${intern.last_name},\n\nVotre contrat de stage a EXPIRÉ le ${format(new Date(intern.internship_end_date), 'dd/MM/yyyy')}.\n\nIl est URGENT de régulariser votre situation administrative. Nous vous invitons à prendre contact IMMÉDIATEMENT avec le responsable des ressources humaines :\n\n👤 Monsieur ABOUBACAR SIDIBE\n📞 Téléphone : 07 57 92 15 62\n📧 Email : asidibe0021@gmail.com\n\nMerci de votre prompte réaction.\n\nCordialement,\nSystème RH - CITRAT`
              : `Bonjour ${intern.first_name} ${intern.last_name},\n\nVotre contrat de stage arrive à échéance le ${format(new Date(intern.internship_end_date), 'dd/MM/yyyy')}.\n\nAfin de déclencher la procédure administrative nécessaire, nous vous invitons à prendre contact avec le responsable des ressources humaines :\n\n👤 Monsieur ABOUBACAR SIDIBE\n📞 Téléphone : 07 57 92 15 62\n📧 Email : asidibe0021@gmail.com\n\nMerci de votre coopération.\n\nCordialement,\nSystème RH - CITRAT`;

            // Notification interne
            await base44.entities.Notification.create({
              user_email: intern.email,
              type: "general",
              title: notifTitle,
              message: notifMessage
            });

            // Email
            setTimeout(() => {
              sendMail({
                to: intern.email,
                subject: emailSubject,
                body: emailBody
              }).catch(e => console.log("Email non envoyé:", e));
            }, count * 200);

            count++;
          } catch (e) {
            console.log("Erreur notification:", e);
          }
        }
      }

      // Lister les stagiaires non notifiés
      const notNotified = expiringInterns.filter(intern => !intern.email);
      
      setInternsResults({
        total: count,
        interns: expiringInterns.length,
        summary: `${count} stagiaire(s) notifié(s) pour renouvellement de contrat`,
        notNotified: notNotified.map(intern => ({
          name: `${intern.first_name} ${intern.last_name}`,
          code: intern.employee_code,
          reason: "Pas d'email"
        }))
      });
    } catch (error) {
      console.error("Erreur relance stagiaires:", error);
      alert("Erreur lors de la relance.");
    }
    setRelancingInterns(false);
  };

  const getFilteredData = () => {
    const { department, employeeId } = filters;
    const startDate = reportingStartDate || filters.startDate;
    const endDate = reportingEndDate || filters.endDate;
    let filteredEmployees = data.employees;

    if (department !== 'all') {
      filteredEmployees = filteredEmployees.filter(e => e.department === department);
    }

    // Filter by search term if provided
    if (reportingSearchTerm.trim()) {
      const searchLower = reportingSearchTerm.toLowerCase();
      filteredEmployees = filteredEmployees.filter(e => {
        const fullName = `${e.last_name} ${e.first_name}`.toLowerCase();
        const code = e.employee_code?.toLowerCase() || "";
        return fullName.includes(searchLower) || code.includes(searchLower);
      });
    }

    if (employeeId !== 'all') {
      filteredEmployees = filteredEmployees.filter(e => e.id === employeeId);
    }

    const employeeIds = filteredEmployees.map(e => e.id);
    const employeeNames = filteredEmployees.map(e => `${e.first_name} ${e.last_name}`.toLowerCase());

    const filterByEmployeeAndDate = (items, dateField = 'start_date') => {
      return items.filter(item => {
        const dateMatch = item[dateField] >= startDate && item[dateField] <= endDate;
        if (department === 'all' && employeeId === 'all') return dateMatch;
        const employeeMatch = employeeIds.includes(item.employee_id) || 
                              employeeNames.includes(item.employee_name?.toLowerCase());
        return dateMatch && employeeMatch;
      });
    };

    const allAbsences = (department === 'all' && employeeId === 'all')
      ? data.absences 
      : data.absences.filter(a => employeeIds.includes(a.employee_id) || employeeNames.includes(a.employee_name?.toLowerCase()));
    
    const allLeaves = (department === 'all' && employeeId === 'all')
      ? data.leaves
      : data.leaves.filter(l => employeeIds.includes(l.employee_id) || employeeNames.includes(l.employee_name?.toLowerCase()));

    const allTimeEntries = (department === 'all' && employeeId === 'all')
      ? data.timeEntries
      : data.timeEntries.filter(t => employeeIds.includes(t.employee_id) || employeeNames.includes(t.employee_name?.toLowerCase()));

    const allWorkLogs = (department === 'all' && employeeId === 'all')
      ? data.workLogs
      : data.workLogs.filter(w => employeeIds.includes(w.employee_id) || employeeNames.includes(w.employee_name?.toLowerCase()));

    const allActivities = (department === 'all' && employeeId === 'all')
      ? data.activities
      : data.activities.filter(a => employeeIds.includes(a.employee_id) || employeeNames.includes(a.employee_name?.toLowerCase()));

    // Période du reporting (si aucune date n'est saisie : tout l'historique)
    const from = reportingStartDate || "";
    const to = reportingEndDate || "";
    const inPeriod = (d) => !!d && (!from || d.slice(0, 10) >= from) && (!to || d.slice(0, 10) <= to);
    const isExpiredIntern = (e) => e.internship_type && e.internship_end_date && new Date(e.internship_end_date) < new Date(new Date().toDateString());

    return {
      employees: filteredEmployees,
      exp: {
        salaries: filteredEmployees.filter(e => e.is_active && !e.internship_type && e.contract_type !== "Prestation"),
        externes: filteredEmployees.filter(e => e.is_active && e.contract_type === "Prestation"),
        stagiaires: filteredEmployees.filter(e => e.is_active && e.internship_type && !isExpiredIntern(e)),
        absences: allAbsences.filter(a => inPeriod(a.start_date)),
        leaves: allLeaves.filter(l => inPeriod(l.start_date)),
        timeEntries: allTimeEntries.filter(t => inPeriod(t.date)),
        workLogs: allWorkLogs.filter(w => inPeriod(w.date)),
        activities: allActivities.filter(a => inPeriod(a.start_date)),
        hasPeriod: !!(from || to),
      },
      absences: filterByEmployeeAndDate(data.absences, 'start_date'),
      leaves: filterByEmployeeAndDate(data.leaves, 'start_date'),
      workLogs: filterByEmployeeAndDate(data.workLogs, 'date'),
      activities: filterByEmployeeAndDate(data.activities, 'start_date'),
      allAbsences,
      allLeaves,
      allTimeEntries,
      allWorkLogs,
      allActivities
    };
  };

  const columnTranslations = {
    employee_code: "Code Employé", employee_name: "Nom Employé", first_name: "Prénom", last_name: "Nom",
    position: "Poste", department: "Département", phone: "Téléphone", email: "Email",
    remaining_year_days: "Jours Année Restants", remaining_december_days: "Jours Décembre Restants",
    absence_days_used: "Jours Absence Utilisés", is_active: "Actif", absence_type: "Type Absence",
    leave_period: "Période Congé", start_date: "Date Début", end_date: "Date Fin",
    total_days: "Nombre de Jours", reason: "Motif", status: "Statut", reviewed_by: "Validé Par",
    review_date: "Date Validation", entry_type: "Type", timestamp: "Horodatage", date: "Date",
    time: "Heure", location: "Lieu", entry_time: "Heure Entrée", exit_time: "Heure Sortie",
    hours_worked: "Heures Travaillées", balance: "Solde", cumulative_balance: "Solde Cumulé",
    total_hours: "Total Heures", work_days: "Jours Travaillés", absence_days: "Jours Absence", leave_days: "Jours Congés",
    work_type: "Type Activité", project_name: "Projet/Mission", description: "Description",
    socio_professional_category: "Catégorie Socio-Professionnelle"
  };

  const restructurePointages = (timeEntries) => {
    const grouped = {};
    timeEntries.forEach(t => {
      const key = `${t.employee_name}_${t.date}`;
      if (!grouped[key]) grouped[key] = { employee_name: t.employee_name, date: t.date, entry_time: '', exit_time: '', location: t.location || '' };
      if (t.entry_type === 'entry') grouped[key].entry_time = t.time || '';
      if (t.entry_type === 'exit') grouped[key].exit_time = t.time || '';
      if (t.location) grouped[key].location = t.location;
    });
    return Object.values(grouped);
  };

  const exportToCSV = (dataArray, filename) => {
    if (!dataArray?.length) return alert("Aucune donnée");

    if (filename === 'pointages') {
      const restructured = restructurePointages(dataArray);
      const pHeaders = ['NOM EMPLOYÉ', 'DATE', 'HEURE ENTRÉE', 'HEURE SORTIE', 'LIEU'];
      const pKeys = ['employee_name', 'date', 'entry_time', 'exit_time', 'location'];
      const csv = [pHeaders.join(','), ...restructured.map(row => pKeys.map(h => `"${String(row[h] || '').toUpperCase()}"`).join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `pointages_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      return;
    }
    
    let headers;
    if (filename === 'employes') headers = ['employee_code', 'first_name', 'last_name', 'position', 'department', 'socio_professional_category'];
    else if (filename === 'absences') headers = ['employee_name', 'absence_type', 'start_date', 'end_date', 'total_days', 'reason', 'status', 'reviewed_by'];
    else if (filename === 'conges') headers = ['employee_name', 'leave_period', 'start_date', 'end_date', 'total_days', 'reason', 'status', 'reviewed_by'];
    else if (filename === 'journaux_travail') headers = ['employee_name', 'date', 'entry_time', 'exit_time', 'hours_worked', 'balance'];
    else if (filename === 'missions_activites') headers = ['employee_name', 'work_type', 'start_date', 'end_date', 'location', 'project_name', 'description', 'status'];
    else headers = Object.keys(dataArray[0]).filter(k => !k.includes('id') && k !== 'updated_date');
    
    const translatedHeaders = headers.map(h => (columnTranslations[h] || h).toUpperCase());
    const csv = [translatedHeaders.join(','), ...dataArray.map(row => headers.map(h => `"${String(row[h] || '').toUpperCase()}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = async (dataArray, filename, title) => {
    if (!dataArray?.length) return alert("Aucune donnée");
    
    const { default: jsPDF } = await import('jspdf');

    // Helper: dessine un tableau simple avec jspdf (remplace jspdf-autotable, incompatible avec jspdf 4.x)
    const autoTable = (doc, opts) => {
      const { columns, body, startY = 35, margin = { top: 35, right: 10, bottom: 10, left: 10 }, styles = {} } = opts;
      const pageWidth = doc.internal.pageSize.getWidth();
      const usableWidth = pageWidth - (margin.left || 10) - (margin.right || 10);
      const colCount = columns.length;
      const colWidth = usableWidth / colCount;
      const fontSize = styles.fontSize || 8;
      const cellPadding = styles.cellPadding || 2;
      doc.setFontSize(fontSize);

      let y = startY;
      const x0 = margin.left || 10;

      // En-têtes
      doc.setFillColor(71, 85, 105);
      doc.rect(x0, y - fontSize - cellPadding, usableWidth, fontSize + cellPadding * 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      columns.forEach((col, i) => {
        doc.text(String(col.header || ''), x0 + i * colWidth + cellPadding, y);
      });
      y += fontSize + cellPadding * 2;

      // Lignes
      doc.setFont(undefined, 'normal');
      body.forEach((row, rowIdx) => {
        if (rowIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(x0, y - fontSize - cellPadding, usableWidth, fontSize + cellPadding * 2, 'F');
        }
        doc.setTextColor(30, 41, 59);
        columns.forEach((col, i) => {
          const val = String(row[col.dataKey] ?? '');
          const truncated = val.length > 40 ? val.substring(0, 37) + '...' : val;
          doc.text(truncated, x0 + i * colWidth + cellPadding, y, { maxWidth: colWidth - cellPadding * 2 });
        });
        y += fontSize + cellPadding * 2;
        if (y > doc.internal.pageSize.getHeight() - (margin.bottom || 10)) {
          doc.addPage();
          y = margin.top || 35;
        }
      });
    };
    
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(title.toUpperCase(), 14, 15);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);
    doc.text(`Nombre d'enregistrements: ${dataArray.length}`, 14, 28);
    
    let headers;
    if (filename === 'pointages') {
      const restructured = restructurePointages(dataArray);
      const pKeys = ['employee_name', 'date', 'entry_time', 'exit_time', 'location'];
      const pHeaders = ['NOM EMPLOYÉ', 'DATE', 'HEURE ENTRÉE', 'HEURE SORTIE', 'LIEU'];
      const columns = pKeys.map((h, i) => ({ header: pHeaders[i], dataKey: h }));
      const rows = restructured.map(row => {
        const r = {};
        pKeys.forEach(k => { r[k] = String(row[k] || '').toUpperCase(); });
        return r;
      });
      doc.text(`Nombre d'enregistrements: ${restructured.length}`, 14, 28);
      autoTable(doc, { startY: 35, columns, body: rows, styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold', halign: 'center' }, bodyStyles: { halign: 'center' }, columnStyles: { 0: { halign: 'left' }, 3: { halign: 'center' }, 4: { halign: 'center' } }, alternateRowStyles: { fillColor: [248, 250, 252] }, margin: { top: 35, right: 10, bottom: 10, left: 10 } });
      doc.save(`pointages_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);
      return;
    }

    if (filename === 'heures_supplementaires') {
      // Grouper par employé et cumuler les heures
      const grouped = {};
      dataArray.forEach(row => {
        const key = `${row.employee_name}_${row.employee_code}`;
        if (!grouped[key]) {
          grouped[key] = { 
            employee_name: row.employee_name, 
            employee_code: row.employee_code, 
            hours_worked: 0, 
            overtime_hours: 0 
          };
        }
        grouped[key].hours_worked += row.hours_worked || 0;
        grouped[key].overtime_hours += row.overtime_hours || 0;
      });
      
      const hsKeys = ['employee_name', 'employee_code', 'hours_worked', 'overtime_hours'];
      const hsHeaders = ['NOM EMPLOYÉ', 'CODE', 'HEURES TRAVAILLÉES', 'HEURES SUPPLÉMENTAIRES'];
      const columns = hsKeys.map((h, i) => ({ header: hsHeaders[i], dataKey: h }));
      const rows = Object.values(grouped)
        .sort((a, b) => a.employee_name.localeCompare(b.employee_name))
        .map(row => {
          const r = {};
          r.employee_name = String(row.employee_name || '').toUpperCase();
          r.employee_code = String(row.employee_code || '').toUpperCase();
          r.hours_worked = (row.hours_worked || 0).toFixed(2);
          r.overtime_hours = (row.overtime_hours || 0).toFixed(2);
          return r;
        });
      autoTable(doc, { startY: 35, columns, body: rows, styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', halign: 'center' }, bodyStyles: { halign: 'center' }, columnStyles: { 0: { halign: 'left' } }, alternateRowStyles: { fillColor: [248, 250, 252] }, margin: { top: 35, right: 10, bottom: 10, left: 10 } });
      doc.save(`heures_supplementaires_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);
      return;
    }

    if (filename === 'employes') headers = ['employee_code', 'first_name', 'last_name', 'position', 'department', 'socio_professional_category'];
    else if (filename === 'absences') headers = ['employee_name', 'absence_type', 'start_date', 'end_date', 'total_days', 'reason', 'status', 'reviewed_by'];
    else if (filename === 'conges') headers = ['employee_name', 'leave_period', 'start_date', 'end_date', 'total_days', 'reason', 'status', 'reviewed_by'];
    else if (filename === 'journaux_travail') headers = ['employee_name', 'date', 'entry_time', 'exit_time', 'hours_worked', 'balance'];
    else if (filename === 'missions_activites') headers = ['employee_name', 'work_type', 'start_date', 'end_date', 'location', 'project_name', 'description', 'status'];
    else {
      const allKeys = Object.keys(dataArray[0]);
      headers = allKeys.filter(k => !k.includes('id') && k !== 'updated_date' && k !== 'photo_url' && k !== 'justification_file_url');
    }
    
    const columns = headers.map(h => ({ header: (columnTranslations[h] || h).toUpperCase(), dataKey: h }));
    
    const rows = dataArray.map(row => {
      const formattedRow = {};
      headers.forEach(key => {
        let value = row[key];
        if (value === true) value = 'OUI';
            else if (value === false) value = 'NON';
            else if (value === null || value === undefined) value = '-';
            else if (typeof value === 'string' && value.length > 50) value = value.substring(0, 47).toUpperCase() + '...';
            formattedRow[key] = String(value).toUpperCase();
      });
      return formattedRow;
    });
    
    autoTable(doc, {
      startY: 35,
      columns: columns,
      body: rows,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { halign: 'center' },
      columnStyles: { 0: { halign: 'left' } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 35, right: 10, bottom: 10, left: 10 }
    });
    
    doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!canAccessRh(currentUser)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 p-8 flex items-center justify-center">
        <Card className="max-w-md shadow-2xl border-0">
          <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white text-center p-8">
            <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
            <CardTitle className="text-2xl">Accès Restreint</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <Lock className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-slate-600">Cette section est réservée aux administrateurs RH.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = getFilteredData();
  const totalIssues = verifyResults 
    ? verifyResults.workLogs.length + verifyResults.leaves.length + verifyResults.absences.length 
    : 0;
  
  const stats = {
    employees: filtered.employees.length,
    activeEmployees: filtered.employees.filter(e => e.is_active).length,
    absences: filtered.allAbsences.length,
    pendingAbsences: filtered.allAbsences.filter(a => a.status === 'pending').length,
    leaves: filtered.allLeaves.length,
    pendingLeaves: filtered.allLeaves.filter(l => l.status === 'pending').length
  };

  const departmentLabels = {
    direction_generale: "Direction Générale",
    administratif_financier: "Administratif & Financier",
    grand_projet_developpement: "Grand Projet & Développement",
    bureau_abidjan: "Bureau Abidjan",
    bureau_yamoussoukro: "Bureau Yamoussoukro",
    bureau_daloa: "Bureau Daloa",
    bureau_bouafle: "Bureau Bouaflé",
    bureau_sinfra: "Bureau Sinfra",
    bureau_issia: "Bureau Issia"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <RhPageHeader icon={BarChart3} title="Reporting & Synchronisation" mobileTitle="Reporting & Synchro"
          subtitle="Exports, relances et événements du personnel" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl w-full flex gap-1 h-auto">
            <TabsTrigger 
              value="reporting" 
              className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600 rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Reporting</span>
              <span className="sm:hidden">Rapports</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sync" 
              className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600 rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <Database className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Synchro & Relance</span>
              <span className="sm:hidden">Synchro</span>
            </TabsTrigger>
            <TabsTrigger 
              value="evenements" 
              className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600 rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <PartyPopper className="w-4 h-4 shrink-0" />
              <span>Événements</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB REPORTING */}
          <TabsContent value="reporting" className="space-y-6">
            {/* Exports */}
            <div>
              {/* Filtres */}
              <Card className="shadow-xl border-0 bg-white mb-6">
                <CardContent className="p-4 sm:p-6">
                  {/* Toggle visible sur mobile uniquement */}
                  <button
                    className="sm:hidden w-full flex items-center justify-between py-2 text-sm font-semibold text-slate-700"
                    onClick={() => setFiltersVisible(!filtersVisible)}
                  >
                    <span className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Filtres</span>
                    {filtersVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <div className={`space-y-6 ${filtersVisible ? 'block' : 'hidden'} sm:block`}>
                    {/* Date Range */}
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Date de début</label>
                        <Input
                          type="date"
                          value={reportingStartDate}
                          onChange={(e) => setReportingStartDate(e.target.value)}
                          className="border-2 rounded-xl"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Date de fin</label>
                        <Input
                          type="date"
                          value={reportingEndDate}
                          onChange={(e) => setReportingEndDate(e.target.value)}
                          className="border-2 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Department Filter */}
                      <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          <Filter className="w-4 h-4" />
                          Filtrer par département
                        </label>
                        <Select value={filters.department} onValueChange={(val) => setFilters({...filters, department: val, employeeId: 'all'})}>
                          <SelectTrigger className="border-2 rounded-xl bg-white">
                            <SelectValue placeholder="Tous les départements" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les départements</SelectItem>
                            {Object.entries(departmentLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Employee Search */}
                      <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          <Search className="w-4 h-4" />
                          Rechercher un employé
                        </label>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="Nom, prénom ou code salarié..."
                            value={reportingSearchTerm}
                            onChange={(e) => setReportingSearchTerm(e.target.value)}
                            className="border-2 rounded-xl pr-10"
                          />
                          {reportingSearchTerm && (
                            <button
                              onClick={() => setReportingSearchTerm("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Effacer la recherche"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Keep employee filtering logic reference - maintained for internal use */}
                  </div>
                </CardContent>
              </Card>

              {(() => {
                const E = filtered.exp;
                const overtime = Math.round(E.workLogs.reduce((sum, log) => sum + (log.overtime_hours || 0), 0) * 10) / 10;
                const MODULES = [
                  {
                    key: "personnel", title: "Personnel", sub: "Effectif actif · fiches agents", Icon: Users,
                    rows: [
                      { label: "Salariés", value: `${E.salaries.length}`, data: E.salaries, file: "salaries", pdf: "Liste des Salariés" },
                      { label: "Prestataires et consultants", value: `${E.externes.length}`, data: E.externes, file: "prestataires_consultants", pdf: "Liste des prestataires et consultants" },
                      { label: "Stagiaires", value: `${E.stagiaires.length}`, data: E.stagiaires, file: "stagiaires", pdf: "Liste des Stagiaires" },
                    ],
                  },
                  {
                    key: "absences", title: "Absences & Congés", sub: "Demandes déposées sur la période", Icon: CalendarDays,
                    rows: [
                      { label: "Absences", value: `${E.absences.length}`, data: E.absences, file: "absences", pdf: "Rapport des Absences" },
                      { label: "Congés", value: `${E.leaves.length}`, data: E.leaves, file: "conges", pdf: "Rapport des Congés" },
                    ],
                  },
                  {
                    key: "temps", title: "Temps de travail", sub: "Pointages et journées calculées", Icon: Clock,
                    rows: [
                      { label: "Pointages", value: `${E.timeEntries.length}`, data: E.timeEntries, file: "pointages", pdf: "Rapport des Pointages" },
                      { label: "Heures supplémentaires", value: `${overtime} h`, hint: `${E.workLogs.length} journées`, data: E.workLogs, file: "heures_supplementaires", pdf: "Rapport des Heures Supplémentaires" },
                    ],
                  },
                  {
                    key: "missions", title: "Missions & Activités", sub: "Déclarations des agents", Icon: Briefcase,
                    rows: [
                      { label: "Déclarations", value: `${E.activities.length}`, data: E.activities, file: "missions_activites", pdf: "Rapport des Missions & Activités" },
                    ],
                  },
                ];
                return (
                  <>
                    <p className="text-xs font-semibold text-[#0C3D85]/70 mb-3">
                      {E.hasPeriod
                        ? `Période : ${reportingStartDate ? format(new Date(reportingStartDate), "dd/MM/yyyy") : "début"} → ${reportingEndDate ? format(new Date(reportingEndDate), "dd/MM/yyyy") : "aujourd'hui"}`
                        : "Période : tout l'historique — saisissez des dates pour restreindre les exports"}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {MODULES.map(({ key, title, sub, Icon, rows }, i) => (
                        <motion.div key={key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                          className="rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-[#D8E5E8]">
                          <div className="flex items-center gap-3 px-5 py-3.5 bg-[#F2F7F8] border-b border-[#D8E5E8]">
                            <span className="w-10 h-10 rounded-xl bg-[#E2F0EF] flex items-center justify-center flex-none">
                              <Icon className="w-5 h-5 text-[#0C3D85]" />
                            </span>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-[#0C3D85] leading-tight">{title}</h3>
                              <p className="text-xs text-[#667A82] whitespace-normal leading-snug">{sub}</p>
                            </div>
                          </div>
                          <div className="divide-y divide-[#0C3D85]/10">
                            {rows.map((r) => (
                              <div key={r.file} className="flex items-center gap-3 px-5 py-3.5">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-700">{r.label}</p>
                                  {r.hint && <p className="text-xs text-slate-400">{r.hint}</p>}
                                </div>
                                <span className="text-xl font-bold tabular-nums text-[#0C3D85] min-w-[3.5rem] text-right">{r.value}</span>
                                <div className="flex gap-1.5 flex-none">
                                  <Button size="sm" variant="outline" onClick={() => exportToCSV(r.data, r.file)}
                                    className="h-9 rounded-xl text-xs font-semibold border-[#0C3D85]/20 text-[#0C3D85] hover:bg-[#0C3D85]/5">
                                    <Download className="w-3.5 h-3.5 mr-1" /> CSV
                                  </Button>
                                  <Button size="sm" onClick={() => exportToPDF(r.data, r.file, r.pdf)}
                                    className="h-9 rounded-xl text-xs font-semibold bg-[#0C3D85] hover:bg-[#0e4b53] text-white">
                                    <Download className="w-3.5 h-3.5 mr-1" /> PDF
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

          </TabsContent>

          {/* TAB SYNCHRO & RELANCE */}
          <TabsContent value="sync" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-xl border-0 bg-white">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Database className="w-6 h-6 text-blue-600" />
                      Synchronisation Complète
                    </CardTitle>
                    <Badge className="bg-blue-100 text-blue-700">Corrections</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-slate-600">
                    Analyse et corrige automatiquement toutes les incohérences dans les données :
                  </p>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-600" />
                      Logs de travail (heures, balance, cumul)
                    </li>
                    <li className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      Soldes de congés (année + décembre)
                    </li>
                    <li className="flex items-center gap-2">
                      <FileX className="w-4 h-4 text-red-600" />
                      Soldes d'absences (10j + déduction)
                    </li>
                  </ul>
                  <Button onClick={handleSync} disabled={syncing} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 h-12">
                    {syncing ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Synchronisation en cours...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Lancer la Synchronisation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-white">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      Vérification d'Intégrité
                    </CardTitle>
                    <Badge className="bg-green-100 text-green-700">Diagnostic</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-slate-600">
                    Détecte les anomalies sans modifier les données :
                  </p>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Heures travaillées invalides
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Balances suspectes
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Soldes incohérents
                    </li>
                  </ul>
                  <Button onClick={handleVerify} disabled={verifying} variant="outline" className="w-full h-12">
                    {verifying ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Vérification en cours...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Vérifier l'Intégrité
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {syncResults && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="shadow-xl border-0 bg-white">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <CardTitle className="text-xl font-bold">Résultats de la Synchronisation</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <Alert className="bg-green-50 border-green-300">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <AlertDescription className="text-green-800 font-semibold">
                        {syncResults.summary}
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-700">Logs de Travail</span>
                          <Clock className="w-5 h-5 text-cyan-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{syncResults.workLogs.fixed}</p>
                        <p className="text-xs text-slate-600">corrigés sur {syncResults.workLogs.checked}</p>
                      </div>

                      <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-700">Soldes Congés</span>
                          <Calendar className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{syncResults.leaveBalances.fixed}</p>
                        <p className="text-xs text-slate-600">corrigés sur {syncResults.leaveBalances.checked}</p>
                      </div>

                      <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-700">Soldes Absences</span>
                          <FileX className="w-5 h-5 text-red-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{syncResults.absenceBalances.fixed}</p>
                        <p className="text-xs text-slate-600">corrigés sur {syncResults.absenceBalances.checked}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {verifyResults && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="shadow-xl border-0 bg-white">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <CardTitle className="text-xl font-bold">Résultats de la Vérification</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {totalIssues === 0 ? (
                      <Alert className="bg-green-50 border-green-300">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <AlertDescription className="text-green-800 font-semibold">
                          ✅ Aucun problème détecté - Toutes les données sont cohérentes
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <Alert className="bg-orange-50 border-orange-300">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          <AlertDescription className="text-orange-800 font-semibold">
                            ⚠️ {totalIssues} problème(s) détecté(s)
                          </AlertDescription>
                        </Alert>

                        {verifyResults.workLogs.length > 0 && (
                          <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-200">
                            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                              <Clock className="w-5 h-5 text-cyan-600" />
                              Logs de Travail ({verifyResults.workLogs.length})
                            </h3>
                            <ul className="space-y-1 text-sm text-slate-700">
                              {verifyResults.workLogs.map((issue, idx) => (
                                <li key={idx}>• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {verifyResults.leaves.length > 0 && (
                          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-purple-600" />
                              Soldes Congés ({verifyResults.leaves.length})
                            </h3>
                            <ul className="space-y-1 text-sm text-slate-700">
                              {verifyResults.leaves.map((issue, idx) => (
                                <li key={idx}>• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {verifyResults.absences.length > 0 && (
                          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                              <FileX className="w-5 h-5 text-red-600" />
                              Soldes Absences ({verifyResults.absences.length})
                            </h3>
                            <ul className="space-y-1 text-sm text-slate-700">
                              {verifyResults.absences.map((issue, idx) => (
                                <li key={idx}>• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {pointageResults && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="shadow-xl border-0 bg-white">
                  <CardHeader className={`bg-gradient-to-r ${pointageResults.type === 'arrivee' ? 'from-orange-500 to-orange-600' : 'from-blue-500 to-blue-600'} text-white`}>
                    <CardTitle className="text-xl font-bold">Résultats - Relance Pointage {pointageResults.type === 'arrivee' ? 'Arrivée' : 'Sortie'}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <Alert className="bg-green-50 border-green-300">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <AlertDescription className="text-green-800 font-semibold">{pointageResults.summary}</AlertDescription>
                    </Alert>
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-base font-semibold text-slate-700">{pointageResults.type === 'arrivee' ? 'Rappel Arrivée' : 'Rappel Sortie'}</span>
                        {pointageResults.type === 'arrivee' ? <AlertTriangle className="w-8 h-8 text-orange-600" /> : <Bell className="w-8 h-8 text-blue-600" />}
                      </div>
                      <p className="text-4xl font-bold text-slate-900 mb-2">{pointageResults.total}</p>
                      <p className="text-sm text-slate-600">employé(s) notifié(s) à {pointageResults.hour}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* SECTION RELANCE STAGIAIRES */}
            <Card className="shadow-xl border-0 bg-white">
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-6 h-6 text-amber-600" />
                    Relance Contrats Stagiaires
                  </CardTitle>
                  <Badge className="bg-amber-100 text-amber-700">Renouvellement</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
                  <h3 className="font-semibold text-slate-900 mb-2">📋 Contact RH pour procédure administrative</h3>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p><strong>Responsable :</strong> M. ABOUBACAR SIDIBE</p>
                    <p><strong>Téléphone :</strong> 07 57 92 15 62</p>
                    <p><strong>Email :</strong> asidibe0021@gmail.com</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Card className="shadow-md border-0 bg-gradient-to-br from-amber-50 to-amber-100">
                    <CardContent className="p-4 text-center">
                      <Users className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600 mb-1">Contrats expirés ou expirant dans 30 jours</p>
                      <p className="text-3xl font-bold text-amber-900">
                        {data.employees.filter(e => {
                          if (!e.internship_type || !e.internship_end_date) return false;
                          const daysRemaining = Math.ceil((new Date(e.internship_end_date) - new Date()) / (1000 * 60 * 60 * 24));
                          return daysRemaining <= 30;
                        }).length}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Button 
                  onClick={relancerContratsExpirants} 
                  disabled={relancingInterns}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 h-14 text-base"
                >
                  {relancingInterns ? (
                    <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Envoi des emails en cours...</>
                  ) : (
                    <><Send className="w-5 h-5 mr-2" />Relancer les stagiaires pour renouvellement</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {internsResults && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="shadow-xl border-0 bg-white">
                  <CardHeader className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                    <CardTitle className="text-xl font-bold">Résultats - Relance Stagiaires</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <Alert className="bg-green-50 border-green-300">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <AlertDescription className="text-green-800 font-semibold">{internsResults.summary}</AlertDescription>
                    </Alert>
                    <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-base font-semibold text-slate-700">Stagiaires notifiés</span>
                        <Users className="w-8 h-8 text-amber-600" />
                      </div>
                      <p className="text-4xl font-bold text-slate-900 mb-2">{internsResults.total}</p>
                      <p className="text-sm text-slate-600">sur {internsResults.interns} stagiaire(s) concerné(s)</p>
                    </div>
                    
                    {internsResults.notNotified && internsResults.notNotified.length > 0 && (
                      <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                        <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          ⚠️ Stagiaires NON notifiés ({internsResults.notNotified.length})
                        </h3>
                        <div className="space-y-2">
                          {internsResults.notNotified.map((intern, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-3 border border-red-300">
                              <p className="font-bold text-slate-900">{intern.name}</p>
                              <p className="text-sm text-slate-600">Code: {intern.code}</p>
                              <p className="text-xs text-red-700 mt-1">❌ Raison: {intern.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* TAB ÉVÉNEMENTS */}
          <TabsContent value="evenements" className="space-y-6">
            <EvenementsTab employees={data.employees.filter(e => {
              const officeEmails = ['abidjan.cgesn@gmail.com','moussneko@gmail.com','yakro.cgesn@gmail.com','bouafle.cgesn@gmail.com','sinfra.cgesn@gmail.com','daloa.cgesn@gmail.com','issia.cgesn@gmail.com'];
              return !e.internship_type && e.contract_type !== "Prestation" && !(e.email && officeEmails.includes(e.email.toLowerCase()));
            })} />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}