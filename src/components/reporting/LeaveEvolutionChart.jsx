import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export default function LeaveEvolutionChart({ leaves, filters }) {
  // Calculer l'évolution des congés par mois
  const startDate = parseISO(filters.startDate);
  const endDate = parseISO(filters.endDate);
  
  const months = eachMonthOfInterval({ start: startDate, end: endDate });
  
  const evolutionData = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const monthStr = format(monthStart, 'yyyy-MM');
    
    const monthLeaves = leaves.filter(leave => {
      const leaveStart = parseISO(leave.start_date);
      return leaveStart >= monthStart && leaveStart <= monthEnd;
    });
    
    const approved = monthLeaves.filter(l => l.status === 'approved').length;
    const pending = monthLeaves.filter(l => l.status === 'pending').length;
    const rejected = monthLeaves.filter(l => l.status === 'rejected').length;
    
    const totalDays = monthLeaves
      .filter(l => l.status === 'approved')
      .reduce((sum, l) => sum + (l.total_days || 0), 0);
    
    return {
      month: format(month, 'MMM yyyy', { locale: fr }),
      approved,
      pending,
      rejected,
      totalDays
    };
  });

  return (
    <Card className="shadow-xl border-0 bg-white">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-lg">Évolution des Congés sur la Période</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-8">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Nombre de demandes par mois</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="approved" stroke="#22c55e" name="Approuvés" strokeWidth={2} />
                <Line type="monotone" dataKey="pending" stroke="#eab308" name="En attente" strokeWidth={2} />
                <Line type="monotone" dataKey="rejected" stroke="#ef4444" name="Refusés" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Total de jours de congés pris par mois</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="totalDays" stroke="#3b82f6" name="Jours pris" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}