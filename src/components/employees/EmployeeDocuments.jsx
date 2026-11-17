import { FormSelect } from "@/components/ui/form-select";
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, Download, Trash2, Loader2 } from "lucide-react";
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

export default function EmployeeDocuments({ employeeId, documents = [], onDocumentsChange, isAdmin = false }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("contrat");
  const [deleteDialog, setDeleteDialog] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !documentName.trim()) {
      alert("Veuillez sélectionner un fichier et entrer un nom");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
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
      
      const newDocument = {
        name: documentName,
        type: documentType,
        url: file_url,
        uploaded_date: new Date().toISOString(),
        file_name: file.name
      };

      const updatedDocuments = [...documents, newDocument];
      await base44.entities.Employee.update(employeeId, {
        documents: updatedDocuments
      }); invalidateEmployees();
      
      onDocumentsChange(updatedDocuments);
      setDocumentName("");
      e.target.value = "";
    } catch (error) {
      clearInterval(progressInterval);
      alert("Erreur lors du téléchargement");
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleDelete = async (index) => {
    const updatedDocuments = documents.filter((_, i) => i !== index);
    await base44.entities.Employee.update(employeeId, {
      documents: updatedDocuments
    }); invalidateEmployees();
    onDocumentsChange(updatedDocuments);
    setDeleteDialog(null);
  };

  const documentTypes = {
    contrat: { label: "CONTRAT DE TRAVAIL", color: "bg-blue-100 text-blue-700", borderColor: "border-blue-500" },
    prevoyance: { label: "PRÉVOYANCE (CNPS)", color: "bg-green-100 text-green-700", borderColor: "border-green-500" },
    fiche_paie: { label: "FICHE DE PAIE", color: "bg-purple-100 text-purple-700", borderColor: "border-purple-500" },
    Mutuelle: { label: "MUTUELLE", color: "bg-emerald-100 text-emerald-700", borderColor: "border-emerald-500" },
    Mission: { label: "MISSION", color: "bg-rose-100 text-rose-700", borderColor: "border-rose-500" },
    autre: { label: "AUTRE", color: "bg-slate-100 text-slate-700", borderColor: "border-slate-500" }
  };

  // Grouper les documents par type réel
  const groupedDocuments = documents.reduce((acc, doc) => {
    const type = doc.type || "autre";
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              Ajouter un document
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="doc_name">Nom du document *</Label>
                <Input
                  id="doc_name"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Ex: Contrat CDI - 2024"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="doc_type">Type de document</Label>
                <FormSelect
                  id="doc_type"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full mt-2 h-10 px-3 border border-slate-300 rounded-xl"
                >
                  {Object.entries(documentTypes).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <Label htmlFor="doc_file" className="cursor-pointer">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-500 hover:bg-indigo-50/50 transition-colors">
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-indigo-600 mx-auto mb-2 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    )}
                    <p className="text-sm text-slate-600">
                      {uploading ? "Téléchargement en cours..." : "Cliquez pour sélectionner un fichier"}
                    </p>
                  </div>
                </Label>
                <Input
                  id="doc_file"
                  type="file"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
                
                {uploading && (
                  <div className="mt-3 space-y-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-center text-slate-500">{uploadProgress}%</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {documents.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucun document enregistré</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedDocuments).map(([typeKey, typeDocs]) => {
            const category = documentTypes[typeKey] || { 
              label: typeKey.toUpperCase(), 
              color: "bg-slate-100 text-slate-700", 
              borderColor: "border-slate-500" 
            };

            return (
              <Card key={typeKey} className={`border-l-4 ${category.borderColor}`}>
                <CardContent className="p-0">
                  <div className={`p-4 ${category.color} border-b`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        {category.label}
                      </h3>
                      <Badge className={`${category.color} border border-current`}>
                        {typeDocs.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    {typeDocs.map((doc, index) => {
                      const originalIndex = documents.indexOf(doc);
                      return (
                        <div key={index} className="flex items-start justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">{doc.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{doc.file_name}</p>
                              <span className="text-xs text-slate-500 mt-1 inline-block">
                                {new Date(doc.uploaded_date).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0 ml-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openSafeUrl(doc.url)}
                              className="h-8 w-8 p-0 hover:bg-blue-50"
                            >
                              <Download className="w-4 h-4 text-blue-600" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteDialog(originalIndex)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <AlertDialog open={deleteDialog !== null} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le document</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.
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