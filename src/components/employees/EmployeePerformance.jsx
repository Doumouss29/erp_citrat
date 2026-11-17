import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Trash2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
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
import { invalidateEmployees } from "@/lib/rhSession";

export default function EmployeePerformance({ employeeId, evaluations = [], onEvaluationsChange }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    period: "",
    rating: 3,
    strengths: "",
    improvements: "",
    goals: "",
    evaluator: ""
  });
  const [deleteDialog, setDeleteDialog] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newEvaluation = {
      ...formData,
      created_date: new Date().toISOString()
    };
    
    const updatedEvaluations = [...evaluations, newEvaluation];
    await base44.entities.Employee.update(employeeId, {
      evaluations: updatedEvaluations
    }); invalidateEmployees();
    
    onEvaluationsChange(updatedEvaluations);
    setShowForm(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      period: "",
      rating: 3,
      strengths: "",
      improvements: "",
      goals: "",
      evaluator: ""
    });
  };

  const handleDelete = async (index) => {
    const updatedEvaluations = evaluations.filter((_, i) => i !== index);
    await base44.entities.Employee.update(employeeId, {
      evaluations: updatedEvaluations
    }); invalidateEmployees();
    onEvaluationsChange(updatedEvaluations);
    setDeleteDialog(null);
  };

  const ratingColors = {
    1: "bg-red-100 text-red-700",
    2: "bg-orange-100 text-orange-700",
    3: "bg-yellow-100 text-yellow-700",
    4: "bg-blue-100 text-blue-700",
    5: "bg-green-100 text-green-700"
  };

  const ratingLabels = {
    1: "À améliorer",
    2: "Satisfaisant",
    3: "Bon",
    4: "Très bon",
    5: "Excellent"
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 flex-1">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 md:w-10 md:h-10 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs md:text-sm text-slate-600 font-semibold">Total Évaluations</p>
                <p className="text-2xl md:text-3xl font-bold text-purple-900">{evaluations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl h-auto py-3 md:py-4 px-4 md:px-6 w-full sm:w-auto whitespace-nowrap"
        >
          {showForm ? <X className="w-4 h-4 md:w-5 md:h-5 mr-2" /> : <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />}
          {showForm ? "Annuler" : "Ajouter Évaluation"}
        </Button>
      </div>

      {showForm && (
        <Card className="shadow-xl border-2 border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4 md:p-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Star className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
              Nouvelle Évaluation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eval_date" className="text-sm font-semibold">Date de l'évaluation *</Label>
                  <Input
                    id="eval_date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                    className="mt-2 rounded-xl border-2"
                  />
                </div>
                <div>
                  <Label htmlFor="eval_period" className="text-sm font-semibold">Période évaluée *</Label>
                  <Input
                    id="eval_period"
                    value={formData.period}
                    onChange={(e) => setFormData({...formData, period: e.target.value})}
                    placeholder="Ex: Année 2024"
                    required
                    className="mt-2 rounded-xl border-2"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="eval_rating" className="text-sm font-semibold">Note globale * (1-5)</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({...formData, rating})}
                      className={`rounded-xl ${formData.rating === rating ? ratingColors[rating] : 'bg-slate-100 text-slate-600'}`}
                      variant={formData.rating === rating ? "default" : "outline"}
                    >
                      <Star className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      {rating}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="eval_strengths" className="text-sm font-semibold">Points forts</Label>
                <Textarea
                  id="eval_strengths"
                  value={formData.strengths}
                  onChange={(e) => setFormData({...formData, strengths: e.target.value})}
                  className="mt-2 rounded-xl border-2 h-24"
                  placeholder="Les forces et qualités de l'employé..."
                />
              </div>
              <div>
                <Label htmlFor="eval_improvements" className="text-sm font-semibold">Points à améliorer</Label>
                <Textarea
                  id="eval_improvements"
                  value={formData.improvements}
                  onChange={(e) => setFormData({...formData, improvements: e.target.value})}
                  className="mt-2 rounded-xl border-2 h-24"
                  placeholder="Les axes d'amélioration..."
                />
              </div>
              <div>
                <Label htmlFor="eval_goals" className="text-sm font-semibold">Objectifs pour la prochaine période</Label>
                <Textarea
                  id="eval_goals"
                  value={formData.goals}
                  onChange={(e) => setFormData({...formData, goals: e.target.value})}
                  className="mt-2 rounded-xl border-2 h-24"
                  placeholder="Les objectifs à atteindre..."
                />
              </div>
              <div>
                <Label htmlFor="eval_evaluator" className="text-sm font-semibold">Évaluateur</Label>
                <Input
                  id="eval_evaluator"
                  value={formData.evaluator}
                  onChange={(e) => setFormData({...formData, evaluator: e.target.value})}
                  placeholder="Nom de l'évaluateur"
                  className="mt-2 rounded-xl border-2"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl w-full sm:w-auto">
                  Annuler
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl w-full sm:w-auto">
                  Enregistrer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {evaluations.length === 0 ? (
        <Card className="shadow-lg">
          <CardContent className="p-8 md:p-12 text-center">
            <Star className="w-16 h-16 md:w-20 md:h-20 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-base md:text-lg font-medium">Aucune évaluation enregistrée</p>
            <p className="text-slate-400 text-sm mt-2">
              Cliquez sur "Ajouter Évaluation" pour commencer
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {evaluations
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((evaluation, index) => (
              <Card key={index} className="hover:shadow-xl transition-all border-2 border-slate-100">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                        <Star className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base md:text-lg text-slate-900 mb-2 break-words">{evaluation.period}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge className={`${ratingColors[evaluation.rating]} text-xs`}>
                            <Star className="w-3 h-3 mr-1" />
                            {evaluation.rating}/5 - {ratingLabels[evaluation.rating]}
                          </Badge>
                          {evaluation.evaluator && (
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs">
                              Par {evaluation.evaluator}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs md:text-sm text-slate-600 mb-3">
                          📅 {new Date(evaluation.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        {evaluation.strengths && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-green-700 mb-1">✓ Points forts</p>
                            <p className="text-xs md:text-sm text-slate-700 bg-green-50 p-3 rounded-lg break-words">{evaluation.strengths}</p>
                          </div>
                        )}
                        {evaluation.improvements && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-orange-700 mb-1">⚠ Points à améliorer</p>
                            <p className="text-xs md:text-sm text-slate-700 bg-orange-50 p-3 rounded-lg break-words">{evaluation.improvements}</p>
                          </div>
                        )}
                        {evaluation.goals && (
                          <div>
                            <p className="text-xs font-semibold text-blue-700 mb-1">🎯 Objectifs</p>
                            <p className="text-xs md:text-sm text-slate-700 bg-blue-50 p-3 rounded-lg break-words">{evaluation.goals}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteDialog(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <AlertDialog open={deleteDialog !== null} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'évaluation</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette évaluation ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteDialog)}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}