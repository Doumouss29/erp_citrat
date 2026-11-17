import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Calendar, Building2, MapPin, AlertTriangle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getActiviteColor } from "@/lib/activiteColors";

const statutConfig = {
  en_cours: { label: 'En cours', badge: 'bg-statut-cours-bg text-statut-cours border-statut-cours/25', bar: 'bg-statut-cours', liseret: 'bg-statut-cours' },
  termine: { label: 'Terminé', badge: 'bg-statut-termine-bg text-statut-termine border-statut-termine/25', bar: 'bg-statut-termine', liseret: 'bg-statut-termine' },
  en_arret: { label: 'En arrêt', badge: 'bg-primary/10 text-primary border-primary/25', bar: 'bg-primary', liseret: 'bg-primary' }
};
const causeLabel = { technique: 'Technique', administratif: 'Administratif', financier: 'Financier', autre: 'Autre' };

function avancementOf(projet) {
  const etapes = projet.etapes || [];
  const total = etapes.length;
  const fait = etapes.filter(e => e.fait).length;
  const pct = total > 0 ? Math.round((fait / total) * 100) : (projet.avancement || 0);
  return { total, fait, pct };
}

function progressColor(pct) {
  if (pct >= 70) return 'bg-statut-cours';
  if (pct >= 30) return 'bg-primary';
  return 'bg-destructive';
}

function ProjetCard({ projet, bureau, isAdmin, onView, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { fait, total, pct } = avancementOf(projet);
  const actColor = getActiviteColor(projet.type_activite);
  const stCfg = statutConfig[projet.statut] || statutConfig.en_cours;
  return (
    <Card className="group rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden relative">
      <div className={`h-1.5 ${projet.bloque ? 'bg-destructive' : stCfg.liseret}`} />
      <CardContent className="p-5">
        {/* Titre + badges */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-heading font-bold text-foreground leading-snug text-[15px] line-clamp-2">{projet.titre}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <Badge className={`${stCfg.badge} border gap-1`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stCfg.bar}`} />
            {stCfg.label}
          </Badge>
          {projet.bloque && (
            <Badge className="bg-destructive/10 text-destructive border border-destructive/25 gap-1">
              <AlertTriangle className="w-3 h-3" />Bloqué
            </Badge>
          )}
          {projet.type_activite && (
            <Badge className={`${actColor.classes} border`}>{projet.type_activite}</Badge>
          )}
        </div>

        {/* Localité */}
        {(projet.localite || (isAdmin && bureau)) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
            {projet.localite && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary/70" />{projet.localite}
              </span>
            )}
            {isAdmin && bureau && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-primary/70" />{bureau.code}
              </span>
            )}
          </div>
        )}

        {/* Description tronquée */}
        {projet.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{projet.description}</p>
        )}

        {/* Progression */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>{fait}/{total} étapes</span>
            <span className="font-heading font-semibold text-foreground">{pct}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div className={`h-2 rounded-full transition-all duration-500 ${progressColor(pct)}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Dates */}
        {(projet.date_debut || projet.date_fin_prevue) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/80 mb-4">
            {projet.date_debut && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />Début: {new Date(projet.date_debut).toLocaleDateString('fr-FR')}
              </span>
            )}
            {projet.date_fin_prevue && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />Fin: {new Date(projet.date_fin_prevue).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/60">
          <Button size="sm" className="flex-1 bg-brand hover:bg-brand/90 text-brand-foreground" onClick={() => onView(projet)}>
            <Eye className="w-3.5 h-3.5 mr-1.5" /> Voir le détail
          </Button>
          <Button size="sm" variant="outline" className="border-border text-foreground/70 hover:bg-secondary hover:text-foreground" onClick={() => onEdit(projet)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le projet ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible. Le projet <strong>{projet.titre}</strong> sera supprimé.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => onDelete(projet)}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default function ProjetsList({ projets, bureaux, isLoading, onView, onEdit, onDelete }) {
  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!projets?.length) {
    return (
      <div className="text-center py-16 bg-card rounded-2xl border border-border shadow-sm">
        <p className="text-foreground/70 font-heading font-medium">Aucun projet</p>
        <p className="text-muted-foreground text-sm">Créez votre premier projet pour commencer le suivi</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {projets.map(projet => (
        <ProjetCard key={projet.id} projet={projet} bureau={bureaux?.find(b => b.id === projet.bureau_id)} onView={onView} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}