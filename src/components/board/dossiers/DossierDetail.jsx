import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DossierDetail({ open, onOpenChange, dossier, activites, statuts, bureaux }) {
  if (!dossier) return null;

  const statut = statuts?.find(s => s.id === dossier.statut_id);
  const activite = activites?.find(a => a.id === dossier.activite_id);
  const bureau = bureaux?.find(b => b.id === dossier.bureau_id);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
  };

  const getPrioriteColor = (priorite) => {
    switch (priorite) {
      case 'haute': return 'bg-red-100 text-red-700';
      case 'basse': return 'bg-slate-100 text-slate-600';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-xl">{dossier.reference_auto}</span>
            <Badge 
              style={{ backgroundColor: statut?.couleur + '20', color: statut?.couleur, borderColor: statut?.couleur }}
            >
              {statut?.libelle}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Infos principales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <User className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Client</p>
                <p className="font-medium">
                  {dossier.client_nom}
                  {dossier.client_prenom && ` ${dossier.client_prenom}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <FileText className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Activité</p>
                <p className="font-medium">{activite?.libelle || dossier.activite_code}</p>
              </div>
            </div>
          </div>

          {/* Description du projet */}
          <div>
            <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description du projet
            </h4>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-700 whitespace-pre-wrap">{dossier.description || '-'}</p>
            </div>
          </div>

          <Separator />

          {/* Dates clés simplifiées */}
          <div>
            <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Dates clés
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Création</p>
                <p className="font-medium">{formatDate(dossier.date_ouverture || dossier.created_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Livraison</p>
                <p className="font-medium">{formatDate(dossier.date_livraison)}</p>
              </div>
            </div>
          </div>

          {/* Motif suspension */}
          {dossier.motif_suspension && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <AlertCircle className="w-4 h-4" />
                <p className="font-medium">Motif de suspension</p>
              </div>
              <p className="text-amber-800">{dossier.motif_suspension}</p>
            </div>
          )}

          {/* Commentaires */}
          {dossier.commentaires_internes && (
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 mb-2">Commentaires internes</p>
              <p className="text-slate-700">{dossier.commentaires_internes}</p>
            </div>
          )}
          </div>

          {/* Bandeau infos en bas */}
          <div className="mt-6 -mx-6 -mb-6 px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-slate-600">Priorité</p>
                <Badge className={getPrioriteColor(dossier.priorite)}>
                  {dossier.priorite?.charAt(0).toUpperCase() + dossier.priorite?.slice(1)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-600">Bureau</p>
                <p className="font-medium text-slate-800">{dossier.bureau_code}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Responsable</p>
                <p className="font-medium text-slate-800">{bureau?.responsable_nom || '-'}</p>
              </div>
            </div>
          </div>
          </DialogContent>
          </Dialog>
          );
          }