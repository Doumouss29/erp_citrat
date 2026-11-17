import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { X, Save, Upload, Loader2, Trash2, User, History, GraduationCap, Star, FileText, AlertCircle, Plus, ArrowUpCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import EmployeeHistory from "./EmployeeHistory";
import EmployeeFormations from "./EmployeeFormations";
import EmployeePerformance from "./EmployeePerformance";
import EmployeeDocuments from "./EmployeeDocuments";

export default function EmployeeForm({ employee, onSave, onCancel, onDelete }) {
  const [formData, setFormData] = useState(employee || {
    employee_code: "",
    last_name: "",
    first_name: "",
    photo_url: "",
    position: "TECHNICIEN(NE) GEOMETRE",
    department: "direction_generale",
    contract_type: "CDI",
    office: "ABIDJAN",
    phone: "",
    email: "",
    remaining_leave_days: 25,
    is_active: true,
    is_on_call: false,
    documents: [],
    evaluations: [],
    formations: []
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [leaves, setLeaves] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (employee?.id) {
      loadHistory();
    } else {
      generateEmployeeCode();
    }
    // Stagiaires du Grand Projet & Développement: Pointage non requis par défaut
    if (formData.internship_type && formData.department === "grand_projet_developpement") {
      setFormData(prev => ({ ...prev, attendance_status: "Actif - Pointage non requis" }));
    }
  }, [formData.internship_type, formData.department, formData.contract_type]);

  // Auto-calculer contract_end_date si CDD/CDDTI et hire_date renseignée mais contract_end_date vide
  useEffect(() => {
    const isCDD = formData.contract_type === "CDD" || formData.contract_type === "CDDTI";
    if (isCDD && formData.hire_date && !formData.contract_end_date) {
      const d = new Date(formData.hire_date);
      d.setFullYear(d.getFullYear() + 2);
      setFormData(prev => ({ ...prev, contract_end_date: d.toISOString().split('T')[0] }));
    }
  }, [formData.contract_type, formData.hire_date]);

  const generateEmployeeCode = async () => {
    try {
      const employees = await base44.entities.Employee.list();
      
      // Externes : série EXT, pour qu'aucun code ne soit confondu avec une fiche de l'ancienne application RH.
      if (formData.contract_type === "Prestation") {
        const numbers = employees
          .map(emp => emp.employee_code)
          .filter(code => code && /^EXT\d+$/.test(code))
          .map(code => parseInt(code.replace('EXT', ''), 10));
        const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
        setFormData(prev => ({ ...prev, employee_code: `EXT${String(next).padStart(3, '0')}` }));
        return;
      }

      // Extract numeric parts from employee codes (e.g., SN001 -> 1, SN002 -> 2)
      const codes = employees
        .map(emp => emp.employee_code)
        .filter(code => code && /^SN\d+$/.test(code))
        .map(code => parseInt(code.replace('SN', ''), 10))
        .filter(num => !isNaN(num));
      
      // Find the highest number and increment
      const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
      const nextCode = maxCode + 1;
      
      // Format as SN + 3-digit number (e.g., SN001, SN012, SN123)
      const newCode = `SN${String(nextCode).padStart(3, '0')}`;
      
      setFormData(prev => ({ ...prev, employee_code: newCode }));
    } catch (error) {
      console.error("Error generating employee code:", error);
    }
  };

  const loadHistory = async () => {
    if (!employee?.id) return;
    
    setLoadingHistory(true);
    try {
      const [leavesData, absencesData] = await Promise.all([
        base44.entities.LeaveRequest.filter({ employee_id: employee.id }),
        base44.entities.Absence.filter({ employee_id: employee.id })
      ]);
      setLeaves(leavesData);
      setAbsences(absencesData);
    } catch (error) {
      console.error("Error loading history:", error);
    }
    setLoadingHistory(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleDelete = () => {
    if (onDelete && employee) {
      onDelete(employee.id);
      setShowDeleteDialog(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError("Veuillez sélectionner une image valide");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, photo_url: file_url });
    } catch (error) {
      setUploadError("Erreur lors du téléchargement de la photo");
    }

    setUploading(false);
  };

  const positions = [
    "DIRECTEUR GÉNÉRAL",
    "CONSEILLER TECHNIQUE",
    "RESPONSABLE DE BUREAU REGIONAL",
    "RESPONSABLE DE BUREAU",
    "CHEF D'ANTENNE",
    "RESPONSABLE PRODUCTION",
    "OPERATEUR TOPOGRAPHE",
    "OPERATEUR GNSS",
    "CHARGE DES OPERATIONS",
    "CHAUFFEUR",
    "RESPONSABLE FINANCIER",
    "RESPONSABLE LOGISTIQUE",
    "RAF PROJET",
    "DIRECTEUR TECHNIQUE ADJOINT",
    "RESPONSABLE BUREAU D'ETUDE",
    "DIRECTEUR TECHNIQUE",
    "CHARGE DES RECHERCHES",
    "TECHNICIEN(NE) GEOMETRE",
    "SECRETAIRE-COMPTABLE",
    "ASSISTANTE BUREAU D'ETUDE",
    "COURSIER",
    "COMPTABLE-TRESORIERE",
    "SECRETAIRE",
    "COORDINATEUR PROJET",
    "GESTIONNAIRE RH",
    "ASSISTANTE RH",
    "GEOMETRE EXPERT STAGIAIRE",
    "ASSISTANTE SECRETAIRE",
    "CHARGE DE L'INNOVATION - DEV STRATEGIQUE",
    "AIDE TOPO",
    "COMMISSAIRE ENQUETEUR",
    "SIFOR",
    "SECRETAIRE COMPTABLE",
    "CHEF DE PROJET",
    "PRESTATAIRE",
    "CONSULTANT"
  ];
  // Une valeur déjà enregistrée hors de la liste reste visible sur sa fiche, sans être proposée aux autres.
  const positionOptions = (formData.position && !positions.includes(formData.position)
    ? [...positions, formData.position]
    : [...positions]
  ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

  const departments = [
    { value: "direction_generale", label: "DIRECTION GENERALE", office: "ABIDJAN" },
    { value: "administratif_financier", label: "ADMINISTRATIF & FINANCIER", office: "ABIDJAN" },
    { value: "grand_projet_developpement", label: "GRAND PROJET & DEVELOPPEMENT", office: "CAG" },
    { value: "bureau_abidjan", label: "BUREAU ABIDJAN", office: "ABIDJAN" },
    { value: "bureau_yamoussoukro", label: "BUREAU YAMOUSSOUKRO", office: "YAMOUSSOUKRO" },
    { value: "bureau_daloa", label: "BUREAU DALOA", office: "DALOA" },
    { value: "bureau_bouafle", label: "BUREAU BOUAFLE", office: "BOUAFLE" },
    { value: "bureau_sinfra", label: "BUREAU SINFRA", office: "SINFRA" },
    { value: "bureau_issia", label: "BUREAU ISSIA", office: "ISSIA" }
  ];

  const contractTypes = [
    { value: "CDI", label: "CDI - CONTRAT A DUREE INDETERMINEE" },
    { value: "CDD", label: "CDD - CONTRAT A DUREE DETERMINEE" },
    { value: "CDDTI", label: "CDDTI - CONTRAT A DUREE DETERMINEE TEMPORAIRE" },
    { value: "Prestation", label: "PRESTATION - CONTRAT DE PRESTATION" },
    { value: "Stage:STAGE ECOLE", label: "STAGE ECOLE - CONTRAT DE STAGE ECOLE" },
    { value: "Stage:PERFECTIONNEMENT", label: "STAGE PERFECTIONNEMENT - CONTRAT DE STAGE DE PERFECTIONNEMENT" }
  ];

  // Un stage = contract_type « Stage » + internship_type : la fiche passe alors dans l'onglet Stagiaires.
  const handleContractChange = (value) => {
    if (value.startsWith("Stage:")) {
      setFormData({
        ...formData,
        contract_type: "Stage",
        internship_type: value.slice("Stage:".length),
        socio_professional_category: "Stagiaire",
        attendance_status: "Actif - Pointage non requis"
      });
    } else if (formData.internship_type) {
      setFormData({
        ...formData,
        contract_type: value,
        internship_type: null,
        internship_start_date: null,
        internship_end_date: null,
        internship_office: null,
        socio_professional_category: "Non renseigné",
        attendance_status: value === "Prestation" ? "Actif - Pointage non requis" : "Actif - Pointage requis"
      });
    } else if (value === "Prestation") {
      // Un prestataire ou un consultant ne pointe pas.
      setFormData({ ...formData, contract_type: value, attendance_status: "Actif - Pointage non requis" });
    } else {
      setFormData({ ...formData, contract_type: value });
    }
  };

  const offices = [
    "ABIDJAN",
    "YAMOUSSOUKRO",
    "DALOA",
    "ISSIA",
    "BOUAFLE",
    "SINFRA",
    "CAG"
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="mb-8"
    >
      <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white p-4 md:p-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg md:text-2xl font-bold truncate">
              {employee?.id ? `Profil de ${employee.first_name} ${employee.last_name}` : (employee?.internship_type ? "Nouveau Stagiaire" : "Nouvel Employé")}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="text-white hover:bg-white/20 rounded-xl flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-slate-200 bg-slate-50 overflow-x-auto">
            <TabsList className="bg-transparent h-auto p-0 w-full min-w-max flex">
              <TabsTrigger 
                value="info" 
                className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-3 md:px-4 py-3 whitespace-nowrap flex-shrink-0"
              >
                <User className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Informations</span>
              </TabsTrigger>
              {employee?.id && (
                <>
                  <TabsTrigger 
                    value="history" 
                    className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-3 md:px-4 py-3 whitespace-nowrap flex-shrink-0"
                  >
                    <History className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Historique</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="formations" 
                    className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-3 md:px-4 py-3 whitespace-nowrap flex-shrink-0"
                  >
                    <GraduationCap className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Formations</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="performance" 
                    className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-3 md:px-4 py-3 whitespace-nowrap flex-shrink-0"
                  >
                    <Star className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Performance</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="documents" 
                    className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-3 md:px-4 py-3 whitespace-nowrap flex-shrink-0"
                  >
                    <FileText className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Documents</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          <TabsContent value="info">
            <form onSubmit={handleSubmit}>
              <CardContent className="p-4 md:p-8 space-y-6">
                      <div className="flex flex-col items-center gap-4 pb-6 border-b border-slate-200">
                  <div className="relative">
                    {formData.photo_url ? (
                      <img
                        src={formData.photo_url}
                        alt="Photo de profil"
                        className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-slate-200 shadow-xl"
                      />
                    ) : (
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl md:text-4xl shadow-xl border-4 border-slate-200">
                        {formData.first_name?.[0]?.toUpperCase() || formData.last_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">Photo de profil</p>
                    <p className="text-xs text-slate-500">La photo peut être modifiée uniquement par l'employé depuis son profil</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="employee_code" className="text-sm md:text-base font-semibold">Code Salarié *</Label>
                    <Input
                      id="employee_code"
                      value={formData.employee_code}
                      onChange={(e) => setFormData({...formData, employee_code: e.target.value})}
                      required
                      className="border-2 rounded-xl h-11 md:h-12"
                      placeholder="Ex: SN001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-sm md:text-base font-semibold">Nom *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name || ""}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value.toUpperCase()})}
                      required
                      className="border-2 rounded-xl h-11 md:h-12"
                      placeholder="NOM DE FAMILLE"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-sm md:text-base font-semibold">Prénom *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name || ""}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      required
                      className="border-2 rounded-xl h-11 md:h-12"
                      placeholder="Prénom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm md:text-base font-semibold">Sexe</Label>
                    <Select
                      value={formData.gender || "Non renseigné"}
                      onValueChange={(value) => setFormData({...formData, gender: value})}
                    >
                      <SelectTrigger className="border-2 rounded-xl h-11 md:h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Homme">HOMME</SelectItem>
                        <SelectItem value="Femme">FEMME</SelectItem>
                        <SelectItem value="Non renseigné">NON RENSEIGNE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date" className="text-sm md:text-base font-semibold">Date de naissance</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date || ""}
                      onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                      className="border-2 rounded-xl h-11 md:h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hire_date" className="text-sm md:text-base font-semibold">Date d'embauche</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date || ""}
                      onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                      className="border-2 rounded-xl h-11 md:h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="socio_professional_category" className="text-sm md:text-base font-semibold">Catégorie Socio-Professionnelle</Label>
                    <Select
                      value={formData.internship_type ? "Stagiaire" : (formData.socio_professional_category || "Non renseigné")}
                      onValueChange={(value) => setFormData({...formData, socio_professional_category: value})}
                      disabled={!!formData.internship_type}
                    >
                      <SelectTrigger className="border-2 rounded-xl h-11 md:h-12 disabled:opacity-50 disabled:cursor-not-allowed">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cadre Supérieur">CADRE SUPERIEUR</SelectItem>
                        <SelectItem value="Cadre">CADRE</SelectItem>
                        <SelectItem value="Agent de Maîtrise">AGENT DE MAITRISE</SelectItem>
                        <SelectItem value="Employé Qualifié">EMPLOYE QUALIFIE</SelectItem>
                        <SelectItem value="Employé Non Qualifié">EMPLOYE NON QUALIFIE</SelectItem>
                        <SelectItem value="Ouvrier Qualifié">OUVRIER QUALIFIE</SelectItem>
                        <SelectItem value="Ouvrier Non Qualifié">OUVRIER NON QUALIFIE</SelectItem>
                        <SelectItem value="Stagiaire">STAGIAIRE</SelectItem>
                        <SelectItem value="Non renseigné">NON RENSEIGNE</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.internship_type && (
                      <p className="text-xs text-slate-500 mt-1">Automatiquement définie à "Stagiaire" pour les stagiaires</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="marital_status" className="text-sm md:text-base font-semibold">Situation matrimoniale</Label>
                    <Select
                      value={formData.marital_status || "Non renseigné"}
                      onValueChange={(value) => setFormData({...formData, marital_status: value})}
                    >
                      <SelectTrigger className="border-2 rounded-xl h-11 md:h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Célibataire">CELIBATAIRE</SelectItem>
                        <SelectItem value="Marié(e)">MARIE(E)</SelectItem>
                        <SelectItem value="Divorcé(e)">DIVORCE(E)</SelectItem>
                        <SelectItem value="Veuf(ve)">VEUF(VE)</SelectItem>
                        <SelectItem value="Non renseigné">NON RENSEIGNE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position" className="text-sm md:text-base font-semibold">Poste Occupé *</Label>
                    <Select
                      value={formData.position}
                      onValueChange={(value) => setFormData(
                        value === "PRESTATAIRE" || value === "CONSULTANT"
                          ? {...formData, position: value, contract_type: "Prestation", attendance_status: "Actif - Pointage non requis", internship_type: null}
                          : {...formData, position: value}
                      )}
                    >
                      <SelectTrigger className="border-2 rounded-xl h-11 md:h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {positionOptions.map(pos => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm md:text-base font-semibold">Département *</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => {
                        const selectedDept = departments.find(d => d.value === value);
                        setFormData({
                          ...formData, 
                          department: value,
                          office: selectedDept?.office || formData.office
                        });
                      }}
                    >
                      <SelectTrigger className="border-2 rounded-xl h-11 md:h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract_type" className="text-sm md:text-base font-semibold">Type de Contrat</Label>
                    <Select
                      value={formData.internship_type ? `Stage:${formData.internship_type}` : (formData.contract_type || "CDI")}
                      onValueChange={handleContractChange}
                    >
                      <SelectTrigger className="border-2 rounded-xl h-11 md:h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contractTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="office" className="text-sm md:text-base font-semibold">Bureau / Localisation</Label>
                    <Select
                      value={formData.office || "ABIDJAN"}
                      onValueChange={(value) => setFormData({...formData, office: value})}
                    >
                      <SelectTrigger className="border-2 rounded-xl h-11 md:h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {offices.map(office => (
                          <SelectItem key={office} value={office}>{office}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm md:text-base font-semibold">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="border-2 rounded-xl h-11 md:h-12"
                      placeholder="email@cabinet.fr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm md:text-base font-semibold">Téléphone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="border-2 rounded-xl h-11 md:h-12"
                      placeholder="06 XX XX XX XX"
                    />
                  </div>
                  </div>

                  {/* Contacts d'urgence - Lecture seule pour RH */}
                  <div className="pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        Contacts d'Urgence
                      </h3>
                    </div>

                    {(!formData.emergency_contacts || formData.emergency_contacts.length === 0) ? (
                      <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-slate-200">
                        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">Aucun contact d'urgence enregistré</p>
                        <p className="text-xs text-slate-400 mt-1">L'employé peut ajouter ses contacts depuis son profil personnel</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.emergency_contacts.map((contact, index) => (
                          <div key={index} className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm text-red-700 font-medium">Nom</Label>
                                <p className="font-semibold text-slate-900">{contact.name || "Non renseigné"}</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm text-red-700 font-medium">Lien de parenté</Label>
                                <p className="font-semibold text-slate-900">{contact.relationship || "Non renseigné"}</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm text-red-700 font-medium">Téléphone</Label>
                                <p className="font-semibold text-slate-900">{contact.phone || "Non renseigné"}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                {formData.internship_type && (
                   <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4 md:p-6 space-y-4">
                     <div className="flex items-center justify-between mb-2">
                       <h3 className="text-base md:text-lg font-bold text-pink-900">Informations du Stage</h3>
                       <Button
                         type="button"
                         onClick={() => {
                           const updatedData = {
                             ...formData,
                             internship_type: null,
                             internship_start_date: null,
                             internship_end_date: null,
                             internship_office: null,
                             contract_type: "CDD",
                             socio_professional_category: "Non renseigné",
                             attendance_status: "Actif - Pointage requis"
                           };
                           setFormData(updatedData);
                           onSave(updatedData);
                         }}
                         className="bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs md:text-sm px-3 py-2 h-auto flex items-center gap-1.5"
                       >
                         <ArrowUpCircle className="w-4 h-4" />
                         Convertir en Salarié (CDD)
                       </Button>
                     </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="internship_type" className="text-sm md:text-base font-semibold">Type de Stage</Label>
                        <Select
                          value={formData.internship_type || "PERFECTIONNEMENT"}
                          onValueChange={(value) => setFormData({...formData, internship_type: value})}
                        >
                          <SelectTrigger className="border-2 rounded-xl h-11 md:h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERFECTIONNEMENT">PERFECTIONNEMENT</SelectItem>
                            <SelectItem value="STAGE ECOLE">STAGE ECOLE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="internship_start_date" className="text-sm md:text-base font-semibold">Date de Début</Label>
                        <Input
                          id="internship_start_date"
                          type="date"
                          value={formData.internship_start_date || ""}
                          onChange={(e) => setFormData({...formData, internship_start_date: e.target.value})}
                          className="border-2 rounded-xl h-11 md:h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="internship_end_date" className="text-sm md:text-base font-semibold">Date de Fin</Label>
                        <Input
                          id="internship_end_date"
                          type="date"
                          value={formData.internship_end_date || ""}
                          onChange={(e) => setFormData({...formData, internship_end_date: e.target.value})}
                          className="border-2 rounded-xl h-11 md:h-12"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Date de fin de contrat CDD / CDDTI */}
                {!formData.internship_type && (formData.contract_type === "CDD" || formData.contract_type === "CDDTI") && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Durée du contrat {formData.contract_type}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hire_date_cdd" className="text-sm font-semibold text-amber-800">Date d'embauche</Label>
                        <Input
                          id="hire_date_cdd"
                          type="date"
                          value={formData.hire_date || ""}
                          onChange={(e) => {
                            const newHireDate = e.target.value;
                            // Auto-calcul date de fin = date d'embauche + 2 ans
                            if (newHireDate) {
                              const d = new Date(newHireDate);
                              d.setFullYear(d.getFullYear() + 2);
                              const newEndDate = d.toISOString().split('T')[0];
                              setFormData({...formData, hire_date: newHireDate, contract_end_date: newEndDate});
                            } else {
                              setFormData({...formData, hire_date: newHireDate});
                            }
                          }}
                          className="border-2 rounded-xl h-11 bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contract_end_date" className="text-sm font-semibold text-amber-800">Date de fin de contrat</Label>
                        <Input
                          id="contract_end_date"
                          type="date"
                          value={formData.contract_end_date || ""}
                          onChange={(e) => setFormData({...formData, contract_end_date: e.target.value})}
                          className="border-2 rounded-xl h-11"
                        />
                      </div>
                    </div>
                    {formData.hire_date && formData.contract_end_date && (() => {
                      const start = new Date(formData.hire_date);
                      const end = new Date(formData.contract_end_date);
                      const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                      if (diffMonths > 24) {
                        return (
                          <p className="text-xs text-red-700 font-semibold mt-2 flex items-center gap-1">
                            ⛔ Durée dépassant 24 mois ({diffMonths} mois) — La durée maximale d'un CDD est de 2 ans.
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {/* Fin de mission : prestataires et consultants */}
                {!formData.internship_type && formData.contract_type === "Prestation" && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                    <div className="space-y-2 md:max-w-xs">
                      <Label htmlFor="mission_end_date" className="text-sm font-semibold text-amber-800">Date de fin de mission *</Label>
                      <Input
                        id="mission_end_date"
                        type="date"
                        required
                        value={formData.contract_end_date || ""}
                        onChange={(e) => setFormData({...formData, contract_end_date: e.target.value})}
                        className="border-2 rounded-xl h-11 bg-white"
                      />
                    </div>
                    <p className="text-xs text-amber-700 mt-2">Le compte d'un prestataire ou d'un consultant est suspendu automatiquement une fois cette date passée.</p>
                  </div>
                )}

                {/* Promotion CDD → CDI */}
                {!formData.internship_type && formData.contract_type === "CDD" && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-amber-900 text-sm md:text-base">Évolution de contrat</p>
                      <p className="text-xs text-amber-700 mt-0.5">Cet employé est en CDD. Vous pouvez le convertir en CDI.</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setFormData({ ...formData, contract_type: "CDI" })}
                      className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs md:text-sm px-3 py-2 h-auto flex items-center gap-1.5 flex-shrink-0"
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                      Passer en CDI
                    </Button>
                  </div>
                )}
                <div className="pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                          className="mt-1 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-300"
                        />
                        <div className="flex-1">
                          <Label htmlFor="is_active" className="cursor-pointer font-semibold text-sm md:text-base text-blue-900 mb-1 block">
                            Employé actif
                          </Label>
                          <p className="text-xs text-blue-700">
                            L'employé peut pointer et faire des demandes
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                      <Label className="text-sm md:text-base font-semibold text-orange-900 mb-2 block">
                        Statut Pointage
                      </Label>
                      <Select
                        value={formData.attendance_status || "Actif - Pointage requis"}
                        onValueChange={(value) => setFormData({...formData, attendance_status: value})}
                      >
                        <SelectTrigger className="border-2 rounded-xl h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Actif - Pointage requis">ACTIF - POINTAGE REQUIS</SelectItem>
                          <SelectItem value="Actif - Pointage non requis">ACTIF - POINTAGE NON REQUIS</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-orange-700 mt-2">
                        Définit si l'employé doit pointer et s'il est comptabilisé dans le taux de présence
                      </p>
                    </div>
                    
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Switch
                          id="is_on_call"
                          checked={formData.is_on_call || false}
                          onCheckedChange={(checked) => setFormData({...formData, is_on_call: checked})}
                          className="mt-1 data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-300"
                        />
                        <div className="flex-1">
                          <Label htmlFor="is_on_call" className="cursor-pointer font-semibold text-sm md:text-base text-green-900 mb-1 block">
                            Agent en Astreinte
                          </Label>
                          <p className="text-xs text-green-700">
                            Les agents en astreinte peuvent reporter leurs congés collectifs de décembre sur janvier de l'année suivante
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 p-4 md:p-6 flex flex-col md:flex-row gap-3 md:justify-between">
                {employee?.id && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="rounded-xl h-11 md:h-12 px-4 md:px-6 w-full md:w-auto"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                )}
                <div className={`flex gap-3 ${!employee?.id || !onDelete ? 'w-full md:ml-auto' : 'w-full md:w-auto'}`}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="rounded-xl h-11 md:h-12 px-4 md:px-6 flex-1 md:flex-none"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-xl h-11 md:h-12 px-4 md:px-6 flex-1 md:flex-none"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </Button>
                </div>
              </CardFooter>
            </form>
          </TabsContent>

          {employee?.id && (
            <>
              <TabsContent value="history">
                <CardContent className="p-4 md:p-8">
                  <EmployeeHistory leaves={leaves} absences={absences} loading={loadingHistory} employee={employee} />
                </CardContent>
              </TabsContent>

              <TabsContent value="formations">
                <CardContent className="p-4 md:p-8">
                  <EmployeeFormations
                    employeeId={employee.id}
                    formations={formData.formations || []}
                    onFormationsChange={(formations) => setFormData({...formData, formations})}
                  />
                </CardContent>
              </TabsContent>

              <TabsContent value="performance">
                <CardContent className="p-4 md:p-8">
                  <EmployeePerformance
                    employeeId={employee.id}
                    evaluations={formData.evaluations || []}
                    onEvaluationsChange={(evaluations) => setFormData({...formData, evaluations})}
                  />
                </CardContent>
              </TabsContent>

              <TabsContent value="documents">
                <CardContent className="p-4 md:p-8">
                  <EmployeeDocuments
                    employeeId={employee.id}
                    documents={formData.documents || []}
                    isAdmin={true}
                    onDocumentsChange={(documents) => setFormData({...formData, documents})}
                  />
                </CardContent>
              </TabsContent>
            </>
          )}
        </Tabs>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'employé <strong>{employee?.first_name} {employee?.last_name}</strong> ?
              <br />
              <span className="text-red-600 font-semibold mt-2 block">
                Cette action est irréversible et supprimera toutes les données associées (pointages, absences, congés).
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}