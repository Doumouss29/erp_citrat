import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, Check, X, MessageSquare, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { safeUrl } from "@/lib/safeUrl";

export default function AbsenceList({ absences, employees = [], loading, isHR, currentUser, onUpdateStatus, onDelete }) {
  // Fonction pour récupérer le nom complet de l'employé à partir de l'employee_id ou created_by
  const getEmployeeName = (absence) => {
    // D'abord chercher par employee_id
    let employee = employees.find(e => e.id === absence.employee_id);
    
    // Si pas trouvé, chercher par email
    const requesterEmail = absence.employee_email || absence.created_by;
    if (!employee && requesterEmail) {
      employee = employees.find(e => 
        e.email?.toLowerCase() === requesterEmail.toLowerCase()
      );
    }
    
    // Retourner le nom complet de l'employé ou un fallback
    if (employee) {
      return `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || absence.employee_name || "Employé";
    }
    return absence.employee_name || "Employé";
  };
  const [reviewDialog, setReviewDialog] = useState(null);
  const [comment, setComment] = useState("");

  const statusColors = {
    pending_level1: "bg-yellow-100 text-yellow-800 border-yellow-300",
    pending_level2: "bg-orange-100 text-orange-800 border-orange-300",
    pending_level3: "bg-blue-100 text-blue-800 border-blue-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300"
  };

  const typeLabels = {
    maladie: "Maladie",
    accident_travail: "Accident du travail",
    mariage_travailleur: "Mariage du travailleur",
    mariage_enfant_frere_soeur: "Mariage enfant/frère/sœur",
    deces_conjoint: "Décès du conjoint",
    deces_enfant_pere_mere: "Décès enfant/père/mère",
    deces_frere_soeur: "Décès frère/sœur",
    deces_beau_parent: "Décès beau-parent",
    naissance_enfant: "Naissance d'un enfant",
    bapteme_enfant: "Baptême d'un enfant",
    premiere_communion: "Première communion",
    demenagement: "Déménagement",
    formation: "Formation",
    autre: "Autre"
  };

  const handleReview = (status) => {
    onUpdateStatus(reviewDialog.id, status, comment);
    setReviewDialog(null);
    setComment("");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i} className="shadow-xl border-0">
            <CardContent className="p-4 sm:p-6">
              <Skeleton className="h-16 sm:h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        <AnimatePresence>
          {absences.length === 0 ? (
            <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
              <CardContent className="p-8 sm:p-12 text-center">
                <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 text-base sm:text-lg">Aucune absence à afficher</p>
              </CardContent>
            </Card>
          ) : (
            absences.map((absence) => (
              <motion.div
                key={absence.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="border-b border-slate-100 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                          {getEmployeeName(absence)}
                        </CardTitle>
                        <p className="text-slate-500 mt-1 text-sm sm:text-base">
                          {typeLabels[absence.absence_type]}
                        </p>
                      </div>
                      <Badge className={`${statusColors[absence.status]} border-2 px-3 sm:px-4 py-1 text-xs sm:text-sm font-semibold shrink-0`}>
                        {absence.status === "pending_level1" && "⏳ Niveau 1"}
                        {absence.status === "pending_level2" && "⏳ Niveau 2 (RH)"}
                        {absence.status === "pending_level3" && "⏳ Niveau 3 (DG)"}
                        {absence.status === "approved" && "✅ Approuvée"}
                        {absence.status === "rejected" && "❌ Refusée"}
                        {absence.status === "pending" && "En attente"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">Période</p>
                        <p className="text-sm sm:text-base font-semibold text-slate-900 break-words">
                          {format(parseISO(absence.start_date), "d MMM yyyy", { locale: fr })} - {format(parseISO(absence.end_date), "d MMM yyyy", { locale: fr })}
                        </p>
                        {absence.total_days && (
                          <Badge className="mt-2 bg-orange-100 text-orange-700 text-xs">
                            {absence.total_days} jour{absence.total_days > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      {absence.justification_file_url && (
                        <div>
                          <p className="text-xs sm:text-sm text-slate-500 font-medium mb-2">Justificatif</p>
                          <a
                            href={safeUrl(absence.justification_file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm"
                          >
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                            <span className="truncate">Voir le document</span>
                          </a>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium mb-2">Motif</p>
                      <p className="text-slate-700 text-sm sm:text-base">{absence.reason}</p>
                    </div>

                    {/* Workflow de validation */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-3 sm:p-4 border border-slate-200">
                      <p className="text-xs font-bold text-slate-700 mb-4">PARCOURS DE VALIDATION</p>
                      
                      <div className="flex items-center justify-between gap-2 relative">
                        <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-300 -z-10" />
                        
                        {/* Niveau 1 */}
                        <div className="flex-1 flex flex-col items-center text-center">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 ${
                            absence.level1_status === "approved" ? "bg-green-500" :
                            absence.level1_status === "rejected" ? "bg-red-500" :
                            absence.status === "pending_level1" ? "bg-orange-500 animate-pulse" :
                            "bg-slate-300"
                          } shadow-lg`}>
                            {absence.level1_status === "approved" ? (
                              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            ) : absence.level1_status === "rejected" ? (
                              <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            ) : (
                              <span className="text-white font-bold text-sm sm:text-base">1</span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-900">Niveau 1</p>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {absence.level1_approver || "Non défini"}
                          </p>
                          {absence.level1_date && (
                            <p className="text-xs text-slate-500 mt-1">
                              {format(parseISO(absence.level1_date), "dd/MM HH:mm")}
                            </p>
                          )}
                        </div>

                        <div className="text-slate-400 text-xl">→</div>

                        {/* Niveau 2 */}
                        <div className="flex-1 flex flex-col items-center text-center">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 ${
                            absence.level2_status === "approved" ? "bg-green-500" :
                            absence.level2_status === "rejected" ? "bg-red-500" :
                            absence.status === "pending_level2" ? "bg-blue-500 animate-pulse" :
                            "bg-slate-300"
                          } shadow-lg`}>
                            {absence.level2_status === "approved" ? (
                              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            ) : absence.level2_status === "rejected" ? (
                              <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            ) : (
                              <span className="text-white font-bold text-sm sm:text-base">2</span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-900">Niveau 2 - RH</p>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            SIDIBE ABOUBACAR
                          </p>
                          {absence.level2_date && (
                            <p className="text-xs text-slate-500 mt-1">
                              {format(parseISO(absence.level2_date), "dd/MM HH:mm")}
                            </p>
                          )}
                        </div>

                        <div className="text-slate-400 text-xl">→</div>

                        {/* Niveau 3 */}
                        <div className="flex-1 flex flex-col items-center text-center">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 ${
                            absence.level3_status === "approved" ? "bg-green-500" :
                            absence.level3_status === "rejected" ? "bg-red-500" :
                            absence.status === "pending_level3" ? "bg-purple-500 animate-pulse" :
                            "bg-slate-300"
                          } shadow-lg`}>
                            {absence.level3_status === "approved" ? (
                              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            ) : absence.level3_status === "rejected" ? (
                              <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            ) : (
                              <span className="text-white font-bold text-sm sm:text-base">3</span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-900">Niveau 3 - DG</p>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            CITRAT
                          </p>
                          {absence.level3_date && (
                            <p className="text-xs text-slate-500 mt-1">
                              {format(parseISO(absence.level3_date), "dd/MM HH:mm")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Commentaires */}
                      {(absence.level1_comment || absence.level2_comment || absence.level3_comment) && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                          {absence.level1_comment && (
                            <div className="bg-white rounded-lg p-2">
                              <p className="text-xs font-semibold text-slate-700">Niveau 1:</p>
                              <p className="text-xs text-slate-600 italic">"{absence.level1_comment}"</p>
                            </div>
                          )}
                          {absence.level2_comment && (
                            <div className="bg-white rounded-lg p-2">
                              <p className="text-xs font-semibold text-slate-700">Niveau 2 (RH):</p>
                              <p className="text-xs text-slate-600 italic">"{absence.level2_comment}"</p>
                            </div>
                          )}
                          {absence.level3_comment && (
                            <div className="bg-white rounded-lg p-2">
                              <p className="text-xs font-semibold text-slate-700">Niveau 3 (DG):</p>
                              <p className="text-xs text-slate-600 italic">"{absence.level3_comment}"</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {isHR && (absence.status === "pending" || absence.status === "pending_level1" || absence.status === "pending_level2" || absence.status === "pending_level3") && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                        <Button
                          onClick={() => setReviewDialog(absence)}
                          className="flex-1 bg-green-600 hover:bg-green-700 rounded-xl h-10 sm:h-11 text-sm"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approuver
                        </Button>
                        <Button
                          onClick={() => setReviewDialog(absence)}
                          variant="destructive"
                          className="flex-1 rounded-xl h-10 sm:h-11 text-sm"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Refuser
                        </Button>
                      </div>
                    )}
                    {/* Seul le service RH peut supprimer une demande */}
                    {(absence.status === "pending" || absence.status?.startsWith("pending_")) && !isHR && (absence.employee_email || absence.created_by) === currentUser?.email && (
                      <p className="pt-3 border-t border-slate-100 mt-4 text-xs text-slate-500">
                        Pour modifier ou annuler cette demande, adressez-vous au service des Ressources Humaines.
                      </p>
                    )}
                    {(absence.status === "pending" || absence.status?.startsWith("pending_")) && isHR && (
                      <div className="pt-2 border-t border-slate-100 mt-4">
                        <Button
                          onClick={() => onDelete(absence.id)}
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl h-10 text-sm"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer la demande
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">Validation de l'Absence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-2">Commentaire (optionnel)</p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ajoutez un commentaire..."
                className="border-2 rounded-xl min-h-20 sm:min-h-24 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={() => handleReview("approved")}
              className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 rounded-xl h-10 sm:h-11 text-sm"
            >
              <Check className="w-4 h-4 mr-2" />
              Approuver
            </Button>
            <Button
              onClick={() => handleReview("rejected")}
              variant="destructive"
              className="w-full sm:flex-1 rounded-xl h-10 sm:h-11 text-sm"
            >
              <X className="w-4 h-4 mr-2" />
              Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}