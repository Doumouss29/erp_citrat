import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Calendar as CalendarIcon, Info, X } from "lucide-react";
import { motion } from "framer-motion";
import { calculateCalendarDays, isIndividualLeavePeriod, isCollectiveLeavePeriod } from "@/components/utils/calendarDays";
import { useWorkflowValidators, resolveLevel1Approver, isLevel1Validator } from "@/lib/workflowValidators";

export default function LeaveForm({ employees, currentUser, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    leave_period: "individuel",
    start_date: "",
    end_date: "",
    reason: ""
  });
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const validators = useWorkflowValidators();

  const currentEmployee = employees?.find(e => 
    e.email?.toLowerCase() === currentUser?.email?.toLowerCase() ||
    e.employee_code === currentUser?.employee_code
  );

  const availableYearDays = currentEmployee?.remaining_year_days ?? 15;
  const availableDecemberDays = currentEmployee?.remaining_december_days ?? 15;

  const yearDaysExhausted = availableYearDays <= 0;
  const decemberDaysExhausted = availableDecemberDays <= 0;

  // Calculer le nombre de jours calendaires (JC)
  const calendarDays = formData.start_date && formData.end_date 
    ? calculateCalendarDays(formData.start_date, formData.end_date) 
    : 0;

  // Validation des dates et de la période
  const validateLeavePeriod = () => {
    if (!formData.start_date || !formData.end_date) return null;

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);

    // Vérifier que la date de fin est après la date de début
    if (endDate < startDate) {
      return "La date de fin doit être après la date de début.";
    }

    // Congé maternité : pas de restriction particulière
    if (formData.leave_period === "maternite") {
      if (calendarDays > 90) {
        return "Le congé maternité est limité à 90 jours calendaires maximum.";
      }
      return null;
    }

    // Vérifier la cohérence avec la période sélectionnée
    if (formData.leave_period === "individuel") {
      // Congés individuels : Jan-Nov seulement (max 15 JC)
      if (!isIndividualLeavePeriod(formData.start_date) || !isIndividualLeavePeriod(formData.end_date)) {
        return "Les congés individuels doivent être posés entre Janvier et Novembre uniquement.";
      }
      if (calendarDays > 15) {
        return "Les congés individuels sont limités à 15 jours calendaires (JC) maximum.";
      }
      if (calendarDays > availableYearDays) {
        return `Vous demandez ${calendarDays} JC mais vous n'avez que ${availableYearDays} JC disponibles pour les congés individuels.`;
      }
    } else if (formData.leave_period === "collectif") {
      // Congés collectifs : Décembre uniquement (15 JC imposés)
      if (!isCollectiveLeavePeriod(formData.start_date) || !isCollectiveLeavePeriod(formData.end_date)) {
        return "Les congés collectifs doivent être posés en Décembre uniquement.";
      }
      if (calendarDays > availableDecemberDays) {
        return `Vous demandez ${calendarDays} JC mais vous n'avez que ${availableDecemberDays} JC disponibles pour Décembre.`;
      }
    }

    return null;
  };

  // Mettre à jour les erreurs de validation en temps réel
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const validationError = validateLeavePeriod();
      setError(validationError || "");
    }
  }, [formData.start_date, formData.end_date, formData.leave_period]);

  // Validateur Niveau 1 : résolu via la configuration (Administration → Validateurs)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setWarning("");

    if (!formData.start_date || !formData.end_date || !formData.reason.trim()) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const validationError = validateLeavePeriod();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (calendarDays <= 0) {
      setError("La période sélectionnée n'est pas valide.");
      return;
    }

    // Vérifier les chevauchements avec d'autres congés approuvés
    const allLeaves = await base44.entities.LeaveRequest.filter({ 
      employee_id: currentEmployee.id,
      status: "approved"
    });

    const hasOverlap = allLeaves.some(leave => {
      const leaveStart = new Date(leave.start_date);
      const leaveEnd = new Date(leave.end_date);
      const requestStart = new Date(formData.start_date);
      const requestEnd = new Date(formData.end_date);

      return (
        (requestStart >= leaveStart && requestStart <= leaveEnd) ||
        (requestEnd >= leaveStart && requestEnd <= leaveEnd) ||
        (requestStart <= leaveStart && requestEnd >= leaveEnd)
      );
    });

    if (hasOverlap) {
      setError("Cette période chevauche un congé déjà approuvé.");
      return;
    }

    // Déterminer le validateur Niveau 1 basé sur la localisation et le département
    const location = currentEmployee?.office || "Non spécifié";
    const employeeDepartment = currentEmployee?.department;
    const level1Approver = resolveLevel1Approver(validators, location, employeeDepartment, currentEmployee?.employee_code);

    // Calculer si la demande est urgente (<48h avant le début)
    const now = new Date();
    const start = new Date(formData.start_date);
    const hoursUntilStart = (start - now) / (1000 * 60 * 60);
    const isUrgent = hoursUntilStart < 48;

    const isValidatorSubmitting = isLevel1Validator(validators, currentUser);

    const leaveData = {
      employee_id: currentEmployee.id,
      employee_name: `${currentEmployee.first_name || ''} ${currentEmployee.last_name || ''}`.trim() || currentEmployee.full_name || currentUser?.email || "Non spécifié",
      employee_location: currentEmployee.office || "Non spécifié",
      leave_period: formData.leave_period,
      start_date: formData.start_date,
      end_date: formData.end_date,
      total_days: calendarDays,
      reason: formData.reason,
      is_urgent: isUrgent,
      // Workflow différent pour les validateurs L1: direct au DG
      status: isValidatorSubmitting ? "pending_level3" : "pending_level1",
      level1_approver: level1Approver.name,
      level1_approver_email: level1Approver.email,
      level1_status: isValidatorSubmitting ? "approved" : "pending",
      level1_date: isValidatorSubmitting ? new Date().toISOString() : null,
      level2_status: "pending",
      level3_status: "pending"
    };

    onSubmit(leaveData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-6"
    >
      <Card className="shadow-2xl border-0 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-6 relative">
          <CardTitle className="text-lg sm:text-2xl font-bold pr-10">Nouvelle Demande de Congé</CardTitle>
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900 font-semibold">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {warning && (
              <Alert className="bg-orange-50 border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  {warning}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Vos Soldes de Congés</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Carte Congés Annuels */}
                <div className={`rounded-xl p-4 sm:p-5 border-2 transition-all cursor-pointer hover:shadow-lg ${
                  formData.leave_period === "individuel" 
                    ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-400 shadow-lg" 
                    : "bg-white border-slate-200 hover:border-blue-300"
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-800">Congés Annuels 2026</span>
                    </div>
                  </div>
                  <div className="mb-3 flex items-baseline gap-2">
                    <div className="text-4xl font-bold text-blue-600">{availableYearDays}</div>
                    <div className="text-sm text-slate-600">/ 15 jours calendaires</div>
                  </div>
                  <div className="flex items-start gap-2 pt-3 border-t border-blue-200">
                    <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700 font-medium">Non Reportables • Janvier-Novembre uniquement</p>
                  </div>
                </div>

                {/* Carte Congés Collectifs Décembre */}
                <div className={`rounded-xl p-4 sm:p-5 border-2 transition-all cursor-pointer hover:shadow-lg ${
                  formData.leave_period === "collectif" 
                    ? "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-400 shadow-lg" 
                    : "bg-white border-slate-200 hover:border-purple-300"
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-800">Congés Collectifs Décembre</span>
                    </div>
                  </div>
                  <div className="mb-3 flex items-baseline gap-2">
                    <div className="text-4xl font-bold text-purple-600">{availableDecemberDays}</div>
                    <div className="text-sm text-slate-600">/ 15 jours calendaires</div>
                  </div>
                  <div className="flex items-start gap-2 pt-3 border-t border-purple-200">
                    <Info className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700 font-medium">
                      {currentEmployee?.is_on_call ? "Reportables sur janvier (astreinte)" : "Non reportables"}
                    </p>
                  </div>
                </div>

                {/* Carte Congé Maternité */}
                <div className={`rounded-xl p-4 sm:p-5 border-2 transition-all cursor-pointer hover:shadow-lg ${
                  formData.leave_period === "maternite" 
                    ? "bg-gradient-to-br from-pink-50 to-pink-100 border-pink-400 shadow-lg" 
                    : "bg-white border-slate-200 hover:border-pink-300"
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                        <span className="text-xl">♥</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">Congé Maternité</span>
                    </div>
                  </div>
                  <div className="mb-3 flex items-baseline gap-2">
                    <div className="text-4xl font-bold text-pink-600">90</div>
                    <div className="text-sm text-slate-600">/ 90 jours calendaires</div>
                  </div>
                  <div className="flex items-start gap-2 pt-3 border-t border-pink-200">
                    <Info className="w-4 h-4 text-pink-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700 font-medium">Non reportables</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="leave_period" className="text-sm sm:text-base font-semibold text-slate-700">
                Type de Congé *
              </Label>
              <Select
                value={formData.leave_period}
                onValueChange={(value) => {
                  setFormData({...formData, leave_period: value});
                  setError("");
                  setWarning("");
                }}
              >
                <SelectTrigger id="leave_period" className="h-11 sm:h-12 text-sm sm:text-base">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individuel" disabled={yearDaysExhausted}>
                    <div className="flex items-center justify-between w-full">
                      <span>Congés individuels (Jan-Nov)</span>
                      <span className={`ml-4 font-semibold ${yearDaysExhausted ? 'text-red-600' : 'text-blue-600'}`}>
                        {availableYearDays} JC
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="collectif" disabled={decemberDaysExhausted}>
                    <div className="flex items-center justify-between w-full">
                      <span>Congé collectif (Décembre)</span>
                      <span className={`ml-4 font-semibold ${decemberDaysExhausted ? 'text-red-600' : 'text-purple-600'}`}>
                        {availableDecemberDays} JC
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="maternite">
                    <div className="flex items-center justify-between w-full">
                      <span>Congé maternité 🤰</span>
                      <span className="ml-4 font-semibold text-pink-600">90 JC</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-sm sm:text-base font-semibold">Date de Début *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                  className="h-11 sm:h-12 text-sm sm:text-base"
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
                  className="h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>
            </div>

            {formData.start_date && formData.end_date && calendarDays > 0 && (
              <Alert className={`${formData.leave_period === "individuel" ? "bg-blue-50 border-blue-200" : formData.leave_period === "maternite" ? "bg-pink-50 border-pink-200" : "bg-purple-50 border-purple-200"}`}>
                <CalendarIcon className={`h-4 w-4 ${formData.leave_period === "individuel" ? "text-blue-600" : formData.leave_period === "maternite" ? "text-pink-600" : "text-purple-600"}`} />
                <AlertDescription className={formData.leave_period === "individuel" ? "text-blue-900" : formData.leave_period === "maternite" ? "text-pink-900" : "text-purple-900"}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Durée de la demande:</span>
                    <span className="text-lg font-bold">{calendarDays} jour(s) calendaire(s) (JC)</span>
                  </div>
                  <div className={`mt-2 pt-2 border-t ${formData.leave_period === "individuel" ? "border-blue-200 text-xs text-blue-700" : formData.leave_period === "maternite" ? "border-pink-200 text-xs text-pink-700" : "border-purple-200 text-xs text-purple-700"}`}>
                    Les congés sont comptabilisés en jours calendaires (du {new Date(formData.start_date).toLocaleDateString('fr-FR')} au {new Date(formData.end_date).toLocaleDateString('fr-FR')})
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Section Astreinte pour congés collectifs */}
            {formData.leave_period === "collectif" && currentEmployee?.is_on_call && (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="is_using_on_call"
                    checked={formData.is_using_on_call || false}
                    onChange={(e) => setFormData({...formData, is_using_on_call: e.target.checked})}
                    className="mt-1 w-5 h-5 rounded border-red-400 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <Label htmlFor="is_using_on_call" className="cursor-pointer font-bold text-red-900 text-base flex items-center gap-1">
                      ⭐ Jours d'Astreinte en Décembre
                    </Label>
                    <p className="text-xs text-red-700 mt-1">
                      Cochez si vous avez effectué des jours d'astreinte en décembre donnant droit au report
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm sm:text-base font-semibold">Motif de la Demande *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="Précisez le motif de votre demande de congé..."
                required
                rows={4}
                className="resize-none text-sm sm:text-base"
              />
            </div>
          </CardContent>
          <div className="p-4 sm:p-6 bg-slate-50 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="rounded-xl w-full sm:w-auto order-2 sm:order-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl w-full sm:w-auto order-1 sm:order-2"
            >
              Soumettre la Demande
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}