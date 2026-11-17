import React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Wrench,
  FileText,
  AlertTriangle,
  Shield,
  Activity,
  CheckCircle2,
  X,
  Download,
  Edit,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const severityConfig = {
  'G₀': { label: 'G₀ - Grave', color: 'bg-red-600 text-white', desc: 'Blessures graves ou dégâts majeurs' },
  'M₁': { label: 'M₁ - Modéré', color: 'bg-orange-500 text-white', desc: 'Blessures modérées ou dégâts significatifs' },
  'm₁': { label: 'm₁ - Mineur', color: 'bg-yellow-500 text-white', desc: 'Blessures légères ou dégâts mineurs' },
};

export default function EventDetail({ event, open, onClose, onExportPDF, onEdit, onDelete }) {
  if (!event) return null;

  const severityInfo = severityConfig[event.severity] || severityConfig['m₁'];

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-3">
      <div className="p-2 bg-slate-100 rounded-lg">
        <Icon className="w-4 h-4 text-slate-600" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-slate-800 mt-0.5">{value || 'Non précisé'}</p>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">
            Fiche N°{event.fiche_number}
          </SheetTitle>
          <p className="text-sm font-mono text-slate-500">{event.reference}</p>
        </SheetHeader>

        <div className="space-y-6">
          {/* Status & Severity */}
          <div className="flex gap-3">
            <Badge 
              className={`${event.status === 'Ouvert' ? 'bg-orange-500' : 'bg-emerald-500'} text-white px-3 py-1`}
            >
              {event.status === 'Ouvert' ? 'En cours' : 'Clôturé'}
            </Badge>
            <Badge className={severityInfo.color + ' px-3 py-1'}>
              {severityInfo.label}
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              {event.event_type}
            </Badge>
          </div>

          <Separator />

          {/* Main Info */}
          <div className="space-y-1">
            <InfoRow 
              icon={Calendar} 
              label="Date de l'événement" 
              value={event.date_event ? format(new Date(event.date_event), 'EEEE dd MMMM yyyy', { locale: fr }) : null}
            />
            <InfoRow icon={Clock} label="Heure" value={event.time_event} />
            <InfoRow icon={MapPin} label="Trajet" value={event.departure_point && event.arrival_point ? `${event.departure_point} → ${event.arrival_point} (${event.zone})` : event.location ? `${event.location} (${event.zone})` : `Zone ${event.zone}`} />
          </div>

          <Separator />

          {/* People & Equipment */}
          <div className="space-y-1">
            <InfoRow icon={User} label="Personne(s) impliquée(s)" value={event.persons_involved} />
            <InfoRow icon={Activity} label="Fonction" value={event.person_role} />
            <InfoRow icon={Wrench} label="Matériel" value={event.equipment} />
          </div>

          <Separator />

          {/* Circumstances */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <p className="text-xs text-slate-500 uppercase tracking-wide">Circonstances</p>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed">
              {event.circumstances}
            </p>
          </div>

          {/* Injuries & Damages */}
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-xs text-red-600 uppercase tracking-wide">Blessures / Dégâts</p>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed">
              {event.injuries_damages || 'Aucun'}
            </p>
          </div>

          {/* Immediate Measures */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-emerald-600 uppercase tracking-wide">Mesures immédiates</p>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed">
              {event.immediate_measures}
            </p>
          </div>

          <Separator />

          {/* Tracking Info */}
          <div className="bg-slate-100 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Suivi administratif</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Date déclaration</p>
                <p className="text-slate-800">
                  {event.declaration_date ? format(new Date(event.declaration_date), 'dd/MM/yyyy') : '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Date clôture</p>
                <p className="text-slate-800">
                  {event.closure_date ? format(new Date(event.closure_date), 'dd/MM/yyyy') : 'En cours'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Responsable</p>
                <p className="text-slate-800">{event.supervisor || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Observations</p>
                <p className="text-slate-800">{event.observations || '-'}</p>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="border-t-2 border-slate-300 pt-4">
              <p className="text-xs text-slate-500 text-center">Signature Agent</p>
            </div>
            <div className="border-t-2 border-slate-300 pt-4">
              <p className="text-xs text-slate-500 text-center">Signature Superviseur</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={() => onEdit(event)} 
              variant="outline"
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
            <Button 
              onClick={() => onDelete(event)} 
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer la fiche
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}