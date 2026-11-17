import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Building2, 
  Calendar, 
  Award,
  FileText,
  Edit2,
  Camera,
  Download,
  CheckCircle,
  FileX,
  AlertCircle,
  Plus,
  X,
  Heart,
  Cake
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import EmployeeDocuments from "@/components/employees/EmployeeDocuments";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { safeUrl } from "@/lib/safeUrl";
import { getEmployees, getMe, invalidateEmployees } from "@/lib/rhSession";

export default function ProfilPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [formations, setFormations] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [message, setMessage] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  useEffect(() => {
    loadData();
    syncAbsenceDays();
  }, []);

  const syncAbsenceDays = async () => {
    try {
      const user = await getMe();
      // Le compteur d'absences n'est modifiable que par l'administration (et par le serveur à la validation).
      if (user.role !== 'admin') return;
      const allEmployees = await getEmployees();
      const employeeData = allEmployees.find(emp => 
        emp.email?.toLowerCase() === user.email?.toLowerCase() ||
        emp.employee_code === user.employee_code
      );

      if (!employeeData) return;

      // Récupérer toutes les absences approuvées de cet employé
      // Filtrées côté serveur sur cet employé (avant : toutes les absences approuvées du personnel)
      const candidates = await Promise.all([
        base44.entities.Absence.filter({ status: "approved", employee_id: employeeData.id }, "-start_date", 1000),
        employeeData.email ? base44.entities.Absence.filter({ status: "approved", employee_email: employeeData.email }, "-start_date", 1000) : [],
        employeeData.email ? base44.entities.Absence.filter({ status: "approved", created_by: employeeData.email }, "-start_date", 1000) : [],
        employeeData.full_name ? base44.entities.Absence.filter({ status: "approved", employee_name: employeeData.full_name }, "-start_date", 1000) : [],
      ]);
      const allAbsences = [...new Map(candidates.flat().map((a) => [a.id, a])).values()];
      const employeeAbsences = allAbsences.filter(a => 
        a.employee_id === employeeData.id || 
        (a.employee_email || a.created_by) === employeeData.email ||
        a.employee_name?.toLowerCase() === employeeData.full_name?.toLowerCase()
      );

      // Calculer le total des jours d'absence
      let totalAbsenceDays = 0;
      for (const absence of employeeAbsences) {
        const start = new Date(absence.start_date);
        const end = new Date(absence.end_date);
        let days = 0;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const day = d.getDay();
          if (day !== 0 && day !== 6) days++;
        }
        totalAbsenceDays += days;
      }

      // Mettre à jour si différent
      if ((employeeData.absence_days_used || 0) !== totalAbsenceDays) {
        await base44.entities.Employee.update(employeeData.id, { 
          absence_days_used: totalAbsenceDays 
        }); invalidateEmployees();
        await loadData(); // Recharger les données
      }
    } catch (error) {
      console.error("Erreur synchronisation:", error);
    }
  };

  const loadData = async () => {
    try {
      const user = await getMe();
      setCurrentUser(user);

      const allEmployees = await getEmployees();
      let employeeData = allEmployees.find(emp => 
        emp.email?.toLowerCase() === user.email?.toLowerCase() ||
        emp.employee_code === user.employee_code
      );

      if (employeeData) {
        setEmployee(employeeData);
        setEditData({
          phone: employeeData.phone || "",
          email: employeeData.email || "",
          gender: employeeData.gender || "Non renseigné",
          birth_date: employeeData.birth_date || "",
          marital_status: employeeData.marital_status || "Non renseigné"
        });
        setFormations(employeeData.formations || []);
        setEvaluations(employeeData.evaluations || []);
        setDocuments(employeeData.documents || []);
        setEmergencyContacts(employeeData.emergency_contacts || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier que seul l'employé propriétaire peut modifier sa photo
    if (employee.email?.toLowerCase() !== currentUser.email?.toLowerCase() && 
        employee.employee_code !== currentUser.employee_code) {
      setMessage({ type: "error", text: "Vous ne pouvez modifier que votre propre photo" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Employee.update(employee.id, { photo_url: file_url }); invalidateEmployees();
      
      setMessage({ type: "success", text: "Photo mise à jour avec succès" });
      loadData();
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors du téléchargement de la photo" });
    }
    setUploadingPhoto(false);
    setTimeout(() => setMessage(null), 3000);
  };



  const handleSaveProfile = async () => {
    try {
      const profileUpdate = {
        phone: editData.phone,
        gender: editData.gender,
        birth_date: editData.birth_date,
        marital_status: editData.marital_status,
        emergency_contacts: emergencyContacts
      };
      // L'e-mail professionnel est verrouillé : seul l'administrateur peut le modifier.
      if (currentUser?.role === 'admin') profileUpdate.email = editData.email;
      await base44.entities.Employee.update(employee.id, profileUpdate); invalidateEmployees();
      
      setMessage({ type: "success", text: "Profil mis à jour avec succès" });
      setEditMode(false);
      loadData();
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la mise à jour du profil" });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddEmergencyContact = () => {
    setEmergencyContacts([...emergencyContacts, { name: "", relationship: "", phone: "" }]);
  };

  const handleRemoveEmergencyContact = (index) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };


  const handleUpdateEmergencyContact = (index, field, value) => {
    const updated = [...emergencyContacts];
    updated[index][field] = value;
    setEmergencyContacts(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
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

  const departmentLabels = {
    administratif_financier: "Administratif et Financier",
    technique: "Technique",
    grand_projet_developpement: "Grand Projet et Développement",
    logistique: "Logistique"
  };

  const formatPosition = (position) => {
    if (!position) return "";
    const words = position.split(' ');
    return words.map((word, index) => {
      const lowerWord = word.toLowerCase();
      // Connecteurs logiques en minuscule
      if (lowerWord === 'de' || lowerWord === 'du' || lowerWord === 'des' || 
          lowerWord === 'le' || lowerWord === 'la' || lowerWord === 'les' || 
          lowerWord === 'et' || lowerWord === "l'") {
        return lowerWord;
      }
      // Première lettre en majuscule pour les autres mots
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  };

  // Vue simplifiée pour les stagiaires
  if (employee.internship_type) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Alert className={`${
                message.type === "success" 
                  ? "bg-green-50 border-green-300 text-green-900" 
                  : "bg-red-50 border-red-300 text-red-900"
              } rounded-2xl`}>
                <AlertDescription className="font-semibold">{message.text}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="shadow-2xl border-0 bg-white overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-pink-500 to-pink-600 h-24 md:h-28 relative">
                <div className="absolute -bottom-12 md:-bottom-16 left-4 md:left-8">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                    {employee.photo_url ? (
                      <img src={employee.photo_url} alt={employee.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 md:w-14 md:h-14 text-white" />
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-16 md:pt-20 px-4 md:px-8 pb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">{employee.full_name}</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* NOM ET PRENOMS */}
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                    <Label className="text-xs font-semibold text-pink-700 mb-2 block">NOM ET PRÉNOMS</Label>
                    <p className="text-slate-900 font-semibold">{employee.full_name}</p>
                  </div>

                  {/* BUREAU */}
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                    <Label className="text-xs font-semibold text-pink-700 mb-2 block flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      BUREAU
                    </Label>
                    <p className="text-slate-900 font-semibold">{employee.office || "Non renseigné"}</p>
                  </div>

                  {/* DATE D'ENTRÉE */}
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                    <Label className="text-xs font-semibold text-pink-700 mb-2 block flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      DATE D'ENTRÉE
                    </Label>
                    <p className="text-slate-900 font-semibold">
                      {employee.internship_start_date ? format(new Date(employee.internship_start_date), "dd/MM/yyyy") : "Non renseigné"}
                    </p>
                  </div>

                  {/* STATUT */}
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                    <Label className="text-xs font-semibold text-pink-700 mb-2 block">STATUT</Label>
                    <Badge className={`${employee.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {employee.is_active ? '✓ Actif' : '✗ Inactif'}
                    </Badge>
                  </div>

                  {/* SEXE */}
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                    <Label className="text-xs font-semibold text-pink-700 mb-2 block flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      SEXE
                    </Label>
                    <p className="text-slate-900 font-semibold">{employee.gender || "Non renseigné"}</p>
                  </div>

                  {/* FONCTION */}
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                    <Label className="text-xs font-semibold text-pink-700 mb-2 block flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      FONCTION
                    </Label>
                    <p className="text-slate-900 font-semibold">{formatPosition(employee.position)}</p>
                  </div>

                  {/* DATE DE FIN */}
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                    <Label className="text-xs font-semibold text-pink-700 mb-2 block flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      DATE DE FIN
                    </Label>
                    <p className="text-slate-900 font-semibold">
                      {employee.internship_end_date ? format(new Date(employee.internship_end_date), "dd/MM/yyyy") : "Non renseigné"}
                    </p>
                  </div>

                  {/* ALERTE */}
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                    <Label className="text-xs font-semibold text-pink-700 mb-2 block flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      ALERTE
                    </Label>
                    {employee.internship_end_date && new Date(employee.internship_end_date) < new Date() ? (
                      <Badge className="bg-red-100 text-red-700">Stage terminé</Badge>
                    ) : employee.internship_end_date && new Date(employee.internship_end_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? (
                      <Badge className="bg-orange-100 text-orange-700">Fin proche</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700">En cours</Badge>
                    )}
                  </div>

                  {/* EMAIL */}
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                    <Label className="text-xs font-semibold text-pink-700 mb-2 block flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      EMAIL
                    </Label>
                    <p className="text-slate-900 font-semibold text-sm break-all">{employee.email || "Non renseigné"}</p>
                  </div>

                  {/* DATE DE NAISSANCE */}
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                    <Label className="text-xs font-semibold text-pink-700 mb-2 block flex items-center gap-1">
                      <Cake className="w-3.5 h-3.5" />
                      DATE DE NAISSANCE
                    </Label>
                    <p className="text-slate-900 font-semibold">
                      {employee.birth_date ? format(new Date(employee.birth_date), "dd/MM/yyyy") : "Non renseigné"}
                    </p>
                  </div>

                  {/* TÉLÉPHONE */}
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                    <Label className="text-xs font-semibold text-pink-700 mb-2 block flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      TÉLÉPHONE
                    </Label>
                    <p className="text-slate-900 font-semibold">{employee.phone || "Non renseigné"}</p>
                  </div>
                </div>

                {/* Type de stage */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                    <Label className="text-sm font-semibold text-pink-700 mb-2 block">Type de Stage</Label>
                    <p className="text-slate-900 font-semibold">{employee.internship_type || "Non renseigné"}</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert className={`${
              message.type === "success" 
                ? "bg-green-50 border-green-300 text-green-900" 
                : "bg-red-50 border-red-300 text-red-900"
            } rounded-2xl`}>
              <AlertDescription className="font-semibold">{message.text}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-2xl border-0 bg-white overflow-hidden">
            {/* Header avec bannière bleue */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-24 md:h-32 relative">
              <div className="absolute top-4 right-4 md:top-6 md:right-8">
                <p className="text-white/90 text-sm md:text-base font-medium">{formatPosition(employee.position)}</p>
              </div>
              <div className="absolute -bottom-12 md:-bottom-16 left-4 md:left-8 flex items-end gap-4 md:gap-6">
                {/* Photo de profil */}
                <div className="relative">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600">
                    {employee.photo_url ? (
                      <img src={employee.photo_url} alt={employee.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-12 h-12 md:w-16 md:h-16 text-white" />
                      </div>
                    )}
                  </div>
                  {(employee.email?.toLowerCase() === currentUser?.email?.toLowerCase() || 
                    employee.employee_code === currentUser?.employee_code) && (
                    <label 
                      className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 md:p-2.5 cursor-pointer shadow-lg transition-colors"
                      title="Changer la photo de profil"
                    >
                      <Camera className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Informations principales */}
            <div className="pt-16 md:pt-20 px-4 md:px-8 pb-4 md:pb-6">
              <div className="mb-4 md:mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1 md:mb-2">{employee.full_name}</h1>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-purple-100 text-purple-700 text-xs md:text-sm px-2 md:px-3 py-1">
                    Code: {employee.employee_code}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700 text-xs md:text-sm px-2 md:px-3 py-1">
                    {departmentLabels[employee.department] || employee.department}
                  </Badge>
                  <Badge className={`text-xs md:text-sm px-2 md:px-3 py-1 ${employee.is_active ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-red-100 text-red-700 border-2 border-red-300'}`}>
                    {employee.is_active ? '✓ Actif' : '✗ Inactif'}
                  </Badge>
                  {employee.is_on_call && (
                    <Badge className="bg-red-100 text-red-700 border-2 border-red-300 text-xs md:text-sm px-2 md:px-3 py-1">
                      ⭐ Agent en Astreinte
                    </Badge>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-slate-200 mb-4 md:mb-6">
                <div className="flex justify-around md:justify-start md:gap-1">
                  {[
                    { id: "info", label: "Infos", icon: User },
                    { id: "documents", label: "Documents", icon: FileText },
                    { id: "formations", label: "Formations", icon: Award },
                    { id: "evaluations", label: "Évaluations", icon: CheckCircle }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      title={tab.label}
                      className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 md:px-6 py-2 md:py-3 border-b-2 transition-colors flex-1 md:flex-none ${
                        activeTab === tab.id
                          ? "border-blue-600 text-blue-600 font-semibold"
                          : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <tab.icon className="w-5 h-5 md:w-4 md:h-4" />
                      <span className="text-xs md:text-base">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

            {/* Tab Content */}
            <div className="mt-4 md:mt-6">
              {activeTab === "info" && (
                  <Card className="shadow-lg border-slate-200">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
                        <h2 className="text-lg md:text-xl font-bold text-slate-900">Informations Personnelles</h2>
                        {!editMode ? (
                          <Button onClick={() => setEditMode(true)} variant="outline" size="sm" className="rounded-xl w-full sm:w-auto">
                            <Edit2 className="w-4 h-4 mr-2" />
                            Modifier
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button onClick={handleSaveProfile} size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-xl flex-1 sm:flex-none">
                              Enregistrer
                            </Button>
                            <Button onClick={() => setEditMode(false)} variant="outline" size="sm" className="rounded-xl flex-1 sm:flex-none">
                              Annuler
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Email */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <Label className="flex items-center gap-2 text-slate-600 text-xs font-medium mb-2">
                            <Mail className="w-4 h-4" />
                            Email
                          </Label>
                          {editMode && currentUser?.role === 'admin' ? (
                            <Input
                              value={editData.email}
                              onChange={(e) => setEditData({...editData, email: e.target.value})}
                              className="rounded-xl"
                            />
                          ) : (
                            <p className="font-semibold text-slate-900 text-base">{employee.email || "Non renseigné"}</p>
                          )}
                        </div>

                        {/* Téléphone */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <Label className="flex items-center gap-2 text-slate-600 text-xs font-medium mb-2">
                            <Phone className="w-4 h-4" />
                            Téléphone
                          </Label>
                          {editMode ? (
                            <Input
                              value={editData.phone}
                              onChange={(e) => setEditData({...editData, phone: e.target.value})}
                              className="rounded-xl"
                            />
                          ) : (
                            <p className="font-semibold text-slate-900 text-base">{employee.phone || "Non renseigné"}</p>
                          )}
                        </div>

                        {/* Poste */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <Label className="flex items-center gap-2 text-slate-600 text-xs font-medium mb-2">
                            <Briefcase className="w-4 h-4" />
                            Poste
                          </Label>
                          <p className="font-semibold text-slate-900 text-base">{formatPosition(employee.position)}</p>
                        </div>

                        {/* Département */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <Label className="flex items-center gap-2 text-slate-600 text-xs font-medium mb-2">
                            <Building2 className="w-4 h-4" />
                            Département
                          </Label>
                          <p className="font-semibold text-slate-900 text-base">
                            {departmentLabels[employee.department] || employee.department}
                          </p>
                        </div>

                        {/* Sexe */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <Label className="flex items-center gap-2 text-slate-600 text-xs font-medium mb-2">
                            <User className="w-4 h-4" />
                            Sexe
                          </Label>
                          {editMode ? (
                            <Select
                              value={editData.gender}
                              onValueChange={(value) => setEditData({...editData, gender: value})}
                            >
                              <SelectTrigger className="rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Homme">Homme</SelectItem>
                                <SelectItem value="Femme">Femme</SelectItem>
                                <SelectItem value="Non renseigné">Non renseigné</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="font-semibold text-slate-900 text-base">{employee.gender || "Non renseigné"}</p>
                          )}
                        </div>

                        {/* Date de naissance */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <Label className="flex items-center gap-2 text-slate-600 text-xs font-medium mb-2">
                            <Cake className="w-4 h-4" />
                            Date de naissance
                          </Label>
                          {editMode ? (
                            <Input
                              type="date"
                              value={editData.birth_date}
                              onChange={(e) => setEditData({...editData, birth_date: e.target.value})}
                              className="rounded-xl"
                            />
                          ) : (
                            <p className="font-semibold text-slate-900 text-base">
                              {employee.birth_date ? format(new Date(employee.birth_date), "dd/MM/yyyy") : "Non renseigné"}
                            </p>
                          )}
                        </div>

                        {/* Situation matrimoniale */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 md:col-span-2">
                          <Label className="flex items-center gap-2 text-slate-600 text-xs font-medium mb-2">
                            <Heart className="w-4 h-4" />
                            Situation matrimoniale
                          </Label>
                          {editMode ? (
                            <Select
                              value={editData.marital_status}
                              onValueChange={(value) => setEditData({...editData, marital_status: value})}
                            >
                              <SelectTrigger className="rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Célibataire">Célibataire</SelectItem>
                                <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                                <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                                <SelectItem value="Veuf(ve)">Veuf(ve)</SelectItem>
                                <SelectItem value="Non renseigné">Non renseigné</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="font-semibold text-slate-900 text-base">{employee.marital_status || "Non renseigné"}</p>
                          )}
                        </div>
                      </div>

                      {/* Contacts d'urgence */}
                      <div className="mt-6 pt-6 border-t border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            Contacts d'Urgence
                          </h3>
                          {editMode && (
                            <Button onClick={handleAddEmergencyContact} size="sm" variant="outline" className="rounded-xl">
                              <Plus className="w-4 h-4 mr-1" />
                              Ajouter
                            </Button>
                          )}
                        </div>
                        
                        {emergencyContacts.length === 0 ? (
                          <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-500 text-sm">Aucun contact d'urgence enregistré</p>
                            {editMode && (
                              <Button onClick={handleAddEmergencyContact} size="sm" className="mt-3 bg-red-600 hover:bg-red-700 rounded-xl">
                                <Plus className="w-4 h-4 mr-1" />
                                Ajouter un contact
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {emergencyContacts.map((contact, index) => (
                              <div key={index} className="bg-red-50 rounded-xl p-4 border border-red-200 relative">
                                {editMode && (
                                  <button
                                    onClick={() => handleRemoveEmergencyContact(index)}
                                    className="absolute top-2 right-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full p-1"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                                <div className="grid md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-sm text-red-700 font-medium">Nom</Label>
                                    {editMode ? (
                                      <Input
                                        value={contact.name}
                                        onChange={(e) => handleUpdateEmergencyContact(index, "name", e.target.value)}
                                        placeholder="Nom complet"
                                        className="rounded-xl border-red-300"
                                      />
                                    ) : (
                                      <p className="font-semibold text-slate-900">{contact.name || "Non renseigné"}</p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm text-red-700 font-medium">Lien de parenté</Label>
                                    {editMode ? (
                                      <Input
                                        value={contact.relationship}
                                        onChange={(e) => handleUpdateEmergencyContact(index, "relationship", e.target.value)}
                                        placeholder="Ex: Conjoint(e), Parent..."
                                        className="rounded-xl border-red-300"
                                      />
                                    ) : (
                                      <p className="font-semibold text-slate-900">{contact.relationship || "Non renseigné"}</p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm text-red-700 font-medium">Téléphone</Label>
                                    {editMode ? (
                                      <Input
                                        value={contact.phone}
                                        onChange={(e) => handleUpdateEmergencyContact(index, "phone", e.target.value)}
                                        placeholder="Ex: 07 12 34 56 78"
                                        className="rounded-xl border-red-300"
                                      />
                                    ) : (
                                      <p className="font-semibold text-slate-900 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-red-600" />
                                        {contact.phone || "Non renseigné"}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                        {employee.internship_type && (
                          <div className="mt-6 pt-6 border-t border-slate-200">
                            <h3 className="text-lg font-bold text-pink-900 mb-4">Informations du Stage</h3>
                            <div className="grid md:grid-cols-3 gap-6 bg-pink-50 rounded-xl p-4 border border-pink-200">
                              <div className="space-y-2">
                                <Label className="text-sm text-pink-700 font-medium">Type de Stage</Label>
                                <p className="font-semibold text-pink-900">
                                  {employee.internship_type || "Non renseigné"}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm text-pink-700 font-medium">Date de Début</Label>
                                <p className="font-semibold text-pink-900">
                                  {employee.internship_start_date 
                                    ? format(new Date(employee.internship_start_date), "dd/MM/yyyy")
                                    : "Non renseigné"}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm text-pink-700 font-medium">Date de Fin</Label>
                                <p className="font-semibold text-pink-900">
                                  {employee.internship_end_date 
                                    ? format(new Date(employee.internship_end_date), "dd/MM/yyyy")
                                    : "Non renseigné"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Suppression de compte : uniquement depuis Gestion du personnel (aucun libre-service, admins compris) */}

                        </CardContent>
                        </Card>
                        )}

                {activeTab === "documents" && (
                  <EmployeeDocuments
                    employeeId={employee.id}
                    documents={documents}
                    isAdmin={false}
                    onDocumentsChange={(newDocs) => {
                      setDocuments(newDocs);
                      loadData();
                    }}
                  />
                )}

                {activeTab === "formations" && (
                  <Card className="shadow-lg border-slate-200">
                    <CardContent className="p-4 md:p-6">
                      <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-4 md:mb-6">Mes Formations</h2>
                      {formations.length === 0 ? (
                        <div className="text-center py-12">
                          <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500">Aucune formation enregistrée</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {formations.map((formation, index) => (
                            <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 md:p-5 border border-blue-200">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                                <div className="flex-1">
                                  <h3 className="font-bold text-base md:text-lg text-slate-900">{formation.title}</h3>
                                  <p className="text-sm text-slate-600">{formation.organism}</p>
                                </div>
                                <Badge className="bg-blue-600 text-white self-start">{formation.duration_hours}h</Badge>
                              </div>
                              <p className="text-sm text-slate-700 mb-3">{formation.description}</p>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                                <span className="text-slate-600">
                                  Du {format(new Date(formation.start_date), "d MMM yyyy", { locale: fr })} 
                                  {" "}au {format(new Date(formation.end_date), "d MMM yyyy", { locale: fr })}
                                </span>
                                {formation.certificate_url && (
                                  <a
                                    href={safeUrl(formation.certificate_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    <Download className="w-4 h-4" />
                                    Certificat
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === "evaluations" && (
                  <Card className="shadow-lg border-slate-200">
                    <CardContent className="p-4 md:p-6">
                      <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-4 md:mb-6">Mes Évaluations</h2>
                      {evaluations.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500">Aucune évaluation enregistrée</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {evaluations.map((evaluation, index) => (
                            <div key={index} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 md:p-5 border border-purple-200">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                                <div className="flex-1">
                                  <h3 className="font-bold text-base md:text-lg text-slate-900">Période: {evaluation.period}</h3>
                                  <p className="text-xs md:text-sm text-slate-600">
                                    Évaluateur: {evaluation.evaluator} • {format(new Date(evaluation.date), "d MMMM yyyy", { locale: fr })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 bg-white rounded-xl px-3 md:px-4 py-1.5 md:py-2 shadow-sm self-start">
                                  <Award className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                                  <span className="font-bold text-lg md:text-xl text-slate-900">{evaluation.rating}/5</span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="bg-white rounded-xl p-4">
                                  <p className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Points Forts
                                  </p>
                                  <p className="text-sm text-slate-700">{evaluation.strengths}</p>
                                </div>
                                <div className="bg-white rounded-xl p-4">
                                  <p className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-2">
                                    <Award className="w-4 h-4" />
                                    Axes d'Amélioration
                                  </p>
                                  <p className="text-sm text-slate-700">{evaluation.improvements}</p>
                                </div>
                                <div className="bg-white rounded-xl p-4">
                                  <p className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                                    <Award className="w-4 h-4" />
                                    Objectifs
                                  </p>
                                  <p className="text-sm text-slate-700">{evaluation.goals}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
            </div>
          </div>
        </Card>
      </motion.div>
      </div>
    </div>
  );
}