import React, { useState, useEffect, useRef } from "react";
import RhPageHeader from "@/components/rh/RhPageHeader";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, User as UserIcon, Mail, Phone, Briefcase, Calendar, ShieldAlert, Lock, Filter, X, MinusCircle, LogOut, AlertTriangle, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import EmployeeForm from "@/components/employees/EmployeeForm";
import DepartureDialog from "@/components/employees/DepartureDialog";
import { OrgTiles, OrgTile } from "@/components/administration/OrgTiles";
import { DEPARTURE_REASONS, SOON_DAYS, contractLabel, daysUntil, endDateOf, isIntern, isOfficeAccount, upcomingEndCounts, lifecycleOf, reasonLabel } from "@/lib/departures";
import LeaveFormHR from "@/components/leaves/LeaveFormHR";
import { canAccessRh, employeeDataFor } from "@/lib/rhAccess";
import { loadWorkflowValidators, isReadOnlyValidator } from "@/lib/workflowValidators";
// Function métier en cours de migration : l’API retourne HTTP 501 tant que non implémentée.
const syncLeaveBalances = async (payload = {}) => ({ data: await base44.functions.invoke("syncLeaveBalances", payload) });
import { getEmployees, getMe, invalidateEmployees } from "@/lib/rhSession";
import { ABSENCE_ALLOWANCE } from "@/components/rh/RequestUi";

