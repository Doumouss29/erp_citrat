import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { X, Save, Upload, FileText, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { calculateWorkingDays, getNonWorkingDays } from "@/components/utils/workingDays";
import { useWorkflowValidators, resolveLevel1Approver, isLevel1Validator } from "@/lib/workflowValidators";
import { safeUrl } from "@/lib/safeUrl";

const ABSENCE_DURATIONS = {
  "mariage_travailleur": 4,
  "mariage_enfant_frere_soeur": 2,
  "deces_conjoint": 5,
  "deces_enfant_pere_mere": 5,
  "deces_frere_soeur": 3,
  "deces_beau_parent": 2,
  "naissance_enfant": 2,
  "bapteme_enfant": 1,
  "premiere_communion": 1,
  "demenagement": 1
};

export default function AbsenceForm({ employees, currentUser, onSubmit, onCancel }) {
  const validators = useWorkflowValidators();
  const [formData, setFormData] = useState({
    absence_type: "maladie",
    start_date: "",
    end_date: "",
    reason: "",
    justification_file_url: ""
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const employee = employees.find(e => 
    e.email?.toLowerCase() === currentUser?.email?.toLowerCase() ||
    e.employee_code === currentUser?.employee_code
  );
  
  const workingDays = formData.start_date && formData.end_date 
    ? calculateWorkingDays(formData.start_date, formData.end_date) 
    : 0;
    
  const nonWorkingDays = formData.start_date && formData.end_date 
    ? getNonWorkingDays(formData.start_date, formData.end_date) 
    : [];

  const requiredDays = ABSENCE_DURATIONS[formData.absence_type];
  const hasFixedDuration = requiredDays !== undefined;
  
  const requiresJustification = ["maladie", "accident_travail", "formation"].includes(formData.absence_type);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setFileName(file.name);
    
    // Simulation de progression
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadProgress(100);
      setFormData({ ...formData, justification_file_url: file_url });
    } catch (error) {
      clearInterval(progressInterval);
      alert("Erreur lors du téléchargement du fichier");
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // Validateur Niveau 1 : résolu via la configuration (Administration → Validateurs)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Valider la durée pour les types avec durée fixe
    if (hasFixedDuration && workingDays !== requiredDays) {
      setError(`Ce type d'absence nécessite exactement ${requiredDays} jour(s) ouvrable(s). Actuellement sélectionné : ${workingDays} jour(s).`);
      return;
    }
    
    // Vérifier le plafond de 10 jours d'absence par an
    const absenceDaysUsed = employee?.absence_days_used || 0;
    const totalAfterRequest = absenceDaysUsed + workingDays;
    
    if (totalAfterRequest > 10) {
      const remainingAbsenceDays = 10 - absenceDaysUsed;
      setError(`Cette demande dépasse le plafond autorisé. Vous avez déjà utilisé ${absenceDaysUsed} jour(s) d'absence sur les 10 autorisés par an. Il vous reste ${remainingAbsenceDays} jour(s) disponible(s). Cette demande demande ${workingDays} jour(s), ce qui dépasserait la limite.`);
      return;
    }
    
    // Valider le justificatif obligatoire
    if (requiresJustification && !formData.justification_file_url) {
      setError("Un justificatif est obligatoire pour ce type d'absence.");
      return;
    }

    // Vérification des chevauchements avec absences/congés déjà approuvés
    try {
      const [approvedAbsences, approvedLeaves] = await Promise.all([
        base44.entities.Absence.filter({ 
          employee_id: employee?.id,
          status: "approved" 
        }),
        base44.entities.LeaveRequest.filter({ 
          employee_id: employee?.id,
          status: "approved" 
        })
      ]);

      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);

      const hasAbsenceOverlap = approvedAbsences.some(absence => {
        const absenceStart = new Date(absence.start_date);
        const absenceEnd = new Date(absence.end_date);
        return (startDate <= absenceEnd && endDate >= absenceStart);
      });

      const hasLeaveOverlap = approvedLeaves.some(leave => {
        const leaveStart = new Date(leave.start_date);
        const leaveEnd = new Date(leave.end_date);
        return (startDate <= leaveEnd && endDate >= leaveStart);
      });

      if (hasAbsenceOverlap || hasLeaveOverlap) {
        setError("Ces dates chevauchent avec des absences ou congés déjà approuvés. Veuillez sélectionner d'autres dates.");
        return;
      }
    } catch (error) {
      console.error("Erreur vérification chevauchements:", error);
    }
    
    const location = employee?.office || employee?.department || "Abidjan";
    const employeeDepartment = employee?.department;
    const level1Approver = resolveLevel1Approver(validators, location, employeeDepartment, employee?.employee_code);
    const isValidatorSubmitting = isLevel1Validator(validators, currentUser);

    const employeeName = employee 
      ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
      : currentUser?.full_name || "";

    onSubmit({
      ...formData,
      employee_id: employee?.id || "",
      employee_name: employeeName,
      employee_location: location,
      total_days: workingDays,
      level1_approver: level1Approver.name,
      level1_approver_email: level1Approver.email,
      status: isValidatorSubmitting ? "pending_level3" : "pending_level1",
      level1_status: isValidatorSubmitting ? "approved" : "pending",
      level1_date: isValidatorSubmitting ? new Date().toISOString() : null,
      level2_status: "pending",
      level3_status: "pending"
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-4 sm:mb-6 lg:mb-8"
    >
      <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 sm:p-6 lg:p-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold">Déclarer une Absence</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="text-white hover:bg-white/20 rounded-xl shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-4 sm:p-6 lg:p-8 space-y-3 sm:space-y-4 lg:space-y-6">
            {error && (
              <div className="bg-red-50 rounded-xl p-3 sm:p-4 border border-red-200">
                <p className="text-xs sm:text-sm font-semibold text-red-700">{error}</p>
              </div>
            )}

            {employee && (
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 sm:p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                  <span className="text-xs font-medium text-slate-600">Solde Absences Annuel</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{10 - (employee.absence_days_used || 0)}</p>
                <p className="text-xs text-slate-500 mt-1">sur 10 jours autorisés</p>
              </div>
            )}

            {workingDays > 0 && (
              <div className={`rounded-xl p-3 sm:p-4 border ${
                hasFixedDuration && workingDays !== requiredDays
                  ? 'bg-red-50 border-red-200'
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Calendar className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    hasFixedDuration && workingDays !== requiredDays ? 'text-red-600' : 'text-orange-600'
                  }`} />
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">
                    Durée : {workingDays} jour(s) ouvré(s)
                    {hasFixedDuration && ` (requis: ${requiredDays} jour(s))`}
                  </span>
                </div>
                {nonWorkingDays.length > 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    {nonWorkingDays.length} jour(s) non-ouvré(s) exclus (weekends/jours fériés)
                  </p>
                )}
                {hasFixedDuration && workingDays !== requiredDays && (
                  <p className="text-xs text-red-600 mt-2 font-semibold">
                    ⚠️ Veuillez ajuster les dates pour respecter la durée réglementaire
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <div className="space-y-2">
                <Label htmlFor="absence_type" className="text-sm sm:text-base font-semibold">Type d'Absence *</Label>
                <Select
                  value={formData.absence_type}
                  onValueChange={(value) => setFormData({...formData, absence_type: value})}
                >
                  <SelectTrigger className="border-2 rounded-xl h-11 sm:h-12">
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5} className="z-[9999] max-h-[400px]">
                    <div className="px-2 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Santé</div>
                    <SelectItem value="maladie" className="pl-6">
                      <div className="flex items-center gap-2">
                        <span>Maladie</span>
                        <span className="text-xs text-orange-600 font-semibold ml-auto">📄 Justificatif requis</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="accident_travail" className="pl-6">
                      <div className="flex items-center gap-2">
                        <span>Accident du travail</span>
                        <span className="text-xs text-orange-600 font-semibold ml-auto">📄 Justificatif requis</span>
                      </div>
                    </SelectItem>

                    <div className="px-2 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide border-t mt-1 pt-2">Événements Familiaux</div>
                    <SelectItem value="mariage_travailleur" className="pl-6">
                      <div className="flex items-center justify-between w-full">
                        <span>Mariage du travailleur</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold ml-2">4j</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="mariage_enfant_frere_soeur" className="pl-6">
                      <div className="flex items-center justify-between w-full">
                        <span>Mariage enfant/frère/sœur</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold ml-2">2j</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="naissance_enfant" className="pl-6">
                      <div className="flex items-center justify-between w-full">
                        <span>Naissance d'un enfant</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold ml-2">2j</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="bapteme_enfant" className="pl-6">
                      <div className="flex items-center justify-between w-full">
                        <span>Baptême d'un enfant</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold ml-2">1j</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="premiere_communion" className="pl-6">
                      <div className="flex items-center justify-between w-full">
                        <span>Première communion</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold ml-2">1j</span>
                      </div>
                    </SelectItem>

                    <div className="px-2 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide border-t mt-1 pt-2">Décès</div>
                    <SelectItem value="deces_conjoint" className="pl-6">
                      <div className="flex items-center justify-between w-full">
                        <span>Décès du conjoint</span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold ml-2">5j</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="deces_enfant_pere_mere" className="pl-6">
                      <div className="flex items-center justify-between w-full">
                        <span>Décès enfant/père/mère</span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold ml-2">5j</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="deces_frere_soeur" className="pl-6">
                      <div className="flex items-center justify-between w-full">
                        <span>Décès frère/sœur</span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold ml-2">3j</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="deces_beau_parent" className="pl-6">
                      <div className="flex items-center justify-between w-full">
                        <span>Décès beau-parent</span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold ml-2">2j</span>
                      </div>
                    </SelectItem>

                    <div className="px-2 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide border-t mt-1 pt-2">Autres</div>
                    <SelectItem value="demenagement" className="pl-6">
                      <div className="flex items-center justify-between w-full">
                        <span>Déménagement</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold ml-2">1j</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="formation" className="pl-6">
                      <div className="flex items-center gap-2">
                        <span>Formation</span>
                        <span className="text-xs text-orange-600 font-semibold ml-auto">📄 Justificatif requis</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="autre" className="pl-6">
                      <span>Autre</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-sm sm:text-base font-semibold">Date de Début *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                  className="border-2 rounded-xl h-11 sm:h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date" className="text-sm sm:text-base font-semibold">Date de Fin *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  required
                  className="border-2 rounded-xl h-11 sm:h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file" className="text-sm sm:text-base font-semibold">
                  Justificatif {requiresJustification && <span className="text-red-600">*</span>}
                </Label>
                <div className="space-y-3">
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file')?.click()}
                    disabled={uploading}
                    className="w-full h-11 sm:h-12 border-2 rounded-xl text-sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    <span className="truncate">{uploading ? "Téléchargement..." : fileName || "Choisir un fichier"}</span>
                  </Button>
                  
                  {uploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-center text-slate-500">{uploadProgress}%</p>
                    </div>
                  )}
                  
                  {formData.justification_file_url && !uploading && (
                    <a
                      href={safeUrl(formData.justification_file_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs sm:text-sm text-blue-600 hover:text-blue-800"
                    >
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                      Voir le fichier
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm sm:text-base font-semibold">Motif</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                className="border-2 rounded-xl min-h-24 sm:min-h-32 text-sm sm:text-base"
                placeholder="Décrivez le motif de votre absence..."
              />
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 p-4 sm:p-6 flex flex-col sm:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full sm:w-auto rounded-xl h-11 sm:h-12 px-4 sm:px-6 order-2 sm:order-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl h-11 sm:h-12 px-4 sm:px-6 order-1 sm:order-2"
            >
              <Save className="w-4 h-4 mr-2" />
              Soumettre
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}