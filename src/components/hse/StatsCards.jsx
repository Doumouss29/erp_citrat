import React from 'react';
import { Card } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Shield, CheckCircle2 } from "lucide-react";

export default function StatsCards({ events }) {
  const stats = {
    total: events.length,
    accidents: events.filter(e => e.event_type_code === 'A').length,
    incidents: events.filter(e => e.event_type_code === 'I').length,
    nearMiss: events.filter(e => e.event_type_code === 'PA').length,
    open: events.filter(e => e.status === 'Ouvert').length,
    closed: events.filter(e => e.status === 'Clos').length,
  };

  const cards = [
    { 
      label: 'Total Événements', 
      value: stats.total, 
      icon: Shield, 
      color: 'bg-slate-800',
      iconColor: 'text-white'
    },
    { 
      label: 'Accidents', 
      value: stats.accidents, 
      icon: AlertTriangle, 
      color: 'bg-red-50 border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-700'
    },
    { 
      label: 'Incidents', 
      value: stats.incidents, 
      icon: AlertCircle, 
      color: 'bg-amber-50 border-amber-200',
      iconColor: 'text-amber-600',
      textColor: 'text-amber-700'
    },
    { 
      label: 'Presqu\'accidents', 
      value: stats.nearMiss, 
      icon: Shield, 
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-700'
    },
    { 
      label: 'En cours', 
      value: stats.open, 
      icon: AlertCircle, 
      color: 'bg-orange-50 border-orange-200',
      iconColor: 'text-orange-600',
      textColor: 'text-orange-700'
    },
    { 
      label: 'Clôturés', 
      value: stats.closed, 
      icon: CheckCircle2, 
      color: 'bg-emerald-50 border-emerald-200',
      iconColor: 'text-emerald-600',
      textColor: 'text-emerald-700'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((card, idx) => (
        <Card 
          key={idx} 
          className={`p-4 border ${card.color} transition-all hover:shadow-md`}
        >
          <div className="flex items-center justify-between mb-2">
            <card.icon className={`w-5 h-5 ${card.iconColor}`} />
          </div>
          <p className={`text-2xl font-bold ${card.textColor || 'text-white'}`}>
            {card.value}
          </p>
          <p className={`text-xs ${card.textColor ? 'text-slate-600' : 'text-slate-300'} mt-1`}>
            {card.label}
          </p>
        </Card>
      ))}
    </div>
  );
}