// Barre mobile : recherche + bouton « Filtres » (les filtres restent visibles en permanence dès la tablette)
function MobileSearchBar({ value, onChange, placeholder, open, onToggle, count }) {
  return (
    <div className="flex items-center gap-2 md:hidden">
      <div className="relative flex-1 min-w-0">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 border-2 rounded-xl pl-9 pr-9"
        />
        {value && (
          <button onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Effacer la recherche">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onToggle}
        aria-expanded={open}
        className={`h-11 rounded-xl border-2 px-3 gap-1.5 flex-none ${open || count ? "border-indigo-400 text-indigo-700 bg-indigo-50" : ""}`}
      >
        <Filter className="w-4 h-4" />
        Filtres
        {count > 0 && <span className="ml-0.5 min-w-5 h-5 px-1 rounded-full bg-indigo-600 text-white text-xs font-bold inline-flex items-center justify-center">{count}</span>}
      </Button>
    </div>
  );
}

export default function GestionPersonnelPage() {
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeFormTab, setEmployeeFormTab] = useState("employees"); // which tab triggered the form
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  // Salariés et stagiaires : personnel actif uniquement ; les inactifs sont dans l'onglet « Départs »
  const employeeFilter = "active";
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("employees");
  const [syncingBalances, setSyncingBalances] = useState(false);
  const [showFilters, setShowFilters] = useState(false); // mobile : filtres repliés derrière un bouton
  // Onglet Départs : étape ouverte, filtre de motif, fenêtre de décision, message de confirmation
  const [depTile, setDepTile] = useState("a_statuer");
  const [depReason, setDepReason] = useState("all");
  const [depDialog, setDepDialog] = useState(null);
  const [depNotice, setDepNotice] = useState("");
  const formRef = useRef(null);


  const [showAbsenceDeductDialog, setShowAbsenceDeductDialog] = useState(false);
  const [absenceDeductEmployee, setAbsenceDeductEmployee] = useState(null);
  const [absenceDeductForm, setAbsenceDeductForm] = useState({
    absence_type: "maladie",
    start_date: "",
    end_date: "",
    total_days: "",
    reason: ""
  });
  const [absenceDeductLoading, setAbsenceDeductLoading] = useState(false);
  const [showLeaveFormHR, setShowLeaveFormHR] = useState(false);
  const [leaveFormHREmployee, setLeaveFormHREmployee] = useState(null);

  const handleOpenLeaveFormHR = (employee, e) => {
    e.stopPropagation();
    setLeaveFormHREmployee(employee);
    setShowLeaveFormHR(true);
  };

  useEffect(() => {
    checkAuth();
    // Set active tab from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['employees', 'interns', 'departures'].includes(tab)) {
      setActiveTab(tab);
    }
    if (tab === 'departures' && ['a_venir', 'cdd_future'].includes(urlParams.get('section'))) {
      setDepTile(urlParams.get('section'));
    }
  }, []);

  const checkAuth = async () => {
    setCheckingAuth(true);
    try {
      const user = await getMe();
      setCurrentUser(user);
      
      if (canAccessRh(user)) {
        loadData();
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    }
    setCheckingAuth(false);
  };

  const loadData = async () => {
    setLoading(true);
    // Les comptes de bureau (terminaux) se gèrent dans Administration › Bureaux
    // Liste toujours fraîche ici (page de gestion), limite explicite : le SDK plafonne à 50 par défaut.
    const employeesData = await getEmployees({ fresh: true });

    // Corrections automatiques calculées localement : la liste s'affiche tout de suite
    // et les fiches concernées sont enregistrées en arrière-plan (avant : la page attendait
    // chaque écriture avant de s'afficher).
    const pendingUpdates = [];
    const updatedEmployees = employeesData.map((original) => {
      let emp = original;
      const patch = {};
      // Auto-calculer contract_end_date pour les CDD/CDDTI sans date de fin
      const isCDD = emp.contract_type === "CDD" || emp.contract_type === "CDDTI";
      if (isCDD && emp.hire_date && !emp.contract_end_date) {
        const d = new Date(emp.hire_date);
        d.setFullYear(d.getFullYear() + 2);
        patch.contract_end_date = d.toISOString().split('T')[0];
      }
      // Stagiaires dont le stage finit dans les 30 jours : mis en favori.
      // Plus de désactivation automatique : un stage échu passe « À statuer » dans l'onglet Départs.
      const isIntern = emp.internship_type && emp.internship_type.length > 0;
      if (isIntern && emp.internship_end_date) {
        const daysRemaining = Math.ceil((new Date(emp.internship_end_date) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 30 && daysRemaining > 0 && !emp.is_favorite) patch.is_favorite = true;
      }
      if (Object.keys(patch).length) {
        emp = { ...emp, ...patch };
        pendingUpdates.push(base44.entities.Employee.update(emp.id, patch));
      }
      return emp;
    });
    if (pendingUpdates.length) {
      Promise.allSettled(pendingUpdates).then((results) => {
        invalidateEmployees();
        results.filter((r) => r.status === "rejected").forEach((r) => console.error("Mise à jour automatique d'un employé :", r.reason));
      });
    }
    
    const sortedData = updatedEmployees.sort((a, b) => {
      const codeA = (a.employee_code || '').replace(/\D/g, '');
      const codeB = (b.employee_code || '').replace(/\D/g, '');
      const numA = parseInt(codeA, 10) || 0;
      const numB = parseInt(codeB, 10) || 0;
      if (numA !== numB) return numA - numB;
      return (a.employee_code || '').localeCompare(b.employee_code || '');
    });
    
    setEmployees(sortedData);
    setLoading(false);
  };

  const handleSaveEmployee = async (formData) => {
    const employeeData = employeeDataFor(currentUser, formData);
    if (editingEmployee?.id) {
      await base44.entities.Employee.update(editingEmployee.id, employeeData); invalidateEmployees();
      // Nouvelle adresse : pointages, journées, absences et congés de l'agent la reprennent (sinon il ne les voit plus).
      const newEmail = String(employeeData.email || "").trim().toLowerCase();
      if (newEmail && newEmail !== String(editingEmployee.email || "").trim().toLowerCase()) {
        base44.functions.invoke("syncEmployeeEmail", { employee_id: editingEmployee.id })
          .catch(() => console.error("Propagation de l'adresse e-mail impossible"));
      }
      const wasIntern = editingEmployee.internship_type && editingEmployee.internship_type.length > 0;
      const isNowEmployee = !employeeData.internship_type;

      if (wasIntern && isNowEmployee) {
        // Converti en salarié
        setActiveTab("employees");
        setEmployeeFormTab("employees");
      } else if (wasIntern && employeeData.internship_end_date) {
        // Vérifier si la nouvelle date de fin est dans le futur (stagiaire revient dans l'onglet actif)
        const newDaysRemaining = Math.ceil((new Date(employeeData.internship_end_date) - new Date()) / (1000 * 60 * 60 * 24));
        if (newDaysRemaining > 0) {
          // La date a été prolongée, remettre dans l'onglet Stagiaires
          setActiveTab("interns");
          setEmployeeFormTab("interns");
        }
      }
    } else {
      await base44.entities.Employee.create(employeeData); invalidateEmployees();
    }
    setShowEmployeeForm(false);
    setEditingEmployee(null);
    loadData();
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (currentUser?.role !== "admin") {
      alert("La suppression d'une fiche employé est réservée aux administrateurs.");
      return;
    }
    await base44.entities.Employee.delete(employeeId); invalidateEmployees();
    setShowEmployeeForm(false);
    setEditingEmployee(null);
    loadData();
  };

  const handleOpenAbsenceDeduct = async (employee, e) => {
    e.stopPropagation();
    // La saisie directe crée une absence déjà approuvée : interdite aux comptes sans droit de validation
    if (isReadOnlyValidator(await loadWorkflowValidators(), currentUser)) {
      alert("Votre compte n'a pas de droit de validation. Vous ne pouvez pas enregistrer une absence déjà approuvée.");
      return;
    }
    setAbsenceDeductEmployee(employee);
    setAbsenceDeductForm({
      absence_type: "maladie",
      start_date: "",
      end_date: "",
      total_days: "",
      reason: ""
    });
    setShowAbsenceDeductDialog(true);
  };

  const handleAbsenceDeductSubmit = async () => {
    if (isReadOnlyValidator(await loadWorkflowValidators(), currentUser)) return;
    if (!absenceDeductEmployee || !absenceDeductForm.start_date || !absenceDeductForm.end_date || !absenceDeductForm.total_days) return;
    setAbsenceDeductLoading(true);
    const totalDays = parseFloat(absenceDeductForm.total_days);
    await base44.entities.Absence.create({
      employee_id: absenceDeductEmployee.id,
      employee_name: `${absenceDeductEmployee.first_name} ${absenceDeductEmployee.last_name}`,
      employee_email: absenceDeductEmployee.email || "",
      employee_location: absenceDeductEmployee.office || "Non renseigné",
      absence_type: absenceDeductForm.absence_type,
      start_date: absenceDeductForm.start_date,
      end_date: absenceDeductForm.end_date,
      total_days: totalDays,
      reason: absenceDeductForm.reason || "Saisie manuelle par RH",
      level1_approver: "RH - Saisie directe",
      level1_status: "approved",
      level2_status: "approved",
      level3_status: "approved",
      status: "approved"
    });
    // Déduire les jours du solde
    const newAbsenceDays = (absenceDeductEmployee.absence_days_used || 0) + totalDays;
    await base44.entities.Employee.update(absenceDeductEmployee.id, { absence_days_used: newAbsenceDays }); invalidateEmployees();
    setShowAbsenceDeductDialog(false);
    setAbsenceDeductEmployee(null);
    setAbsenceDeductLoading(false);
    loadData();
  };

  const handleSyncLeaveBalances = async () => {
    if (currentUser?.role !== "admin") {
      alert("La synchronisation des soldes est réservée aux administrateurs.");
      return;
    }
    setSyncingBalances(true);
    let res;
    try {
      res = await syncLeaveBalances({});
    } catch (error) {
      res = { data: { error: error?.response?.data?.error || error?.message } };
    } finally {
      setSyncingBalances(false);
    }
    if (res?.data?.success) {
      alert(res.data.message);
      loadData();
    } else {
      alert("Erreur lors de la synchronisation : " + (res?.data?.error || "inconnue"));
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const officeEmails = [
      'abidjan.cgesn@gmail.com',
      'moussneko@gmail.com',
      'yakro.cgesn@gmail.com',
      'bouafle.cgesn@gmail.com',
      'sinfra.cgesn@gmail.com',
      'daloa.cgesn@gmail.com',
      'issia.cgesn@gmail.com'
    ];
    const isOfficeAccount = emp.email && officeEmails.includes(emp.email.toLowerCase());
    const isIntern = emp.internship_type && emp.internship_type.length > 0;
    
    const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
    
    const matchesSearch = !searchTerm || 
      emp.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${emp.last_name} ${emp.first_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = employeeFilter === "all" || 
      (employeeFilter === "active" && emp.is_active) ||
      (employeeFilter === "inactive" && !emp.is_active);

    const matchesContract = contractFilter === "all" || emp.contract_type === contractFilter;
    
    return matchesDepartment && matchesSearch && matchesStatus && matchesContract && !isOfficeAccount && !isIntern;
  });

  const filteredInterns = employees.filter(emp => {
    const isIntern = emp.internship_type && emp.internship_type.length > 0;
    if (!isIntern) return false;

    // Exclure les stagiaires expirés (ils sont dans l'onglet Départs)
    const daysRemaining = emp.internship_end_date
      ? Math.ceil((new Date(emp.internship_end_date) - new Date()) / (1000 * 60 * 60 * 24))
      : null;
    const isExpired = daysRemaining !== null && daysRemaining <= 0;
    if (isExpired) return false;
    
    const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
    
    const matchesSearch = !searchTerm || 
      emp.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${emp.last_name} ${emp.first_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = employeeFilter === "all" || 
      (employeeFilter === "active" && emp.is_active) ||
      (employeeFilter === "inactive" && !emp.is_active);
    
    return matchesDepartment && matchesSearch && matchesStatus;
  });

  // Onglet Départs : répartition par étape (voir src/lib/departures.js)
  const depMatches = (emp) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return [emp.employee_code, emp.first_name, emp.last_name, `${emp.first_name} ${emp.last_name}`, `${emp.last_name} ${emp.first_name}`]
      .some((v) => String(v || "").toLowerCase().includes(q));
  };
  const upcomingEnds = upcomingEndCounts(employees);
  const cddFuture = [...upcomingEnds.cdd].sort((a, b) => (daysUntil(a.contract_end_date) ?? 0) - (daysUntil(b.contract_end_date) ?? 0));
  const internFuture = [...upcomingEnds.interns].sort((a, b) => (daysUntil(endDateOf(a)) ?? 0) - (daysUntil(endDateOf(b)) ?? 0));
  const contractFuture = [...cddFuture, ...internFuture].sort((a, b) =>
    (daysUntil(endDateOf(a)) ?? 0) - (daysUntil(endDateOf(b)) ?? 0)
  );
  const depGroups = { a_statuer: [], a_venir: [], parti: [], cdd_future: cddFuture, intern_future: internFuture, contract_future: contractFuture };
  employees.forEach((emp) => { const st = lifecycleOf(emp); if (depGroups[st]) depGroups[st].push(emp); });
  depGroups.a_statuer.sort((a, b) => (daysUntil(endDateOf(a)) ?? 0) - (daysUntil(endDateOf(b)) ?? 0));
  // Séparer les fins de stage des CDD/CDDTI : chaque carte compte sa population propre.
  depGroups.a_venir = internFuture;
  depGroups.parti.sort((a, b) => String(b.departure_date || "").localeCompare(String(a.departure_date || "")));
  const reasonCounts = depGroups.parti.reduce((m, e) => ({ ...m, [e.departure_reason]: (m[e.departure_reason] || 0) + 1 }), {});
  const topReasonKey = Object.keys(reasonCounts).sort((a, b) => reasonCounts[b] - reasonCounts[a])[0];
  const topReason = topReasonKey ? reasonLabel(topReasonKey) : "";
  const depShown = (depGroups[depTile] || [])
    .filter(depMatches)
    .filter((e) => depTile !== "parti" || depReason === "all" || e.departure_reason === depReason);
  // Pastille de l'onglet : décisions à prendre (à statuer + à venir)
  const filteredDepartures = [...depGroups.a_statuer, ...depGroups.a_venir];

  const departmentColors = {
    direction_generale: "bg-purple-100 text-purple-800 border-purple-200",
    administratif_financier: "bg-blue-100 text-blue-800 border-blue-200",
    grand_projet_developpement: "bg-green-100 text-green-800 border-green-200",
    bureau_abidjan: "bg-cyan-100 text-cyan-800 border-cyan-200",
    bureau_yamoussoukro: "bg-teal-100 text-teal-800 border-teal-200",
    bureau_daloa: "bg-emerald-100 text-emerald-800 border-emerald-200",
    bureau_bouafle: "bg-orange-100 text-orange-800 border-orange-200",
    bureau_sinfra: "bg-pink-100 text-pink-800 border-pink-200",
    bureau_issia: "bg-rose-100 text-rose-800 border-rose-200"
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

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Vérification des accès...</p>
        </div>
      </div>
    );
  }

  if (!canAccessRh(currentUser)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto mt-20">
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold">Accès Restreint</CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="bg-red-50 rounded-2xl p-6 mb-6">
                <Lock className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-lg text-slate-700 font-medium mb-2">
                  Cette section est réservée aux administrateurs RH
                </p>
              </div>
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-slate-700">
                  <strong>Utilisateur :</strong> {currentUser?.full_name || currentUser?.email}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f6f7] p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <RhPageHeader icon={UserIcon} title="Gestion du Personnel" mobileTitle="Le Personnel"
            subtitle="Salariés, stagiaires et départs" className="!mb-0" />
          {currentUser?.role === "admin" && (
            <div className="flex justify-end -mt-3">
              <Button size="sm" variant="outline" onClick={handleSyncLeaveBalances} disabled={syncingBalances}
                className="rounded-xl border-[#0d5c66]/30 text-[#0d5c66] hover:bg-[#0d5c66]/5"
                title="Recalcule les soldes de congés et d'absences de tous les employés à partir des demandes approuvées de l'année">
                <RefreshCw className={`w-4 h-4 mr-2 ${syncingBalances ? "animate-spin" : ""}`} />
                {syncingBalances ? "Recalcul en cours…" : "Recalculer les soldes"}
              </Button>
            </div>
          )}
          <TabsList className="bg-white p-1 w-full grid grid-cols-3 gap-1 h-auto rounded-2xl shadow-sm ring-1 ring-[#0d5c66]/10">
            <TabsTrigger 
              value="employees" 
              className="rounded-xl m-0 px-1 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all bg-transparent text-[#0d5c66]/70 hover:bg-[#0d5c66]/5 hover:text-[#0d5c66] data-[state=active]:bg-[#0d5c66] data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1 sm:gap-2">
                  <UserIcon className="hidden sm:block w-5 h-5" />
                  <span>Salariés</span>
                </div>
                <span className="text-sm sm:text-xs font-bold">{filteredEmployees.length}</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="interns" 
              className="rounded-xl m-0 px-1 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all bg-transparent text-[#0d5c66]/70 hover:bg-[#0d5c66]/5 hover:text-[#0d5c66] data-[state=active]:bg-[#0d5c66] data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Briefcase className="hidden sm:block w-5 h-5" />
                  <span>Stagiaires</span>
                </div>
                <span className="text-sm sm:text-xs font-bold">{filteredInterns.length}</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="departures" 
              className="group rounded-xl m-0 px-1 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all bg-transparent text-[#0d5c66]/70 hover:bg-[#0d5c66]/5 hover:text-[#0d5c66] data-[state=active]:bg-[#0d5c66] data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1 sm:gap-2">
                  <LogOut className="hidden sm:block w-5 h-5" />
                  <span>Départs</span>
                </div>
                <span className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-xs font-bold" title="Partis : départs enregistrés">{depGroups.parti.length}</span>
                  {depGroups.a_statuer.length > 0 && (
                    <span
                      className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#c2410c] text-white text-[10px] font-bold inline-flex items-center justify-center"
                      title={`${depGroups.a_statuer.length} décision(s) à prendre (À statuer)`}
                    >
                      {depGroups.a_statuer.length}
                    </span>
                  )}
                </span>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Onglet Salariés */}
          <TabsContent value="employees" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0d5c66]">Gestion des salariés</p>
              <Button
                onClick={() => {
                  setEditingEmployee(null);
                  setEmployeeFormTab("employees");
                  setShowEmployeeForm(true);
                }}
                className="w-full sm:w-auto bg-[#0d5c66] hover:bg-[#0e4b53] text-white ring-1 ring-[#d4af6a]/40 shadow-xl rounded-2xl h-11 px-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nouvel Employé
              </Button>
            </div>

            <Card className="rounded-2xl shadow-sm ring-1 ring-[#0d5c66]/10 border-0 bg-gradient-to-b from-[#f1f6f7] to-white">
              <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                <MobileSearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Nom, prénom ou code..." open={showFilters} onToggle={() => setShowFilters(v => !v)} count={(departmentFilter !== "all") + (contractFilter !== "all")} />
                <div className={`${showFilters ? "grid" : "hidden"} md:grid grid-cols-1 md:grid-cols-3 gap-4`}>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Filtrer par département
                    </Label>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="h-12 border border-[#0d5c66]/15 bg-white rounded-xl focus:ring-[#0d5c66]/30">
                        <SelectValue placeholder="Tous les départements" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les départements</SelectItem>
                        <SelectItem value="direction_generale">Direction Générale</SelectItem>
                        <SelectItem value="administratif_financier">Administratif & Financier</SelectItem>
                        <SelectItem value="grand_projet_developpement">Grand Projet & Développement</SelectItem>
                        <SelectItem value="bureau_abidjan">Bureau Abidjan</SelectItem>
                        <SelectItem value="bureau_yamoussoukro">Bureau Yamoussoukro</SelectItem>
                        <SelectItem value="bureau_daloa">Bureau Daloa</SelectItem>
                        <SelectItem value="bureau_bouafle">Bureau Bouaflé</SelectItem>
                        <SelectItem value="bureau_sinfra">Bureau Sinfra</SelectItem>
                        <SelectItem value="bureau_issia">Bureau Issia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Type de contrat
                    </Label>
                    <Select value={contractFilter} onValueChange={setContractFilter}>
                      <SelectTrigger className="h-12 border border-[#0d5c66]/15 bg-white rounded-xl focus:ring-[#0d5c66]/30">
                        <SelectValue placeholder="Tous les contrats" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les contrats</SelectItem>
                        <SelectItem value="CDI">CDI</SelectItem>
                        <SelectItem value="CDD">CDD</SelectItem>
                        <SelectItem value="CDDTI">CDDTI</SelectItem>
                        <SelectItem value="Prestation">PRESTATION</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="hidden md:block space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Rechercher un employé
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Nom, prénom ou code salarié..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-12 border border-[#0d5c66]/15 bg-white rounded-xl pr-10"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Effacer la recherche"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
              </CardContent>
            </Card>

            <div ref={formRef}>
              <AnimatePresence>
                {showEmployeeForm && employeeFormTab === "employees" && (
                  <EmployeeForm
                    employee={editingEmployee}
                    onSave={handleSaveEmployee}
                    onDelete={handleDeleteEmployee}
                    onCancel={() => {
                      setShowEmployeeForm(false);
                      setEditingEmployee(null);
                    }}
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredEmployees.map((employee) => (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card 
                    className="rounded-2xl shadow-sm ring-1 ring-[#0d5c66]/10 border-0 bg-white hover:shadow-lg hover:ring-[#0d5c66]/30 transition-all cursor-pointer overflow-hidden"
                    onClick={() => {
                      setEditingEmployee(employee);
                      setShowEmployeeForm(true);
                      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                    }}
                  >
                    <CardHeader className="border-b border-[#0d5c66]/10 p-4 sm:p-5 bg-gradient-to-br from-[#eef5f6] to-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {employee.photo_url ? (
                            <img src={employee.photo_url} alt={employee.full_name} className="w-12 h-12 rounded-xl object-cover shadow border-2 border-slate-200 flex-none" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0e4b53] to-[#006d79] flex items-center justify-center text-[#d4af6a] font-bold text-lg shadow flex-none">
                              {employee.first_name?.[0]?.toUpperCase() || employee.last_name?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-[15px] lg:text-base font-bold text-slate-900 leading-snug break-words line-clamp-2" title={`${employee.first_name || ""} ${employee.last_name || ""}`}>{employee.first_name} {employee.last_name}</CardTitle>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{employee.employee_code}</p>
                          </div>
                        </div>
                        <Badge variant={employee.is_active ? "default" : "secondary"} className={`${employee.is_active ? "bg-emerald-500" : "bg-slate-300"} shadow-sm text-xs`}>
                          {employee.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className={`${departmentColors[employee.department] || 'bg-slate-100 text-slate-800'} rounded-xl p-3 border-2`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="w-4 h-4" />
                          <span className="font-bold text-xs uppercase">{departmentLabels[employee.department] || employee.department}</span>
                        </div>
                        <p className="text-sm font-semibold">{employee.position}</p>
                      </div>
                      {employee.email && (
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="break-all">{employee.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")}</span>
                        </div>
                      )}
                      {employee.phone && (
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{employee.phone.replace(/(.{4})(.*)(.{2})/, "$1****$3")}</span>
                        </div>
                      )}
                      {employee.internship_type ? (
                      <div className="flex items-center gap-3 text-sm pt-2 border-t border-slate-100">
                        <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
                          {employee.internship_type || "STAGIAIRE"}
                        </Badge>
                      </div>
                      ) : (
                      <>
                       {/* Alerte CDD proche de 2 ans */}
                       {(employee.contract_type === "CDD" || employee.contract_type === "CDDTI" || employee.contract_type === "Prestation") && employee.contract_end_date && (() => {
                          const endDate = new Date(employee.contract_end_date);
                          const now = new Date();
                          const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                          const hireDate = employee.hire_date ? new Date(employee.hire_date) : null;
                          const totalMonths = hireDate ? (endDate.getFullYear() - hireDate.getFullYear()) * 12 + (endDate.getMonth() - hireDate.getMonth()) : null;
                          const isNearLimit = totalMonths !== null && totalMonths >= 23;
                          const isExpired = daysLeft <= 0;
                          const isExpiringSoon = daysLeft > 0 && daysLeft <= 30;
                          if (isExpired || isExpiringSoon) {
                            return (
                              <div className={`rounded-lg px-3 py-2 border text-xs font-semibold flex items-center gap-2 ${isExpired ? 'bg-red-50 border-red-300 text-red-800' : isExpiringSoon ? 'bg-orange-50 border-orange-300 text-orange-800' : 'bg-yellow-50 border-yellow-300 text-yellow-800'}`}>
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {isExpired ? "⛔ CDD expiré" : `⚠️ Expire dans ${daysLeft}j`}
                                  {" — "}{format(endDate, "dd/MM/yyyy", { locale: fr })}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                       <div className="flex items-center justify-end gap-2 text-sm pt-2 border-t border-slate-100">
                         <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleOpenLeaveFormHR(employee, e)}
                          className="h-7 px-2 text-xs border-green-300 text-green-700 hover:bg-green-50 rounded-lg"
                          title={`Saisir un congé — solde restant : ${employee.remaining_year_days ?? 15} j (jan.-nov.)${employee.remaining_december_days != null ? `, ${employee.remaining_december_days} j (décembre)` : ""}`}
                         >
                          Congés ({employee.remaining_year_days ?? 15} Jours)
                         </Button>
                         <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleOpenAbsenceDeduct(employee, e)}
                          className="h-7 px-2 text-xs border-orange-300 text-orange-700 hover:bg-orange-50 rounded-lg"
                          title={`Déduire une absence — ${employee.absence_days_used || 0} j pris sur ${ABSENCE_ALLOWANCE}`}
                         >
                          Absence ({Math.max(0, ABSENCE_ALLOWANCE - (employee.absence_days_used || 0))} Jours)
                         </Button>
                       </div>
                      </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {filteredEmployees.length === 0 && !loading && (
              <Card className="rounded-2xl shadow-sm ring-1 ring-[#0d5c66]/10 border-0 bg-gradient-to-b from-[#f1f6f7] to-white">
                <CardContent className="p-12 text-center">
                  <UserIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">Aucun salarié trouvé</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Onglet Stagiaires */}
          <TabsContent value="interns" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0d5c66]">Gestion des stagiaires</p>
              <Button
                onClick={() => {
                  setEditingEmployee({ internship_type: "PERFECTIONNEMENT", contract_type: "Stage", socio_professional_category: "Stagiaire", attendance_status: "Actif - Pointage non requis" });
                  setEmployeeFormTab("interns");
                  setShowEmployeeForm(true);
                  setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                className="w-full sm:w-auto bg-[#0d5c66] hover:bg-[#0e4b53] text-white ring-1 ring-[#d4af6a]/40 shadow-xl rounded-2xl h-11 px-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nouveau Stagiaire
              </Button>
            </div>

            <Card className="rounded-2xl shadow-sm ring-1 ring-[#0d5c66]/10 border-0 bg-gradient-to-b from-[#f1f6f7] to-white">
              <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                <MobileSearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Nom, prénom ou code..." open={showFilters} onToggle={() => setShowFilters(v => !v)} count={(departmentFilter !== "all") + (contractFilter !== "all")} />
                <div className={`${showFilters ? "grid" : "hidden"} md:grid grid-cols-1 md:grid-cols-2 gap-4`}>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Filtrer par département
                    </Label>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="h-12 border border-[#0d5c66]/15 bg-white rounded-xl focus:ring-[#0d5c66]/30">
                        <SelectValue placeholder="Tous les départements" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les départements</SelectItem>
                        <SelectItem value="direction_generale">Direction Générale</SelectItem>
                        <SelectItem value="administratif_financier">Administratif & Financier</SelectItem>
                        <SelectItem value="grand_projet_developpement">Grand Projet & Développement</SelectItem>
                        <SelectItem value="bureau_abidjan">Bureau Abidjan</SelectItem>
                        <SelectItem value="bureau_yamoussoukro">Bureau Yamoussoukro</SelectItem>
                        <SelectItem value="bureau_daloa">Bureau Daloa</SelectItem>
                        <SelectItem value="bureau_bouafle">Bureau Bouaflé</SelectItem>
                        <SelectItem value="bureau_sinfra">Bureau Sinfra</SelectItem>
                        <SelectItem value="bureau_issia">Bureau Issia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="hidden md:block space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Rechercher un stagiaire
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Nom, prénom ou code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-12 border border-[#0d5c66]/15 bg-white rounded-xl pr-10"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Effacer la recherche"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            <div ref={formRef}>
              <AnimatePresence>
                {showEmployeeForm && employeeFormTab === "interns" && (
                  <EmployeeForm
                    employee={editingEmployee}
                    onSave={handleSaveEmployee}
                    onDelete={handleDeleteEmployee}
                    onCancel={() => {
                      setShowEmployeeForm(false);
                      setEditingEmployee(null);
                    }}
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredInterns.sort((a, b) => {
                const daysA = a.internship_end_date ? Math.ceil((new Date(a.internship_end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 9999;
                const daysB = b.internship_end_date ? Math.ceil((new Date(b.internship_end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 9999;
                return daysA - daysB;
              }).map((employee) => {
                const daysRemaining = employee.internship_end_date ? Math.ceil((new Date(employee.internship_end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                const isExpiringWithin30Days = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;
                const isExpired = daysRemaining !== null && daysRemaining <= 0;
                const isFavorite = employee.is_favorite && isExpiringWithin30Days;

                return (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card
                    className="h-full rounded-2xl border border-[#D8E5E8] bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                    onClick={() => {
                      setEditingEmployee(employee);
                      setEmployeeFormTab("interns");
                      setShowEmployeeForm(true);
                      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                    }}
                  >
                    <CardHeader className="border-b border-[#E5ECEE] p-4 bg-[#F2F7F8]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {employee.photo_url ? (
                            <img src={employee.photo_url} alt={employee.full_name} className="w-12 h-12 rounded-xl object-cover shadow border-2 border-slate-200 flex-none" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0e4b53] to-[#006d79] flex items-center justify-center text-[#d4af6a] font-bold text-lg shadow flex-none">
                              {employee.first_name?.[0]?.toUpperCase() || employee.last_name?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-[15px] lg:text-base font-bold text-slate-900 leading-snug break-words line-clamp-2" title={`${employee.first_name || ""} ${employee.last_name || ""}`}>{employee.first_name} {employee.last_name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{employee.employee_code}</p>
                              <Badge variant={employee.is_active ? "default" : "secondary"} className={`${employee.is_active ? "bg-emerald-500" : "bg-slate-300"} text-xs`}>
                                {employee.is_active ? "Actif" : "Inactif"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#0D5C66] break-words">{departmentLabels[employee.department] || employee.department || "Département non renseigné"}</p>
                        <p className="text-sm text-slate-700 break-words mt-1">{employee.position || "Poste non renseigné"}</p>
                        <p className="text-xs text-slate-500 mt-1 break-words">{employee.internship_type || "Stagiaire"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#E5ECEE]">
                        <Button size="sm" variant="outline" onClick={(e) => handleOpenLeaveFormHR(employee, e)}
                          className="min-w-0 h-auto min-h-9 px-2 py-2 text-xs whitespace-normal leading-snug border-[#B8D9CB] text-[#14684C] hover:bg-green-50 rounded-lg"
                          title="Saisir un congé">
                          Congés ({employee.remaining_year_days ?? 15} j)
                        </Button>
                        <Button size="sm" variant="outline" onClick={(e) => handleOpenAbsenceDeduct(employee, e)}
                          className="min-w-0 h-auto min-h-9 px-2 py-2 text-xs whitespace-normal border-[#E8C8B4] text-[#A14A21] hover:bg-orange-50 rounded-lg"
                          title={`Déduire une absence — ${employee.absence_days_used || 0} j pris sur ${ABSENCE_ALLOWANCE}`}>
                          Absence ({Math.max(0, ABSENCE_ALLOWANCE - (employee.absence_days_used || 0))} j)
                        </Button>
                      </div>
                    </CardContent>
                    </Card>
                    </motion.div>
                    );
                    })}
            </div>

            {filteredInterns.length === 0 && !loading && (
              <Card className="rounded-2xl shadow-sm ring-1 ring-[#0d5c66]/10 border-0 bg-gradient-to-b from-[#f1f6f7] to-white">
                <CardContent className="p-12 text-center">
                  <UserIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">Aucun stagiaire trouvé</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Onglet Départs */}
          <TabsContent value="departures" className="space-y-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0d5c66]">Fins de contrat et départs</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Chaque fin de contrat se termine par une décision : <b>renouveler</b> (ou changer de contrat) ou <b>enregistrer le départ</b> avec son motif. Rien n'est désactivé automatiquement.
              </p>
            </div>

            <OrgTiles label="Étapes">
              {[
                { key: "a_statuer", label: "À statuer", sub: "Échéance passée ou fiche inactive sans motif", icon: "alert", variant: "warn", list: depGroups.a_statuer },
                { key: "a_venir", label: "Fins de stage à venir", sub: `Échéances dans les ${SOON_DAYS} prochains jours`, icon: "clock", list: depGroups.a_venir },
                { key: "cdd_future", label: "CDD / CDDTI à venir", sub: `Échéances dans les ${SOON_DAYS} prochains jours`, icon: "clock", list: depGroups.cdd_future },
                { key: "parti", label: "Partis", sub: "Départs enregistrés, avec motif", icon: "logout", list: depGroups.parti }
              ].map((t) => {
                const interns = t.list.filter(isIntern).length;
                const stats = t.key === "cdd_future"
                  ? [{ label: "CDD", value: t.list.filter((e) => e.contract_type === "CDD").length }, { label: "CDDTI", value: t.list.filter((e) => e.contract_type === "CDDTI").length }]
                  : t.key === "parti"
                  ? [{ label: "Cette année", value: t.list.filter((e) => String(e.departure_date || "").startsWith(String(new Date().getFullYear()))).length }, { label: "Motif principal", value: topReason || "—", tone: "small" }]
                  : [{ label: "Stagiaires", value: interns }, { label: "Salariés", value: t.list.length - interns }];
                return (
                  <OrgTile
                    key={t.key}
                    label={t.label}
                    sub={t.sub}
                    icon={t.icon}
                    variant={t.variant}
                    value={t.list.length}
                    unit={`personne${t.list.length > 1 ? "s" : ""}`}
                    stats={stats}
                    badge={t.key === "a_statuer" ? t.list.length : 0}
                    badgeTitle="Décisions en attente"
                    active={depTile === t.key}
                    muted={!t.list.length}
                    onClick={() => setDepTile(depTile === t.key ? "" : t.key)}
                  />
                );
              })}
            </OrgTiles>

            {depNotice && (
              <div role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-800 flex items-start justify-between gap-3">
                <span>{depNotice}</span>
                <button onClick={() => setDepNotice("")} aria-label="Fermer" className="text-emerald-700"><X className="w-4 h-4" /></button>
              </div>
            )}

            {depTile && (
              <Card className="rounded-2xl shadow-sm ring-1 ring-[#0d5c66]/10 border-0 bg-white">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <p className="text-base font-bold uppercase tracking-wide text-slate-900 flex-1">
                      {depTile === "a_statuer" ? "À statuer" : depTile === "a_venir" ? "Fins de stage dans les 30 jours" : depTile === "contract_future" ? "Fins de contrat dans les 30 jours" : depTile === "intern_future" ? "Fins de stage dans les 30 jours" : depTile === "cdd_future" ? "CDD / CDDTI dans les 30 jours" : "Partis"}
                      <span className="ml-2 text-sm font-semibold text-slate-400">{depShown.length}</span>
                    </p>
                    <div className="relative sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input placeholder="Nom, prénom ou code…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 rounded-xl pl-9" />
                    </div>
                    <Button variant="outline" onClick={() => setDepTile("")} className="h-10 rounded-xl">Fermer</Button>
                  </div>
                  {depTile === "parti" && (
                    <div className="flex flex-wrap gap-2">
                      {[{ value: "all", label: "Tous les motifs" }, ...DEPARTURE_REASONS].map((r) => {
                        const n = r.value === "all" ? depGroups.parti.length : depGroups.parti.filter((e) => e.departure_reason === r.value).length;
                        if (r.value !== "all" && !n) return null;
                        const on = depReason === r.value;
                        return (
                          <button key={r.value} onClick={() => setDepReason(r.value)} className={`h-8 px-3 rounded-full text-xs font-semibold border transition ${on ? "bg-[#0f5c52] border-[#0f5c52] text-white" : "bg-white border-slate-200 text-slate-600 hover:border-[#0f5c52]"}`}>
                            {r.label} <span className={on ? "text-white/70" : "text-slate-400"}>{n}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {depTile && (depShown.length === 0 ? (
              <Card className="rounded-2xl shadow-sm ring-1 ring-[#0d5c66]/10 border-0">
                <CardContent className="p-10 text-center">
                  <LogOut className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">{depTile === "a_statuer" ? "Aucune décision en attente." : depTile === "a_venir" ? "Aucune fin de stage dans les 30 prochains jours." : depTile === "contract_future" ? "Aucune fin de contrat ou de stage dans les 30 prochains jours." : depTile === "intern_future" ? "Aucune fin de stage dans les 30 prochains jours." : depTile === "cdd_future" ? "Aucun CDD ou CDDTI arrivant à échéance dans les 30 prochains jours." : "Aucun départ pour ce filtre."}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {depShown.map((employee) => {
                  const stage = lifecycleOf(employee);
                  const end = endDateOf(employee);
                  const days = daysUntil(end);
                  const fmtDate = (d) => (d ? format(new Date(d), "dd/MM/yyyy", { locale: fr }) : "—");
                  const tone = stage === "parti" ? "slate" : stage === "a_statuer" ? "amber" : "teal";
                  const statusText = stage === "parti"
                    ? `${reasonLabel(employee.departure_reason)} · ${fmtDate(employee.departure_date)}`
                    : stage === "a_venir" || depTile === "cdd_future"
                      ? `Fin dans ${days} jour${days > 1 ? "s" : ""} · ${fmtDate(end)}`
                      : employee.is_active === false
                        ? "Inactif sans motif de départ"
                        : `Échu depuis ${Math.abs(days)} jour${Math.abs(days) > 1 ? "s" : ""} · ${fmtDate(end)}`;
                  const openProfile = () => {
                    setEditingEmployee(employee);
                    setEmployeeFormTab(isIntern(employee) ? "interns" : "employees");
                    setShowEmployeeForm(true);
                    setActiveTab(isIntern(employee) ? "interns" : "employees");
                    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                  };
                  return (
                    <div key={employee.id} className={`rounded-2xl bg-white border shadow-sm overflow-hidden flex flex-col ${tone === "amber" ? "border-amber-200" : tone === "teal" ? "border-teal-200" : "border-slate-200"}`}>
                      <div className={`h-1 ${tone === "amber" ? "bg-amber-400" : tone === "teal" ? "bg-[#0f5c52]" : "bg-slate-300"}`} />
                      <div className="p-4 flex-1 flex flex-col gap-3">
                        <button type="button" onClick={openProfile} className="flex items-start gap-3 text-left group">
                          {employee.photo_url ? (
                            <img src={employee.photo_url} alt="" className="w-11 h-11 rounded-xl object-cover flex-none" />
                          ) : (
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold flex-none ${tone === "slate" ? "bg-slate-400" : "bg-gradient-to-br from-[#0d3b3f] to-[#0f5c52]"}`}>
                              {(employee.first_name?.[0] || employee.last_name?.[0] || "?").toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 leading-snug group-hover:text-[#0f5c52] break-words">{employee.first_name} {employee.last_name}</p>
                            <p className="text-xs text-slate-500">{employee.employee_code} · {employee.position || "Poste non renseigné"}</p>
                          </div>
                        </button>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{contractLabel(employee)}</span>
                          {employee.office && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{employee.office}</span>}
                        </div>
                        <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${tone === "amber" ? "bg-amber-50 text-amber-800" : tone === "teal" ? "bg-teal-50 text-teal-800" : "bg-slate-50 text-slate-700"}`}>
                          {statusText}
                        </div>
                        {stage === "parti" && employee.departure_notes && <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{employee.departure_notes}</p>}
                        {stage === "parti" && employee.departure_recorded_by && <p className="text-[11px] text-slate-400">Enregistré par {employee.departure_recorded_by}</p>}
                        <div className="mt-auto flex flex-wrap gap-2 pt-1">
                          {stage === "parti" ? (
                            <Button variant="outline" onClick={() => setDepDialog({ mode: "reinstate", employee })} className="h-9 rounded-xl text-xs font-semibold">Réintégrer</Button>
                          ) : (
                            <>
                              <Button onClick={() => setDepDialog({ mode: "renew", employee })} className="h-9 rounded-xl text-xs font-semibold bg-[#0f5c52] hover:bg-[#0c4c44] text-white">Renouveler</Button>
                              <Button variant="outline" onClick={() => setDepDialog({ mode: "leave", employee })} className="h-9 rounded-xl text-xs font-semibold border-rose-200 text-rose-700 hover:bg-rose-50">Enregistrer le départ</Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <DepartureDialog
              open={!!depDialog}
              mode={depDialog?.mode}
              employee={depDialog?.employee}
              currentUser={currentUser}
              onClose={() => setDepDialog(null)}
              onDone={(updated, accounts) => {
                setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
                const name = `${updated.first_name || ""} ${updated.last_name || ""}`.trim();
                const what = depDialog?.mode === "leave" ? "Départ enregistré" : depDialog?.mode === "renew" ? "Contrat renouvelé" : "Réintégration enregistrée";
                const acc = accounts?.done?.length
                  ? ` · compte portail ${depDialog?.mode === "leave" ? "suspendu" : "réactivé"}`
                  : accounts?.skipped?.length ? " · compte portail à traiter dans Administration" : "";
                setDepNotice(`${what} : ${name}${acc}.`);
                setDepDialog(null);
              }}
            />
          </TabsContent>

          {/* Onglet Bureaux */}
        </Tabs>
      </div>

      {/* Modal Congé RH pour collaborateur */}
      <AnimatePresence>
        {showLeaveFormHR && (
          <LeaveFormHR
            employees={employees}
            currentUser={currentUser}
            initialEmployeeId={leaveFormHREmployee?.id}
            onClose={() => { setShowLeaveFormHR(false); setLeaveFormHREmployee(null); }}
            onSuccess={() => {}}
          />
        )}
      </AnimatePresence>

      {/* Dialog Déduction Absence Directe */}
      <Dialog open={showAbsenceDeductDialog} onOpenChange={setShowAbsenceDeductDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#D8E5E8]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold text-[#0D5C66] flex items-center gap-2 leading-snug">
            <MinusCircle className="w-5 h-5 shrink-0 text-[#0D5C66]" />
            Absence — {absenceDeductEmployee?.first_name} {absenceDeductEmployee?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">

            <div className="space-y-2">
              <Label>Type d'absence</Label>
              <Select value={absenceDeductForm.absence_type} onValueChange={(v) => setAbsenceDeductForm({...absenceDeductForm, absence_type: v})}>
                <SelectTrigger className="border border-[#D8E5E8] rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maladie">Maladie</SelectItem>
                  <SelectItem value="accident_travail">Accident du travail</SelectItem>
                  <SelectItem value="mariage_travailleur">Mariage du travailleur</SelectItem>
                  <SelectItem value="deces_conjoint">Décès du conjoint</SelectItem>
                  <SelectItem value="deces_enfant_pere_mere">Décès enfant / père / mère</SelectItem>
                  <SelectItem value="naissance_enfant">Naissance d'un enfant</SelectItem>
                  <SelectItem value="formation">Formation</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début *</Label>
                <Input type="date" value={absenceDeductForm.start_date} onChange={(e) => setAbsenceDeductForm({...absenceDeductForm, start_date: e.target.value})} className="border border-[#D8E5E8] rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label>Date de fin *</Label>
                <Input type="date" value={absenceDeductForm.end_date} onChange={(e) => setAbsenceDeductForm({...absenceDeductForm, end_date: e.target.value})} className="border border-[#D8E5E8] rounded-xl h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nombre de jours ouvrables à déduire *</Label>
              <Input type="number" min="0.5" step="0.5" value={absenceDeductForm.total_days} onChange={(e) => setAbsenceDeductForm({...absenceDeductForm, total_days: e.target.value})} placeholder="Ex: 2" className="border border-[#D8E5E8] rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label>Motif / Commentaire</Label>
              <Input value={absenceDeductForm.reason} onChange={(e) => setAbsenceDeductForm({...absenceDeductForm, reason: e.target.value})} placeholder="Motif de l'absence..." className="border border-[#D8E5E8] rounded-xl h-11" />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAbsenceDeductDialog(false)}>Annuler</Button>
            <Button
              onClick={handleAbsenceDeductSubmit}
              disabled={absenceDeductLoading || !absenceDeductForm.start_date || !absenceDeductForm.end_date || !absenceDeductForm.total_days}
              className="bg-[#0D5C66] hover:bg-[#094A52] text-white"
            >
              {absenceDeductLoading ? "Enregistrement..." : "Déduire l'absence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}