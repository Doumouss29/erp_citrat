import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileDown, FileX } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import AbsenceEvolutionChart from "./AbsenceEvolutionChart";

export default function AbsenceReport({ absences, employees, loading, filters, onExportCSV, onExportPDF }) {
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2].map(i => (
          <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
        ))}
      </div>
    );
  }

  const totalAbsences = absences.length;
  const pendingAbsences = absences.filter(a => a.status === "pending").length;
  const approvedAbsences = absences.filter(a => a.status === "approved").length;
  const rejectedAbsences = absences.filter(a => a.status === "rejected").length;

  const absencesByType = [
    { name: 'Maladie', value: absences.filter(a => a.absence_type === 'maladie').length, color: '#ef4444' },
    { name: 'Accident travail', value: absences.filter(a => a.absence_type === 'accident_travail').length, color: '#f97316' },
    { name: 'Événement familial', value: absences.filter(a => a.absence_type === 'evenement_familial').length, color: '#eab308' },
    { name: 'Formation', value: absences.filter(a => a.absence_type === 'formation').length, color: '#22c55e' },
    { name: 'Autre', value: absences.filter(a => a.absence_type === 'autre').length, color: '#3b82f6' }
  ].filter(item => item.value > 0);

  const absencesByStatus = [
    { name: 'En attente', absences: pendingAbsences, color: '#eab308' },
    { name: 'Approuvées', absences: approvedAbsences, color: '#22c55e' },
    { name: 'Refusées', absences: rejectedAbsences, color: '#ef4444' }
  ];

  const topEmployees = Object.entries(
    absences.reduce((acc, absence) => {
      acc[absence.employee_name] = (acc[absence.employee_name] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-white">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Rapport des Absences</CardTitle>
            <div className="flex gap-3">
              <Button onClick={onExportCSV} className="bg-green-600 hover:bg-green-700 rounded-xl">
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button onClick={onExportPDF} variant="outline" className="rounded-xl">
                <FileDown className="w-4 h-4 mr-2" />
                TXT
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
              <div className="flex items-center gap-3 mb-2">
                <FileX className="w-8 h-8 text-emerald-600" />
                <p className="text-sm font-semibold text-slate-600">Total</p>
              </div>
              <p className="text-3xl font-bold text-emerald-900">{totalAbsences}</p>
            </div>
            <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200">
              <p className="text-sm font-semibold text-slate-600 mb-2">En attente</p>
              <p className="text-3xl font-bold text-yellow-900">{pendingAbsences}</p>
            </div>
            <div className="bg-cyan-50 rounded-2xl p-6 border border-cyan-200">
              <p className="text-sm font-semibold text-slate-600 mb-2">Approuvés</p>
              <p className="text-3xl font-bold text-cyan-900">{approvedAbsences}</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
              <p className="text-sm font-semibold text-slate-600 mb-2">Refusés</p>
              <p className="text-3xl font-bold text-red-900">{rejectedAbsences}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Absences par Type</h3>
              {absencesByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={absencesByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {absencesByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-500">
                  Aucune absence
                </div>
              )}
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Statut des Absences</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={absencesByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="absences" fill="#f97316" radius={[8, 8, 0, 0]}>
                    {absencesByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {topEmployees.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Top 10 - Employés avec le plus d'absences</h3>
              <div className="space-y-3">
                {topEmployees.map((emp, index) => (
                  <div key={emp.name} className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
                        #{index + 1}
                      </div>
                      <p className="font-bold text-slate-900">{emp.name}</p>
                    </div>
                    <Badge className="bg-orange-600 text-white text-lg px-4 py-2">
                      {emp.count} absence(s)
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Liste Complète ({absences.length} absences)</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {absences.map((absence) => (
                <div key={absence.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-900">{absence.employee_name}</p>
                      <p className="text-sm text-slate-600 capitalize">{absence.absence_type?.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge className={`${
                      absence.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      absence.status === "approved" ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {absence.status === "pending" ? "En attente" : absence.status === "approved" ? "Approuvée" : "Refusée"}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p>📅 Du {format(new Date(absence.start_date), "dd/MM/yyyy")} au {format(new Date(absence.end_date), "dd/MM/yyyy")}</p>
                    {absence.reason && <p className="mt-1">💬 {absence.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {filters && <AbsenceEvolutionChart absences={absences} filters={filters} />}
    </div>
  );
}