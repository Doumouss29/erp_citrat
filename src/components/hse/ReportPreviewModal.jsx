import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, AlertTriangle, AlertCircle, Shield, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ReportPreviewModal({ open, onClose, onConfirm, events, exporting }) {
  if (!events || events.length === 0) return null;

  const accidents = events.filter(e => e.event_type_code === 'A').length;
  const incidents = events.filter(e => e.event_type_code === 'I').length;
  const presquAcc = events.filter(e => e.event_type_code === 'PA').length;
  const ouverts = events.filter(e => e.status === 'Ouvert').length;
  const clos = events.filter(e => e.status === 'Clos').length;
  const worodougou = events.filter(e => e.zone === 'Worodougou').length;
  const cavally = events.filter(e => e.zone === 'Cavally').length;

  const datesValides = events.filter(e => e.date_event).map(e => new Date(e.date_event)).sort((a, b) => a - b);
  const dateMin = datesValides.length > 0 ? format(datesValides[0], 'dd MMM yyyy', { locale: fr }) : '-';
  const dateMax = datesValides.length > 0 ? format(datesValides[datesValides.length - 1], 'dd MMM yyyy', { locale: fr }) : '-';

  const recentEvents = [...events].sort((a, b) => new Date(b.date_event) - new Date(a.date_event)).slice(0, 5);

  const typeConfig = {
    'A': { label: 'Accident', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    'I': { label: 'Incident', color: 'bg-amber-100 text-amber-800', icon: AlertCircle },
    'PA': { label: 'Presqu\'acc.', color: 'bg-blue-100 text-blue-800', icon: Shield },
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-slate-700" />
            Aperçu du rapport HSE-PRESFOR
          </DialogTitle>
        </DialogHeader>

        {/* Période */}
        <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-500" />
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Période couverte</p>
            <p className="text-sm font-semibold text-slate-800">{dateMin} → {dateMax}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-500">Total fiches</p>
            <p className="text-2xl font-bold text-slate-800">{events.length}</p>
          </div>
        </div>

        {/* KPI Résumé */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-2 font-medium">Par type</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-sm text-red-700"><AlertTriangle className="w-3.5 h-3.5" /> Accidents</span>
                <Badge className="bg-red-100 text-red-800">{accidents}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-sm text-amber-700"><AlertCircle className="w-3.5 h-3.5" /> Incidents</span>
                <Badge className="bg-amber-100 text-amber-800">{incidents}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-sm text-blue-700"><Shield className="w-3.5 h-3.5" /> Presqu'acc.</span>
                <Badge className="bg-blue-100 text-blue-800">{presquAcc}</Badge>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-2 font-medium">Par statut / zone</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-orange-700">Ouvertes</span>
                <Badge className="bg-orange-100 text-orange-800">{ouverts}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-emerald-700">Closes</span>
                <Badge className="bg-emerald-100 text-emerald-800">{clos}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Worodougou / Cavally</span>
                <span className="font-semibold">{worodougou} / {cavally}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dernières fiches */}
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">5 fiches les plus récentes incluses</p>
          <div className="space-y-1.5">
            {recentEvents.map(event => {
              const tc = typeConfig[event.event_type_code] || typeConfig['I'];
              const Icon = tc.icon;
              return (
                <div key={event.id} className="flex items-center gap-3 bg-white border rounded-md px-3 py-2">
                  <span className="text-xs text-slate-400 font-mono w-5">#{event.fiche_number}</span>
                  <Badge className={`${tc.color} text-xs`}>{tc.label}</Badge>
                  <span className="text-xs font-mono text-slate-600">{event.reference}</span>
                  <span className="text-xs text-slate-500 ml-auto">
                    {event.date_event ? format(new Date(event.date_event), 'dd/MM/yyyy') : '-'}
                  </span>
                  <Badge variant={event.status === 'Ouvert' ? 'destructive' : 'secondary'} className="text-xs">
                    {event.status}
                  </Badge>
                </div>
              );
            })}
          </div>
          {events.length > 5 && (
            <p className="text-xs text-slate-400 mt-1.5 text-center">… et {events.length - 5} autre(s) fiche(s)</p>
          )}
        </div>

        {/* Sections du rapport */}
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Sections générées</p>
          <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
            {['Page de couverture', 'Sommaire', 'Introduction & Contexte', 'Indicateurs KPI', 'Codage standard', 'Registre consolidé', 'Analyse approfondie', 'Plan CAPA', 'Registre des risques', 'Conclusion & Recommandations', 'Annexes - Fiches individuelles'].map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                {s}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={exporting}>Annuler</Button>
          <Button onClick={onConfirm} disabled={exporting} className="bg-slate-800 hover:bg-slate-900">
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Génération en cours...' : 'Générer le rapport PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}