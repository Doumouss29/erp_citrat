import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export default function AbsenceEvolutionChart({ absences, filters }) {
  // Calculer l'évolution des absences par mois
  const startDate = parseISO(filters.startDate);
  const endDate = parseISO(filters.endDate);
  
  const months = eachMonthOfInterval({ start: startDate, end: endDate });
  
  const evolutionData = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const monthAbsences = absences.filter(absence => {
      const absenceStart = parseISO(absence.start_date);
      return absenceStart >= monthStart && absenceStart <= monthEnd;
    });
    
    const approved = monthAbsences.filter(a => a.status === 'approved').length;
    const pending = monthAbsences.filter(a => a.status === 'pending').length;
    const rejected = monthAbsences.filter(a => a.status === 'rejected').length;
    
    const maladie = monthAbsences.filter(a => a.absence_type === 'maladie').length;
    const accident = monthAbsences.filter(a => a.absence_type === 'accident_travail').length;
    const autre = monthAbsences.filter(a => !['maladie', 'accident_travail'].includes(a.absence_type)).length;
    
    return {
      month: format(month, 'MMM yyyy', { locale: fr }),
      approved,
      pending,
      rejected,
      maladie,
      accident,
      autre
    };
  });

  return (
    <Card className="shadow-xl border-0 bg-white">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-lg">Évolution des Absences sur la Période</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-8">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Nombre d'absences par mois</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="approved" stroke="#22c55e" name="Approuvées" strokeWidth={2} />
                <Line type="monotone" dataKey="pending" stroke="#eab308" name="En attente" strokeWidth={2} />
                <Line type="monotone" dataKey="rejected" stroke="#ef4444" name="Refusées" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Répartition par type d'absence</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="maladie" stroke="#ef4444" name="Maladie" strokeWidth={2} />
                <Line type="monotone" dataKey="accident" stroke="#f97316" name="Accident travail" strokeWidth={2} />
                <Line type="monotone" dataKey="autre" stroke="#3b82f6" name="Autres" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}