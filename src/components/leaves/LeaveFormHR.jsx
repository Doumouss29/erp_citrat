import { submitRhRequest } from "@/lib/rhRequest";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Calendar as CalendarIcon, X, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { calculateCalendarDays, isIndividualLeavePeriod, isCollectiveLeavePeriod } from "@/components/utils/calendarDays";

export default function LeaveFormHR({ employees, initialEmployeeId, onClose, onSuccess }) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployeeId || "");
  const [formData, setFormData] = useState({
    leave_period: "individuel",
    start_date: "",
    end_date: "",
    reason: ""
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const availableYearDays = selectedEmployee?.remaining_year_days ?? 15;
  const availableDecemberDays = selectedEmployee?.remaining_december_days ?? 15;

  const calendarDays = formData.start_date && formData.end_date
    ? calculateCalendarDays(formData.start_date, formData.end_date)
    : 0;

  // Validateur Niveau 1 : résolu via la configuration (Administration → Validateurs)

  const validate = () => {
    if (!selectedEmployeeId) return "Veuillez sélectionner un collaborateur.";
    if (!formData.start_date || !formData.end_date) return "Veuillez renseigner les dates.";
    if (!formData.reason.trim()) return "Veuillez indiquer le motif.";
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    if (endDate < startDate) return "La date de fin doit être après la date de début.";
    if (calendarDays <= 0) return "La période sélectionnée n'est pas valide.";
    if (formData.leave_period === "individuel") {
      if (!isIndividualLeavePeriod(formData.start_date) || !isIndividualLeavePeriod(formData.end_date))
        return "Les congés individuels doivent être posés entre Janvier et Novembre.";
      if (calendarDays > availableYearDays)
        return `Solde insuffisant : ${availableYearDays} JC disponibles, ${calendarDays} JC demandés.`;
    } else if (formData.leave_period === "collectif") {
      if (!isCollectiveLeavePeriod(formData.start_date) || !isCollectiveLeavePeriod(formData.end_date))
        return "Les congés collectifs doivent être posés en Décembre.";
      if (calendarDays > availableDecemberDays)
        return `Solde insuffisant : ${availableDecemberDays} JC disponibles, ${calendarDays} JC demandés.`;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError("");
    setSubmitting(true);

    let newLeave;
    try {
      newLeave = await submitRhRequest("leave", formData, selectedEmployeeId);
    } catch (e) {
      setError(e.message || "Enregistrement impossible");
      return;
    } finally {
      setSubmitting(false);
    }
    onSuccess && onSuccess(newLeave);
    onClose();
  };

  // Filtre: uniquement les salariés actifs (non stagiaires)
  const activeEmployees = employees.sort((a, b) => {
    const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
    const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-lg max-h-[min(92vh,740px)] overflow-y-auto rounded-2xl"
      >
        <Card className="shadow-xl border border-[#D8E5E8] bg-white rounded-2xl overflow-hidden">
          <CardHeader className="bg-[#F2F7F8] text-[#0D5C66] px-4 py-3 pr-12 relative border-b border-[#D8E5E8]">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 shrink-0" />
              <CardTitle className="text-base sm:text-lg font-semibold leading-snug">Saisie Congé pour un Collaborateur</CardTitle>
            </div>
            <p className="text-[#667A82] text-xs mt-0.5">{activeEmployees.length} collaborateur{activeEmployees.length > 1 ? 's' : ''} disponible{activeEmployees.length > 1 ? 's' : ''}</p>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-2 right-2 w-9 h-9 hover:bg-[#E2ECEE] rounded-lg flex items-center justify-center"
            >
              <X className="w-5 h-5 text-[#0D5C66]" />
            </button>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-4 space-y-3.5">
              {error && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900 font-semibold">{error}</AlertDescription>
                </Alert>
              )}

              {/* Sélection collaborateur */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700">Collaborateur *</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Sélectionner le collaborateur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {`${emp.last_name} ${emp.first_name}`.trim()} — {emp.position || emp.office}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Soldes si collaborateur sélectionné */}
              {selectedEmployee && (
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#F2F7F8] rounded-xl border border-[#D8E5E8]">
                  <div className="text-center">
                    <div className="text-xl font-semibold text-[#0D5C66]">{availableYearDays}</div>
                    <div className="text-xs text-slate-600">JC Individuels restants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-[#0D5C66]">{availableDecemberDays}</div>
                    <div className="text-xs text-slate-600">JC Collectifs restants</div>
                  </div>
                </div>
              )}

              {/* Type de congé */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700">Type de Congé *</Label>
                <Select
                  value={formData.leave_period}
                  onValueChange={(v) => { setFormData({ ...formData, leave_period: v }); setError(""); }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individuel">Congés individuels (Jan-Nov)</SelectItem>
                    <SelectItem value="collectif">Congé collectif (Décembre)</SelectItem>
                    <SelectItem value="maternite">Congé maternité</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Date de Début *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Date de Fin *</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>

              {calendarDays > 0 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 font-semibold">
                    Durée : {calendarDays} jour(s) calendaire(s)
                  </AlertDescription>
                </Alert>
              )}

              {/* Motif */}
              <div className="space-y-1.5">
                <Label className="font-semibold">Motif *</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Précisez le motif..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </CardContent>

            <div className="px-4 py-3 bg-[#F2F7F8] border-t border-[#D8E5E8] flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#0D5C66] hover:bg-[#094A52] text-white rounded-xl"
              >
                {submitting ? "Envoi en cours..." : "Soumettre la Demande"}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}