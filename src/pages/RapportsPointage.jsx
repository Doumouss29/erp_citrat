import React, { useState, useEffect } from "react";
import RhPageHeader from "@/components/rh/RhPageHeader";
import { sendMail } from "@/components/utils/emailTemplate";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileDown, Users, Clock, Filter, Check, X, Trash2, Pencil, Search, AlertCircle, Send } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { loadWithRetry } from "@/lib/resilientLoad";
import { canAccessRh } from "@/lib/rhAccess";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw } from "lucide-react";
import { formatHoursMinutes, formatHoursMinutesWithSign } from "@/components/utils/timeFormat";
import { getMe, getEmployees } from "@/lib/rhSession";

const PAGE = "RapportsPointage";
// Période chargée depuis la base : dates choisies, sinon le mois en cours.
const getPeriod = (startDate, endDate) => {
  const now = new Date();
  return {
    from: startDate || format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"),
    to: endDate || null,
  };
};
const dateQuery = ({ from, to }) => ({ date: to ? { $gte: from, $lte: to } : { $gte: from } });

// Helper: dessine un tableau simple avec jspdf (remplace jspdf-autotable, incompatible avec jspdf 4.x)
function drawSimpleTable(doc, opts) {
  const { startY, head, body, styles = {}, headStyles = {}, margin = { left: 14, right: 14 } } = opts;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - (margin.left || 14) - (margin.right || 14);
  const colCount = head[0].length;
  const colWidth = usableWidth / colCount;
  const fontSize = styles.fontSize || 8;
  const cellPadding = 3;
  doc.setFontSize(fontSize);
  let y = startY;
  const x0 = margin.left || 14;

  const headFill = headStyles.fillColor || [15, 23, 42];
  doc.setFillColor(...headFill);
  doc.rect(x0, y - fontSize, usableWidth, fontSize + cellPadding * 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  head[0].forEach((h, i) => {
    doc.text(String(h), x0 + i * colWidth + cellPadding, y);
  });
  y += fontSize + cellPadding * 2;

  doc.setFont(undefined, 'normal');
  body.forEach((row, rowIdx) => {
    if (rowIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(x0, y - fontSize, usableWidth, fontSize + cellPadding * 2, 'F');
    }
    doc.setTextColor(30, 41, 59);
    row.forEach((val, i) => {
      const text = String(val ?? '');
      const truncated = text.length > 30 ? text.substring(0, 27) + '...' : text;
      doc.text(truncated, x0 + i * colWidth + cellPadding, y, { maxWidth: colWidth - cellPadding * 2 });
    });
    y += fontSize + cellPadding * 2;
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  });
}

// Fonction pour calculer les heures travaillées selon les horaires légaux (8h-17h)
// Supporte le mode pause réelle (4 pointages) et le mode forfait (2 pointages) — identique à l'original
const calculateLegalHours = (entryTime, exitTime, breakStartTime = null, breakEndTime = null) => {
  if (entryTime === '-' || exitTime === '-') return { normalHours: 0, overtimeHours: 0 };

  const parseTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const entryMinutes = parseTime(entryTime);
  const exitMinutes = parseTime(exitTime);

  const workStart = 8 * 60;   // 8h en minutes
  const workEnd = 17 * 60;    // 17h en minutes
  const FORFAIT_BREAK = 60;   // 1h de pause forfaitaire
  const MIN_REAL_BREAK = 30;  // 30 min minimum pour valider une pause réelle

  const normalStartMinutes = Math.max(entryMinutes, workStart);
  const normalEndMinutes = Math.min(exitMinutes, workEnd);

  let normalMinutes = 0;
  let useRealBreak = false;

  // Détection du mode pause réelle
  if (breakStartTime && breakEndTime && breakStartTime !== '-' && breakEndTime !== '-') {
    const bs = parseTime(breakStartTime);
    const be = parseTime(breakEndTime);
    if (be > bs && bs >= entryMinutes && be <= exitMinutes && (be - bs) >= MIN_REAL_BREAK) {
      useRealBreak = true;
      const morning = Math.max(0, Math.min(bs, workEnd) - normalStartMinutes);
      const afternoon = Math.max(0, normalEndMinutes - Math.max(be, workStart));
      normalMinutes = morning + afternoon;
    }
  }

  if (!useRealBreak) {
    normalMinutes = Math.max(0, normalEndMinutes - normalStartMinutes - FORFAIT_BREAK);
  }

  const normalHours = normalMinutes / 60;

  // Heures supplémentaires: après 17h
  const overtimeMinutes = Math.max(0, exitMinutes - workEnd);
  const overtimeHours = overtimeMinutes / 60;

  return { normalHours, overtimeHours };
};

export default function RapportsPointagePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [loadErrors, setLoadErrors] = useState([]);
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  // Filtres
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [editingMotif, setEditingMotif] = useState(null);
  const [editMotifValue, setEditMotifValue] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [activeTab, setActiveTab] = useState("pointages");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState('all');
  const [employeeMonthFilter, setEmployeeMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [absences, setAbsences] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [activities, setActivities] = useState([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [employeeDetailsStartDate, setEmployeeDetailsStartDate] = useState("");
  const [employeeDetailsEndDate, setEmployeeDetailsEndDate] = useState("");
  const [employeeDetailsSearchTerm, setEmployeeDetailsSearchTerm] = useState("");

  // Motifs prédéfinis pour heures supplémentaires
  const overtimeReasons = [
    "Réunion prolongée",
    "Formation",
    "Production urgente",
    "Appel d'offres urgent",
    "Autre"
  ];

  useEffect(() => {
    loadData();
  }, []);

  // Pointages + journaux de la période (rechargés quand les dates changent).
  const fetchPeriodData = async (period = getPeriod(startDate, endDate)) => {
    const q = dateQuery(period);
    return Promise.all([
      loadWithRetry(PAGE, "TimeEntry.filter (période)", () => base44.entities.TimeEntry.filter(q, "-timestamp", 5000)),
      loadWithRetry(PAGE, "DailyWorkLog.filter (période)", () => base44.entities.DailyWorkLog.filter(q, "-date", 5000)),
    ]);
  };

  const reloadWorkLogs = async () => {
    const res = await loadWithRetry(PAGE, "DailyWorkLog.filter (période)", () =>
      base44.entities.DailyWorkLog.filter(dateQuery(getPeriod(startDate, endDate)), "-date", 5000));
    if (res.ok) setWorkLogs(res.data);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await getMe();
      setCurrentUser(user);

      if (canAccessRh(user)) {
        // Chargement indépendant + relance : un échec n'efface plus le reste de la page.
        const [periodResults, others] = await Promise.all([
          fetchPeriodData(),
          Promise.all([
            loadWithRetry(PAGE, "Employee.list", () => getEmployees()),
            loadWithRetry(PAGE, "Absence.list", () => base44.entities.Absence.list("-created_date", 500)),
            loadWithRetry(PAGE, "LeaveRequest.list", () => base44.entities.LeaveRequest.list("-created_date", 500)),
            loadWithRetry(PAGE, "ActivityReport.list", () => base44.entities.ActivityReport.list("-start_date", 500)),
          ]),
        ]);
        const [entries, logs] = periodResults;
        const [emps, absencesData, leavesData, activitiesData] = others;

        setEmployees(emps.data.filter(e => e.is_active));
        setTimeEntries(entries.data);
        setWorkLogs(logs.data);
        setAbsences(absencesData.data);
        setLeaves(leavesData.data);
        setActivities(activitiesData.data);
        setLoadErrors([...periodResults, ...others].filter(r => !r.ok));
      }
    } catch (error) {
      setLoadErrors([{ ok: false, request: "auth.me", status: error?.status || 0, message: String(error?.message || error) }]);
    }
    setLoading(false);
  };

  // Quand la période change, on recharge uniquement pointages + journaux.
  const firstPeriodRun = React.useRef(true);
  useEffect(() => {
    if (firstPeriodRun.current) { firstPeriodRun.current = false; return; }
    if (!canAccessRh(currentUser)) return;
    if (startDate && endDate && startDate > endDate) return;
    let cancelled = false;
    (async () => {
      setLoadingPeriod(true);
      const [entries, logs] = await fetchPeriodData();
      if (cancelled) return;
      setTimeEntries(entries.data);
      setWorkLogs(logs.data);
      setLoadErrors(prev => [
        ...prev.filter(e => !e.request.includes("(période)")),
        ...[entries, logs].filter(r => !r.ok),
      ]);
      setLoadingPeriod(false);
    })();
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  const applyFilters = () => {
    setFiltering(true);
    setTimeout(() => setFiltering(false), 300);
  };

  const handleEditMotif = async (employeeCode, date, currentMotif) => {
    setEditingMotif(`${employeeCode}_${date}`);
    setEditMotifValue(currentMotif === '-' ? '' : currentMotif);
  };

  const handleSaveMotif = async (employeeCode, date) => {
    const workLog = workLogs.find(log => 
      log.employee_code === employeeCode && log.date === date
    );

    // Vérifier si le motif est vide pour "Autre"
    if (editMotifValue === "Autre" || !editMotifValue || editMotifValue.trim() === "") {
      alert("Veuillez saisir un motif personnalisé");
      return;
    }

    // Vérifier si motif obligatoire (balance >= 2h)
    if (workLog && workLog.balance >= 2 && (!editMotifValue || editMotifValue === '-')) {
      alert("Le motif est obligatoire pour les heures supplémentaires >= 2h");
      return;
    }

    if (workLog) {
      await base44.entities.DailyWorkLog.update(workLog.id, {
        overtime_reason: editMotifValue || null
      });
      
      // Recharger les données de la période
      await reloadWorkLogs();
    }

    setEditingMotif(null);
    setEditMotifValue("");
  };

  const handleCancelEdit = () => {
    setEditingMotif(null);
    setEditMotifValue("");
  };

  const handleEditRow = (row) => {
    setEditingRow(`${row.employee_code}_${row.date}`);
    setEditValues({
      entry_time: row.entry_time === '-' ? '' : row.entry_time,
      exit_time: row.exit_time === '-' ? '' : row.exit_time
    });
  };

  const handleSaveRow = async (employeeCode, date) => {
    try {
      const workLog = workLogs.find(log => 
        log.employee_code === employeeCode && log.date === date
      );

      // Calculer les nouvelles heures travaillées
      const entryTime = editValues.entry_time;
      const exitTime = editValues.exit_time;

      let hoursWorked = 0;
      if (entryTime && exitTime) {
        const { normalHours, overtimeHours } = calculateLegalHours(entryTime, exitTime);
        hoursWorked = normalHours + overtimeHours;
      }

      const balance = hoursWorked - 8;

      // Mettre à jour le DailyWorkLog
      if (workLog) {
        await base44.entities.DailyWorkLog.update(workLog.id, {
          entry_time: entryTime || null,
          exit_time: exitTime || null,
          hours_worked: hoursWorked,
          balance: balance
        });
      } else {
        // Créer un nouveau workLog si inexistant
        const employee = employees.find(e => e.employee_code === employeeCode);
        if (employee) {
          await base44.entities.DailyWorkLog.create({
            employee_id: employee.id,
            employee_code: employeeCode,
            employee_name: `${employee.first_name} ${employee.last_name}`,
            date: date,
            entry_time: entryTime || null,
            exit_time: exitTime || null,
            hours_worked: hoursWorked,
            balance: balance,
            cumulative_balance: 0
          });
        }
      }

      // Recalculer le cumul pour tous les jours suivants de cet employé
      const employeeLogs = workLogs
        .filter(log => log.employee_code === employeeCode)
        .sort((a, b) => a.date.localeCompare(b.date));

      let cumulativeBalance = 0;
      for (const log of employeeLogs) {
        if (log.date === date) {
          cumulativeBalance += balance;
        } else if (log.date < date) {
          cumulativeBalance += log.balance || 0;
        } else {
          cumulativeBalance += log.balance || 0;
          await base44.entities.DailyWorkLog.update(log.id, {
            cumulative_balance: cumulativeBalance
          });
        }
      }

      // Mettre à jour le cumul du jour modifié
      if (workLog) {
        const previousBalance = employeeLogs
          .filter(log => log.date < date)
          .reduce((sum, log) => sum + (log.balance || 0), 0);
        
        await base44.entities.DailyWorkLog.update(workLog.id, {
          cumulative_balance: previousBalance + balance
        });
      }

      // Mettre à jour ou créer les TimeEntry
      const existingEntries = timeEntries.filter(e => 
        e.employee_code === employeeCode && e.date === date
      );

      // Supprimer les anciennes entrées
      for (const entry of existingEntries) {
        await base44.entities.TimeEntry.delete(entry.id);
      }

      // Créer les nouvelles entrées
      const employee = employees.find(e => e.employee_code === employeeCode);
      if (entryTime && employee) {
        await base44.entities.TimeEntry.create({
          employee_id: employee.id,
          employee_code: employeeCode,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          entry_type: 'entry',
          timestamp: `${date}T${entryTime}:00`,
          date: date,
          time: entryTime,
          location: employee.office || 'Bureau'
        });
      }

      if (exitTime && employee) {
        await base44.entities.TimeEntry.create({
          employee_id: employee.id,
          employee_code: employeeCode,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          entry_type: 'exit',
          timestamp: `${date}T${exitTime}:00`,
          date: date,
          time: exitTime,
          location: employee.office || 'Bureau'
        });
      }

      await loadData();
      setEditingRow(null);
      setEditValues({});
    } catch (error) {
      console.error("Error saving entry:", error);
      alert("Erreur lors de la sauvegarde");
    }
  };

  const handleCancelRowEdit = () => {
    setEditingRow(null);
    setEditValues({});
  };

  const handleDeleteEntry = async (employeeCode, date) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer les pointages de ${employeeCode} du ${format(parseISO(date), "dd/MM/yyyy")} ?`)) {
      return;
    }

    try {
      // Supprimer le DailyWorkLog
      const workLog = workLogs.find(log => 
        log.employee_code === employeeCode && log.date === date
      );
      if (workLog) {
        await base44.entities.DailyWorkLog.delete(workLog.id);
      }

      // Supprimer toutes les TimeEntry pour cet employé et cette date
      const entriesToDelete = timeEntries.filter(e => 
        e.employee_code === employeeCode && e.date === date
      );
      for (const entry of entriesToDelete) {
        await base44.entities.TimeEntry.delete(entry.id);
      }

      // Recharger les données
      await loadData();
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert("Erreur lors de la suppression");
    }
  };

  const getFilteredData = () => {
    let filtered = [...timeEntries];

    // Filtre par date
    if (startDate) {
      filtered = filtered.filter(e => e.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(e => e.date <= endDate);
    }

    // Filtre par recherche d'employé (nom, prénom, code)
    if (employeeSearchTerm.trim()) {
      const searchTerm = employeeSearchTerm.trim();
      const searchLower = searchTerm.toLowerCase();
      
      // Si c'est un code au format SNxxx, recherche EXACTE uniquement
      if (/^sn\d+$/i.test(searchTerm)) {
        filtered = filtered.filter(e => {
          const entryCode = (e.employee_code || "").toLowerCase().trim();
          return entryCode === searchLower;
        });
      } else {
        // Sinon, recherche flexible par nom ou code
        const matchingEmployees = employees.filter(emp => {
          const fullName = `${emp.last_name} ${emp.first_name}`.toLowerCase();
          const code = (emp.employee_code || "").toLowerCase().trim();
          return fullName.includes(searchLower) || code.includes(searchLower);
        });
        const matchingIds = matchingEmployees.map(emp => emp.id);
        filtered = filtered.filter(e => matchingIds.includes(e.employee_id));
      }
    }

    // Filtre par département
    if (selectedDepartment !== "all") {
      const deptEmployees = employees.filter(emp => emp.department === selectedDepartment);
      const deptEmployeeIds = deptEmployees.map(emp => emp.id);
      filtered = filtered.filter(e => deptEmployeeIds.includes(e.employee_id));
    }

    return filtered;
  };

  const getReportData = () => {
    const filteredEntries = getFilteredData();
    
    // Grouper par employé et par date
    const reportMap = {};

    filteredEntries.forEach(entry => {
      const key = `${entry.employee_code}_${entry.date}`;
      
      if (!reportMap[key]) {
        reportMap[key] = {
          employee_name: entry.employee_name,
          employee_code: entry.employee_code,
          date: entry.date,
          entries: [],
          exits: [],
          breakStarts: [],
          breakEnds: []
        };
      }

      if (entry.entry_type === 'entry') {
        reportMap[key].entries.push(entry.time);
      } else if (entry.entry_type === 'exit') {
        reportMap[key].exits.push(entry.time);
      } else if (entry.entry_type === 'break_start') {
        reportMap[key].breakStarts.push(entry.time);
      } else if (entry.entry_type === 'break_end') {
        reportMap[key].breakEnds.push(entry.time);
      }
    });

    // Calculer les données pour chaque ligne
    const reportData = Object.values(reportMap).map(item => {
      const workLog = workLogs.find(log => 
        log.employee_code === item.employee_code && log.date === item.date
      );

      // Calculer les heures en temps réel si workLog existe
      const entryTime = workLog?.entry_time || item.entries[0] || '-';
      const exitTime = workLog?.exit_time || item.exits[item.exits.length - 1] || '-';
      const breakStartTime = workLog?.break_start_time || item.breakStarts[0] || '-';
      const breakEndTime = workLog?.break_end_time || item.breakEnds[item.breakEnds.length - 1] || '-';

      let hoursWorked = 0;
      if (entryTime !== '-' && exitTime !== '-') {
        const { normalHours, overtimeHours } = calculateLegalHours(entryTime, exitTime, breakStartTime, breakEndTime);
        hoursWorked = normalHours + overtimeHours;
      }
      
      const balance = hoursWorked - 8;

      return {
        employee_name: item.employee_name,
        employee_code: item.employee_code,
        date: item.date,
        entry_time: entryTime,
        break_start_time: breakStartTime,
        break_end_time: breakEndTime,
        exit_time: exitTime,
        hours_worked: hoursWorked,
        hours_worked_display: hoursWorked > 0 ? formatHoursMinutes(hoursWorked) : '0h',
        overtime: balance,
        overtime_display: balance !== 0 ? formatHoursMinutesWithSign(balance) : '0h',
        overtime_reason: workLog?.overtime_reason || '-'
      };
    });

    // Trier par date puis par code employé
    reportData.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.employee_code.localeCompare(b.employee_code);
    });

    return reportData;
  };

  const exportCSV = () => {
    const data = getReportData();
    
    const headers = [
      "Code Employé",
      "Nom",
      "Date",
      "Arrivée",
      "Pause Début",
      "Pause Fin",
      "Départ",
      "Heures Travaillées",
      "Heures Supp."
    ];

    const rows = data.map(row => [
      row.employee_code,
      row.employee_name,
      format(parseISO(row.date), "dd/MM/yyyy"),
      row.entry_time,
      row.break_start_time,
      row.break_end_time,
      row.exit_time,
      row.hours_worked_display,
      row.overtime_display
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rapport_pointage_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const exportPDF = () => {
    const data = getReportData();
    const doc = new jsPDF();

    // Titre
    doc.setFontSize(18);
    doc.text("Rapport de Pointage", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`, 14, 28);
    
    if (startDate || endDate) {
      const period = startDate && endDate 
        ? `Du ${format(parseISO(startDate), "dd/MM/yyyy")} au ${format(parseISO(endDate), "dd/MM/yyyy")}`
        : startDate 
        ? `À partir du ${format(parseISO(startDate), "dd/MM/yyyy")}`
        : `Jusqu'au ${format(parseISO(endDate), "dd/MM/yyyy")}`;
      doc.text(period, 14, 34);
    }

    // Table
    drawSimpleTable(doc, {
      startY: startDate || endDate ? 40 : 34,
      head: [["Code", "Nom", "Date", "Arrivée", "Pause Début", "Pause Fin", "Départ", "Heures", "H.Supp"]],
      body: data.map(row => [
        row.employee_code,
        row.employee_name,
        format(parseISO(row.date), "dd/MM/yyyy"),
        row.entry_time,
        row.break_start_time,
        row.break_end_time,
        row.exit_time,
        row.hours_worked_display,
        row.overtime_display
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`rapport_pointage_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (!canAccessRh(currentUser)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Accès Restreint</h2>
            <p className="text-slate-600">
              Cette page est réservée aux administrateurs RH uniquement.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const reportData = getReportData();
  const totalHours = reportData.reduce((sum, row) => sum + parseFloat(row.hours_worked), 0);
  const totalOvertime = reportData.reduce((sum, row) => sum + parseFloat(row.overtime), 0);

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
    <div className="min-h-screen min-w-0 bg-gradient-to-br from-slate-50 via-white to-blue-50 px-3 py-4 sm:px-5 sm:py-6 lg:p-8">
      <div className="max-w-7xl min-w-0 mx-auto">
        <RhPageHeader icon={Clock} title="Rapports de Pointage" mobileTitle="Pointages"
          subtitle="Arrivées, pauses, départs et heures travaillées" />

        {loadErrors.length > 0 && (
          <Alert className="mb-4 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Certaines données n'ont pas pu être chargées : le tableau peut être incomplet ou vide.</p>
                  <ul className="text-xs mt-1 space-y-0.5">
                    {loadErrors.map((e) => (
                      <li key={e.request}>• {e.request} — {e.status ? `HTTP ${e.status}` : "pas de réponse (réseau/délai)"} : {e.message}</li>
                    ))}
                  </ul>
                </div>
                <Button size="sm" variant="outline" onClick={() => loadData()} className="border-red-300 text-red-700 shrink-0">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {loadingPeriod && (
          <p className="mb-4 text-sm text-slate-500">Chargement des pointages de la période…</p>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 space-y-4 sm:space-y-6">
          <TabsList className="bg-slate-100 p-0 rounded-xl w-full grid grid-cols-2 gap-0 h-auto">
            <TabsTrigger 
              value="pointages" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600 rounded-lg m-1 px-1.5 sm:px-4 py-3 text-xs sm:text-sm font-semibold whitespace-normal leading-tight transition-all"
            >
              <Clock className="w-4 h-4 mr-2" />
              Données de Pointage
            </TabsTrigger>
            <TabsTrigger 
              value="absent" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600 rounded-lg m-1 px-1.5 sm:px-4 py-3 text-xs sm:text-sm font-semibold whitespace-normal leading-tight transition-all"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Absents du jour
            </TabsTrigger>
          </TabsList>

          {/* TAB DONNÉES DE POINTAGE */}
          <TabsContent value="pointages" className="space-y-6">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 sm:justify-end">
              <Button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSelectedEmployee("all");
                  setSelectedDepartment("all");
                }}
                variant="outline"
                className="min-w-0 w-full sm:w-auto rounded-xl px-2 sm:px-4 text-xs sm:text-sm"
              >
                Réinitialiser
              </Button>
              <Button
                onClick={exportPDF}
                className="min-w-0 w-full sm:w-auto bg-red-600 hover:bg-red-700 rounded-xl px-2 sm:px-4 text-xs sm:text-sm"
                disabled={reportData.length === 0}
              >
                <FileDown className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Exporter en PDF</span>
              </Button>
            </div>

            {/* Filtres repliables sur mobile, visibles en permanence sur tablette et ordinateur */}
            <div>
              <button type="button" onClick={() => setMobileFiltersOpen(v => !v)} aria-expanded={mobileFiltersOpen} className="sm:hidden mb-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#0d5c66] flex items-center justify-between"><span>Filtres de recherche</span><span>{mobileFiltersOpen ? "Masquer −" : "Afficher +"}</span></button>
              <div className={mobileFiltersOpen ? "block" : "hidden sm:block"}>
             <Card className="mb-6 min-w-0 shadow-xl border-0 bg-white">
            <CardContent className="p-3 sm:p-5 lg:p-6">
             <div className="space-y-6">
               {/* Date Range */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="min-w-0">
                   <label className="text-sm font-semibold text-slate-700 mb-2 block">Date de début</label>
                   <Input
                     type="date"
                     value={startDate}
                     onChange={(e) => setStartDate(e.target.value)}
                     className="border-2 rounded-xl"
                   />
                 </div>
                 <div className="min-w-0">
                   <label className="text-sm font-semibold text-slate-700 mb-2 block">Date de fin</label>
                   <Input
                     type="date"
                     value={endDate}
                     onChange={(e) => setEndDate(e.target.value)}
                     className="border-2 rounded-xl"
                   />
                 </div>
               </div>

               {/* Filters Row */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                 {/* Department Filter */}
                 <div className="min-w-0">
                   <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                     <Filter className="w-4 h-4" />
                     Filtrer par département
                   </label>
                   <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                     <SelectTrigger className="border-2 rounded-xl bg-white">
                       <SelectValue placeholder="Tous les départements" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Tous les départements</SelectItem>
                       {Object.entries(departmentLabels).map(([key, label]) => (
                         <SelectItem key={key} value={key}>{label}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>

                 {/* Employee Search */}
                 <div className="min-w-0">
                   <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                     <Search className="w-4 h-4" />
                     Rechercher un employé
                   </label>
                   <div className="relative">
                     <Input
                       type="text"
                       placeholder="Nom, prénom ou code salarié..."
                       value={employeeSearchTerm}
                       onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                       className="border-2 rounded-xl pr-10"
                     />
                     {employeeSearchTerm && (
                       <button
                         onClick={() => setEmployeeSearchTerm("")}
                         className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                         title="Effacer la recherche"
                       >
                         <X className="w-4 h-4" />
                       </button>
                     )}
                   </div>
                 </div>
               </div>

               {/* Filtered Select (hidden but used for logic) */}
               <div className="hidden">
                 <Select value={selectedEmployee} onValueChange={(val) => {
                   setSelectedEmployee(val);
                   setEmployeeSearchTerm("");
                 }}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">Tous les employés</SelectItem>
                     {employees
                       .filter(emp => {
                         const searchLower = employeeSearchTerm.toLowerCase();
                         const fullName = `${emp.last_name} ${emp.first_name}`.toLowerCase();
                         const code = emp.employee_code?.toLowerCase() || "";
                         return fullName.includes(searchLower) || code.includes(searchLower);
                       })
                       .sort((a, b) => {
                         const nameA = `${a.last_name} ${a.first_name}`.toUpperCase();
                         const nameB = `${b.last_name} ${b.first_name}`.toUpperCase();
                         return nameA.localeCompare(nameB);
                       })
                       .map(emp => (
                         <SelectItem key={emp.id} value={emp.id}>
                           {emp.employee_code} - {emp.last_name?.toUpperCase()} {emp.first_name?.toUpperCase()}
                         </SelectItem>
                       ))}
                   </SelectContent>
                 </Select>
               </div>
             </div>
            </CardContent>
            </Card>
              </div>
            </div>

            {/* Tableau des données */}
            <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Données de Pointage</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {reportData.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Aucune donnée de pointage trouvée</p>
                <p className="text-sm text-slate-400 mt-2">Essayez d'ajuster vos filtres</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed sm:table-auto text-[10px] sm:text-sm [&_th]:!px-1 [&_td]:!px-1 sm:[&_th]:!px-4 sm:[&_td]:!px-4 [&_th]:text-[9px] sm:[&_th]:text-xs [&_td]:font-normal [&_th:nth-child(1)]:hidden [&_td:nth-child(1)]:hidden [&_th:nth-child(n+5)]:hidden [&_td:nth-child(n+5)]:hidden [&_th:nth-child(7)]:!table-cell [&_td:nth-child(7)]:!table-cell sm:[&_th]:!table-cell sm:[&_td]:!table-cell sm:[&_th:nth-child(5)]:!hidden sm:[&_td:nth-child(5)]:!hidden sm:[&_th:nth-child(6)]:!hidden sm:[&_td:nth-child(6)]:!hidden sm:[&_th:nth-child(8)]:!hidden sm:[&_td:nth-child(8)]:!hidden sm:[&_th:nth-child(9)]:!hidden sm:[&_td:nth-child(9)]:!hidden sm:[&_th:nth-child(10)]:!hidden sm:[&_td:nth-child(10)]:!hidden lg:[&_th:nth-child(5)]:!table-cell lg:[&_td:nth-child(5)]:!table-cell lg:[&_th:nth-child(6)]:!table-cell lg:[&_td:nth-child(6)]:!table-cell lg:[&_th:nth-child(8)]:!table-cell lg:[&_td:nth-child(8)]:!table-cell lg:[&_th:nth-child(9)]:!table-cell lg:[&_td:nth-child(9)]:!table-cell lg:[&_th:nth-child(10)]:!table-cell lg:[&_td:nth-child(10)]:!table-cell [&_th:nth-child(2)]:w-[37%] [&_th:nth-child(3)]:w-[23%] [&_th:nth-child(4)]:w-[20%] [&_th:nth-child(7)]:w-[20%] sm:[&_th]:w-auto sm:[&_th]:text-[11px] lg:[&_th]:text-xs sm:[&_td]:text-xs lg:[&_td]:text-sm [&_td:nth-child(2)]:break-words [&_td:nth-child(3)]:whitespace-nowrap [&_td:nth-child(4)]:whitespace-nowrap [&_td:nth-child(7)]:whitespace-nowrap [&_td_.inline-flex]:px-1 [&_td_.inline-flex]:text-[10px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Nom</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Arrivée</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Pause Début</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Pause Fin</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Départ</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Heures</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">H.Supp</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.map((row, index) => {
                      const isEditing = editingRow === `${row.employee_code}_${row.date}`;
                      return (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.employee_code}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-sm font-normal leading-snug text-slate-900">{row.employee_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <span className="sm:hidden">{format(parseISO(row.date), "dd/MM", { locale: fr })}</span><span className="hidden sm:inline">{format(parseISO(row.date), "dd/MM/yyyy", { locale: fr })}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Input
                              type="time"
                              value={editValues.entry_time}
                              onChange={(e) => setEditValues({...editValues, entry_time: e.target.value})}
                              className="h-8 w-28 text-sm"
                            />
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 font-mono">{row.entry_time}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-orange-100 text-orange-700 font-mono">{row.break_start_time}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-green-100 text-green-700 font-mono">{row.break_end_time}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Input
                              type="time"
                              value={editValues.exit_time}
                              onChange={(e) => setEditValues({...editValues, exit_time: e.target.value})}
                              className="h-8 w-28 text-sm"
                            />
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700 font-mono">{row.exit_time}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.hours_worked_display}</td>
                        <td className="px-4 py-3">
                          <Badge className={`${row.overtime > 0 ? 'bg-green-100 text-green-700' : row.overtime < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                            {row.overtime_display}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                className="h-8 w-8 bg-green-600 hover:bg-green-700"
                                onClick={() => handleSaveRow(row.employee_code, row.date)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={handleCancelRowEdit}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleEditRow(row)}
                                title="Modifier les heures"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteEntry(row.employee_code, row.date)}
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* TAB ABSENTS DU JOUR */}
          <TabsContent value="absent" className="mt-2 sm:mt-4">
            <Card className="overflow-hidden rounded-xl shadow-sm sm:shadow-xl border border-slate-100 sm:border-0 bg-white">
              <CardHeader className="border-0 sm:border-b border-slate-200 bg-white sm:bg-gradient-to-r sm:from-red-50 sm:to-orange-50 px-3 pt-3 pb-1 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="hidden sm:block">
                    <CardTitle className="hidden sm:flex text-xl font-bold text-slate-900 items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                      Employés absents du jour
                    </CardTitle>
                    <p className="hidden sm:block text-sm text-slate-600 mt-1">
                      Employés "Actif - Pointage requis" n'ayant pas pointé leur arrivée aujourd'hui ({format(new Date(), 'dd/MM/yyyy')})
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      const today = format(new Date(), 'yyyy-MM-dd');
                      const now = new Date();
                      const todayEntries = timeEntries.filter(t => t.date === today && t.entry_type === "entry");
                      const employeesWhoClocked = new Set(todayEntries.map(t => t.employee_id));
                      const employeesRequiringAttendance = employees.filter(e => e.is_active && e.attendance_status === "Actif - Pointage requis");
                      const absentEmployees = employeesRequiringAttendance.filter(e => !employeesWhoClocked.has(e.id));

                      if (!window.confirm(`Envoyer des notifications de rappel aux ${absentEmployees.length} employé(s) absent(s) ?`)) return;

                      let count = 0;
                      for (const emp of absentEmployees) {
                        if (emp.email) {
                          try {
                            await base44.entities.Notification.create({
                              user_email: emp.email,
                              type: "general",
                              title: "⚠️ Rappel de pointage urgent",
                              message: `Bonjour ${emp.first_name}, vous n'avez pas encore pointé votre arrivée aujourd'hui. Merci de le faire immédiatement si vous êtes présent(e).`
                            });
                            setTimeout(() => {
                              sendMail({
                                to: emp.email,
                                subject: "⚠️ Rappel de pointage - Absence non justifiée",
                                body: `Bonjour ${emp.first_name} ${emp.last_name},\n\nVous n'avez pas encore effectué votre pointage d'arrivée aujourd'hui (${format(now, 'dd/MM/yyyy à HH:mm')}).\n\nSi vous êtes présent(e), merci de pointer immédiatement.\nSi vous êtes absent(e), merci de régulariser votre situation auprès des RH.\n\nCordialement,\nService RH - CITRAT`
                              }).catch(e => console.log("Email non envoyé:", e));
                            }, count * 200);
                            count++;
                          } catch (e) {
                            console.log("Erreur notification:", e);
                          }
                        }
                      }
                      alert(`${count} notification(s) envoyée(s) avec succès`);
                    }}
                    className="w-full sm:w-auto h-9 sm:h-10 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg sm:rounded-xl text-xs sm:text-sm shadow-none"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Relancer tous les absents
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-3 pt-1 pb-3 sm:p-6">
                {(() => {
                  const today = format(new Date(), 'yyyy-MM-dd');
                  const todayEntries = timeEntries.filter(t => t.date === today && t.entry_type === "entry");
                  const employeesWhoClocked = new Set(todayEntries.map(t => t.employee_id));
                  
                  // Récupérer les employés avec absences/congés/missions validées aujourd'hui
                  const employeesWithApprovedAbsence = new Set(
                    absences
                      .filter(a => a.status === "approved" && a.start_date <= today && a.end_date >= today)
                      .map(a => a.employee_id)
                  );
                  const employeesWithApprovedLeave = new Set(
                    leaves
                      .filter(l => l.status === "approved" && l.start_date <= today && l.end_date >= today)
                      .map(l => l.employee_id)
                  );
                  const employeesWithApprovedActivity = new Set(
                    activities
                      .filter(act => act.status === "approved" && act.start_date <= today && act.end_date >= today)
                      .map(act => act.employee_id)
                  );
                  
                  const employeesRequiringAttendance = employees.filter(e => 
                    e.is_active && e.attendance_status === "Actif - Pointage requis"
                  );
                  
                  // Filtrer pour exclure ceux qui ont pointé OU qui ont une validation aujourd'hui
                  const absentEmployees = employeesRequiringAttendance.filter(e => 
                    !employeesWhoClocked.has(e.id) && 
                    !employeesWithApprovedAbsence.has(e.id) &&
                    !employeesWithApprovedLeave.has(e.id) &&
                    !employeesWithApprovedActivity.has(e.id)
                  );

                  if (absentEmployees.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Clock className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-lg font-semibold text-slate-700">Aucun employé absent</p>
                        <p className="text-sm text-slate-500 mt-1">Tous les employés ont pointé leur arrivée aujourd'hui</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="mb-3 px-3 py-2 sm:p-4 bg-red-50 border border-red-100 rounded-lg sm:rounded-xl">
                        <p className="text-sm text-red-800">
                          <span className="sm:hidden"><strong>{absentEmployees.length}</strong> sans pointage aujourd’hui</span><span className="hidden sm:inline"><strong>{absentEmployees.length}</strong> employé(s) n’ont pas encore pointé leur arrivée aujourd’hui</span>
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] sm:text-sm [&_th]:text-[10px] sm:[&_th]:text-xs [&_td]:font-normal [&_th]:px-2 [&_td]:px-2 [&_th:first-child]:hidden [&_td:first-child]:hidden sm:[&_th:first-child]:table-cell sm:[&_td:first-child]:table-cell sm:[&_th]:px-3 sm:[&_td]:px-3 [&_th:nth-child(4)]:hidden [&_td:nth-child(4)]:hidden [&_th:nth-child(5)]:hidden [&_td:nth-child(5)]:hidden [&_th:nth-child(6)]:hidden [&_td:nth-child(6)]:hidden sm:[&_th:nth-child(4)]:table-cell sm:[&_td:nth-child(4)]:table-cell lg:[&_th:nth-child(5)]:table-cell lg:[&_td:nth-child(5)]:table-cell lg:[&_th:nth-child(6)]:table-cell lg:[&_td:nth-child(6)]:table-cell">
                          <thead>
                            <tr className="border-b-2 border-slate-200 bg-slate-50">
                              <th className="text-left p-3 font-bold text-slate-700 text-sm">CODE</th>
                              <th className="text-left p-3 font-bold text-slate-700 text-sm">NOM</th>
                              <th className="text-left p-3 font-bold text-slate-700 text-sm">DÉPARTEMENT</th>
                              <th className="text-left p-3 font-bold text-slate-700 text-sm">BUREAU</th>
                              <th className="text-left p-3 font-bold text-slate-700 text-sm">TÉLÉPHONE</th>
                              <th className="text-left p-3 font-bold text-slate-700 text-sm">EMAIL</th>
                              <th className="text-center p-3 font-bold text-slate-700 text-sm">ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {absentEmployees.map((emp, idx) => (
                              <tr key={emp.id} className={`border-b border-slate-100 hover:bg-red-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                <td className="p-3 text-sm font-mono text-slate-700">{emp.employee_code}</td>
                                <td className="p-2 sm:p-3 text-[11px] sm:text-sm font-normal leading-snug text-slate-900">{emp.last_name} {emp.first_name}</td>
                                <td className="p-2 sm:p-3 text-[11px] sm:text-sm font-normal leading-snug text-slate-600">{departmentLabels[emp.department] || emp.department}</td>
                                <td className="p-3 text-sm text-slate-600">{emp.office}</td>
                                <td className="p-3 text-sm text-slate-600">{emp.phone || "-"}</td>
                                <td className="p-3 text-sm text-slate-600">{emp.email || "-"}</td>
                                <td className="p-3 text-center">
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      if (!emp.email) {
                                        alert("Cet employé n'a pas d'email");
                                        return;
                                      }
                                      try {
                                        await base44.entities.Notification.create({
                                          user_email: emp.email,
                                          type: "general",
                                          title: "⚠️ Rappel de pointage urgent",
                                          message: `Bonjour ${emp.first_name}, vous n'avez pas encore pointé votre arrivée aujourd'hui. Merci de le faire immédiatement si vous êtes présent(e).`
                                        });
                                        await sendMail({
                                          to: emp.email,
                                          subject: "⚠️ Rappel de pointage - Absence non justifiée",
                                          body: `Bonjour ${emp.first_name} ${emp.last_name},\n\nVous n'avez pas encore effectué votre pointage d'arrivée aujourd'hui.\n\nSi vous êtes présent(e), merci de pointer immédiatement.\nSi vous êtes absent(e), merci de régulariser votre situation auprès des RH.\n\nCordialement,\nService RH - CITRAT`
                                        });
                                        alert("Notification envoyée avec succès");
                                      } catch (error) {
                                        console.error("Erreur:", error);
                                        alert("Erreur lors de l'envoi de la notification");
                                      }
                                    }}
                                    className="bg-orange-500 hover:bg-orange-600 rounded-lg px-2 sm:px-3 text-[10px] sm:text-xs whitespace-nowrap"
                                  >
                                    <Send className="w-3 h-3 mr-1" />
                                    Relancer
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
}