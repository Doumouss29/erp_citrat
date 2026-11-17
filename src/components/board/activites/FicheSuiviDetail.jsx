import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, CheckCircle2, Clock, AlertTriangle, Pause, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUT_CONFIG = {
  realise:    { label: 'Réalisé',    color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  en_cours:   { label: 'En cours',   color: 'bg-blue-100 text-blue-700',    icon: Clock },
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-700',  icon: Pause },
  reporte:    { label: 'Reporté',    color: 'bg-red-100 text-red-700',      icon: AlertTriangle },
  planifie:   { label: 'Planifié',   color: 'bg-slate-100 text-slate-600',  icon: Calendar },
};

export default function FicheSuiviDetail({ open, onOpenChange, fiche, onEdit }) {
  if (!fiche) return null;

  const activites = fiche.activites_planifiees || [];
  const realisees = activites.filter(a => a.statut === 'realise').length;
  const pct = activites.length > 0 ? Math.round((realisees / activites.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold pr-8">
            {fiche.type_fiche === 'diligence' ? 'Diligence (Projet long terme)' : `Fiche Semaine ${fiche.numero_semaine}/${fiche.annee}`}
          </DialogTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={fiche.type_fiche === 'diligence' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
              {fiche.type_fiche === 'diligence' ? 'Diligence' : 'Hebdomadaire'}
            </Badge>
            <Badge className={fiche.valide ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
              {fiche.valide ? 'Validée' : 'Brouillon'}
            </Badge>
            {fiche.semaine_debut && fiche.semaine_fin && (
              <span className="text-xs text-slate-500">
                {format(new Date(fiche.semaine_debut), 'dd MMM', { locale: fr })} → {format(new Date(fiche.semaine_fin), 'dd MMM yyyy', { locale: fr })}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Barre de progression */}
          {activites.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex justify-between text-sm text-slate-600 mb-2">
                <span className="font-medium">Taux de réalisation</span>
                <span className="font-bold text-slate-800">{pct}%</span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1">{realisees} / {activites.length} activités réalisées</p>
            </div>
          )}

          {/* Table activités */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">Activités planifiées / réalisées</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-slate-600 font-medium w-8">#</th>
                    <th className="text-left px-3 py-2.5 text-slate-600 font-medium">Activité planifiée</th>
                    <th className="text-left px-3 py-2.5 text-slate-600 font-medium hidden sm:table-cell">Réalisation</th>
                    <th className="text-left px-3 py-2.5 text-slate-600 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activites.map((act, i) => {
                    const cfg = STATUT_CONFIG[act.statut] || STATUT_CONFIG.planifie;
                    const Icon = cfg.icon;
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{String(act.numero || i + 1).padStart(2, '0')}</td>
                        <td className="px-3 py-2.5 text-slate-800">{act.description}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs hidden sm:table-cell">
                          {act.commentaire_realisation || '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>



          {/* Bouton Modifier en bas */}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => onEdit(fiche)}>
              <Pencil className="w-4 h-4 mr-1" /> Modifier
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}