import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Calendar, Plus, Upload, X, Trash2, Save } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
import { openSafeUrl } from "@/lib/safeUrl";
import { invalidateEmployees } from "@/lib/rhSession";

export default function EmployeeFormations({ employeeId, formations, onFormationsChange }) {
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    organism: "",
    start_date: "",
    end_date: "",
    duration_hours: "",
    certificate_url: "",
    description: ""
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, certificate_url: file_url });
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Erreur lors du téléchargement du fichier");
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.start_date || !formData.end_date) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSaving(true);
    try {
      const employee = await base44.entities.Employee.filter({ id: employeeId });
      if (employee.length === 0) {
        alert("Employé introuvable");
        setSaving(false);
        return;
      }

      const newFormation = {
        ...formData,
        duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : 0,
        created_date: new Date().toISOString()
      };

      const updatedFormations = [...(formations || []), newFormation];
      
      await base44.entities.Employee.update(employeeId, {
        formations: updatedFormations
      }); invalidateEmployees();

      onFormationsChange(updatedFormations);
      setFormData({
        title: "",
        organism: "",
        start_date: "",
        end_date: "",
        duration_hours: "",
        certificate_url: "",
        description: ""
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error saving formation:", error);
      alert("Erreur lors de l'enregistrement de la formation");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (deleteId === null) return;

    try {
      // Récupérer les formations actuelles
      const employee = await base44.entities.Employee.filter({ id: employeeId });
      if (employee.length === 0) {
        alert("Employé introuvable");
        setDeleteId(null);
        return;
      }

      const currentFormations = employee[0].formations || [];
      const updatedFormations = currentFormations.filter((_, index) => index !== deleteId);
      
      await base44.entities.Employee.update(employeeId, {
        formations: updatedFormations
      }); invalidateEmployees();

      onFormationsChange(updatedFormations);
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting formation:", error);
      alert("Erreur lors de la suppression de la formation");
      setDeleteId(null);
    }
  };

  const sortedFormations = [...(formations || [])].sort((a, b) => 
    new Date(b.start_date) - new Date(a.start_date)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 flex-1">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-8 h-8 md:w-10 md:h-10 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs md:text-sm text-slate-600 font-semibold">Total Formations</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-900">{sortedFormations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl h-auto py-3 md:py-4 px-4 md:px-6 w-full sm:w-auto whitespace-nowrap"
        >
          {showForm ? <X className="w-4 h-4 md:w-5 md:h-5 mr-2" /> : <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />}
          {showForm ? "Annuler" : "Ajouter Formation"}
        </Button>
      </div>

      {showForm && (
        <Card className="shadow-xl border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4 md:p-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              Nouvelle Formation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="font-semibold text-sm">Titre de la formation *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Gestion de projet"
                    required
                    className="rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organism" className="font-semibold text-sm">Organisme de formation</Label>
                  <Input
                    id="organism"
                    value={formData.organism}
                    onChange={(e) => setFormData({ ...formData, organism: e.target.value })}
                    placeholder="Ex: AFPA"
                    className="rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="font-semibold text-sm">Date de début *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className="rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date" className="font-semibold text-sm">Date de fin *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    className="rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_hours" className="font-semibold text-sm">Durée (heures)</Label>
                  <Input
                    id="duration_hours"
                    type="number"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                    placeholder="Ex: 35"
                    className="rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certificate" className="font-semibold text-sm">Certificat / Attestation</Label>
                  <div className="flex gap-2">
                    <Input
                      id="certificate"
                      type="file"
                      onChange={handleFileUpload}
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={uploading}
                      className="rounded-xl border-2"
                    />
                    {formData.certificate_url && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openSafeUrl(formData.certificate_url)}
                        className="rounded-xl flex-shrink-0"
                      >
                        Voir
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="font-semibold text-sm">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Contenu de la formation, compétences acquises..."
                  className="rounded-xl border-2 h-24"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl w-full sm:w-auto"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={saving || uploading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {sortedFormations.length === 0 ? (
        <Card className="shadow-lg">
          <CardContent className="p-8 md:p-12 text-center">
            <GraduationCap className="w-16 h-16 md:w-20 md:h-20 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-base md:text-lg font-medium">Aucune formation enregistrée</p>
            <p className="text-slate-400 text-sm mt-2">
              Cliquez sur "Ajouter Formation" pour commencer
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedFormations.map((formation, index) => (
            <Card key={index} className="hover:shadow-xl transition-all border-2 border-slate-100">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base md:text-lg text-slate-900 mb-2 break-words">{formation.title}</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {formation.organism && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            {formation.organism}
                          </Badge>
                        )}
                        {formation.duration_hours > 0 && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                            {formation.duration_hours}h
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600 mb-3">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="break-words">
                          {format(new Date(formation.start_date), "dd/MM/yyyy", { locale: fr })} - {format(new Date(formation.end_date), "dd/MM/yyyy", { locale: fr })}
                        </span>
                      </div>
                      {formation.description && (
                        <p className="text-xs md:text-sm text-slate-600 bg-slate-50 p-3 rounded-lg break-words">
                          {formation.description}
                        </p>
                      )}
                      {formation.certificate_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSafeUrl(formation.certificate_url)}
                          className="mt-3 rounded-xl text-xs md:text-sm"
                        >
                          <Upload className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                          Voir le certificat
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(index)}
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

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette formation ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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