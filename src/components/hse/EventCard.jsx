import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  FileText,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const typeConfig = {
  'A': { label: 'Accident', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
  'I': { label: 'Incident', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertCircle },
  'PA': { label: 'Presqu\'accident', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Shield },
};

const severityConfig = {
  'G₀': { label: 'G₀ - Grave', color: 'bg-red-600 text-white' },
  'M₁': { label: 'M₁ - Modéré', color: 'bg-orange-500 text-white' },
  'm₁': { label: 'm₁ - Mineur', color: 'bg-yellow-500 text-white' },
};

export default function EventCard({ event, onSelect }) {
  const typeInfo = typeConfig[event.event_type_code] || typeConfig['I'];
  const severityInfo = severityConfig[event.severity] || severityConfig['m₁'];
  const TypeIcon = typeInfo.icon;

  return (
    <Card 
      className="p-5 hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 group"
      style={{ borderLeftColor: event.status === 'Ouvert' ? '#f97316' : '#10b981' }}
      onClick={() => onSelect(event)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${typeInfo.color}`}>
            <TypeIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Fiche N°{event.fiche_number}</p>
            <p className="text-xs text-slate-500 font-mono">{event.reference}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={severityInfo.color}>{event.severity}</Badge>
          <Badge variant={event.status === 'Ouvert' ? 'destructive' : 'secondary'}>
            {event.status}
          </Badge>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>
            {event.date_event ? format(new Date(event.date_event), 'dd MMMM yyyy', { locale: fr }) : 'Date non précisée'}
          </span>
          {event.time_event && (
            <>
              <Clock className="w-4 h-4 text-slate-400 ml-2" />
              <span>{event.time_event}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span className="uppercase">{event.departure_point && event.arrival_point ? `${event.departure_point} → ${event.arrival_point}` : event.location || 'Non précisé'}</span>
          <Badge variant="outline" className="ml-2 text-xs">{event.zone}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <User className="w-4 h-4 text-slate-400" />
          <span className="truncate">{event.persons_involved}</span>
        </div>
      </div>

      <p className="text-sm text-slate-700 line-clamp-2 mb-4">
        {event.circumstances}
      </p>

      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <FileText className="w-3 h-3" />
          <span>{event.equipment}</span>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
      </div>
    </Card>
  );
}