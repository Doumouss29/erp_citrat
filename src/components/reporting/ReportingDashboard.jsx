import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown, Users, FileX, Calendar, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

export default function ReportingDashboard({ data, loading }) {
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
        ))}
      </div>
    );
  }

  const { workLogs, absences, leaves, employees } = data;

  // Calculs des métriques clés
  const avgWorkHours = workLogs.length > 0 
    ? (workLogs.reduce((sum, log) => sum + (log.hours_worked || 0), 0) / workLogs.length).toFixed(2)
    : 0;

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.is_active).length;

  const absenceRate = totalEmployees > 0
    ? ((absences.length / totalEmployees) * 100).toFixed(1)
    : 0;

  const leaveUtilization = employees.reduce((sum, e) => {
    const used = 25 - (e.remaining_leave_days || 0);
    return sum + (used / 25) * 100;
  }, 0) / (employees.length || 1);

  const positiveBalance = workLogs.filter(w => w.cumulative_balance >= 0).length;
  const negativeBalance = workLogs.filter(w => w.cumulative_balance < 0).length;

  // Données pour les graphiques
  const absencesByType = [
    { name: 'Maladie', value: absences.filter(a => a.absence_type === 'maladie').length },
    { name: 'Accident travail', value: absences.filter(a => a.absence_type === 'accident_travail').length },
    { name: 'Événement familial', value: absences.filter(a => a.absence_type === 'evenement_familial').length },
    { name: 'Formation', value: absences.filter(a => a.absence_type === 'formation').length },
    { name: 'Autre', value: absences.filter(a => a.absence_type === 'autre').length }
  ].filter(item => item.value > 0);

  const leavesByType = [
    { name: 'Congés payés', value: leaves.filter(l => l.leave_type === 'conges_payes').length },
    { name: 'RTT', value: leaves.filter(l => l.leave_type === 'rtt').length },
    { name: 'Sans solde', value: leaves.filter(l => l.leave_type === 'conge_sans_solde').length },
    { name: 'Parental', value: leaves.filter(l => l.leave_type === 'conge_parental').length },
    { name: 'Autre', value: leaves.filter(l => l.leave_type === 'autre').length }
  ].filter(item => item.value > 0);

  const departmentStats = [
    { name: 'Direction', employees: employees.filter(e => e.department === 'direction').length },
    { name: 'Administratif', employees: employees.filter(e => e.department === 'administratif').length },
    { name: 'Topographie', employees: employees.filter(e => e.department === 'topographie').length },
    { name: 'Grand Projet', employees: employees.filter(e => e.department === 'grand_projet').length },
    { name: 'Logistique', employees: employees.filter(e => e.department === 'logistique').length },
    { name: 'Stagiaires', employees: employees.filter(e => e.department === 'stagiaires').length }
  ].filter(item => item.employees > 0);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-6">
        <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-10 h-10 text-blue-600" />
              <Badge className="bg-blue-600 text-white">Moyenne</Badge>
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">Heures Travaillées</p>
            <p className="text-3xl font-bold text-blue-900">{avgWorkHours}h/jour</p>
            <p className="text-sm text-slate-600 mt-2">Base: 8h/jour</p>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <FileX className="w-10 h-10 text-orange-600" />
              <Badge className="bg-orange-600 text-white">Taux</Badge>
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">Taux d'Absences</p>
            <p className="text-3xl font-bold text-orange-900">{absenceRate}%</p>
            <p className="text-sm text-slate-600 mt-2">{absences.length} absence(s)</p>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-10 h-10 text-green-600" />
              <Badge className="bg-green-600 text-white">Utilisation</Badge>
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">Congés Utilisés</p>
            <p className="text-3xl font-bold text-green-900">{leaveUtilization.toFixed(0)}%</p>
            <p className="text-sm text-slate-600 mt-2">{leaves.length} demande(s)</p>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-10 h-10 text-purple-600" />
              <Badge className="bg-purple-600 text-white">Effectif</Badge>
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">Employés Actifs</p>
            <p className="text-3xl font-bold text-purple-900">{activeEmployees}/{totalEmployees}</p>
            <p className="text-sm text-slate-600 mt-2">{((activeEmployees/totalEmployees)*100).toFixed(0)}% actifs</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance des heures */}
      <Card className="shadow-xl border-0 bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Balance des Heures de Travail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <Badge className="bg-green-600 text-white text-lg px-4 py-2">{positiveBalance}</Badge>
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">Employés en Avance</p>
              <p className="text-2xl font-bold text-green-900">
                {totalEmployees > 0 ? ((positiveBalance / workLogs.length) * 100).toFixed(0) : 0}%
              </p>
            </div>
            <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <TrendingDown className="w-8 h-8 text-red-600" />
                <Badge className="bg-red-600 text-white text-lg px-4 py-2">{negativeBalance}</Badge>
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">Employés en Retard</p>
              <p className="text-2xl font-bold text-red-900">
                {totalEmployees > 0 ? ((negativeBalance / workLogs.length) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graphiques */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Répartition par Département</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="employees" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Absences par Type</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {absencesByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={absencesByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {absencesByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Congés par Type</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {leavesByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leavesByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leavesByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Statut des Demandes</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                  <span className="font-semibold text-slate-900">En attente</span>
                </div>
                <Badge className="bg-yellow-600 text-white text-lg px-4 py-2">
                  {absences.filter(a => a.status === 'pending').length + leaves.filter(l => l.status === 'pending').length}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                  <span className="font-semibold text-slate-900">Approuvées</span>
                </div>
                <Badge className="bg-green-600 text-white text-lg px-4 py-2">
                  {absences.filter(a => a.status === 'approved').length + leaves.filter(l => l.status === 'approved').length}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-3">
                  <TrendingDown className="w-8 h-8 text-red-600" />
                  <span className="font-semibold text-slate-900">Refusées</span>
                </div>
                <Badge className="bg-red-600 text-white text-lg px-4 py-2">
                  {absences.filter(a => a.status === 'rejected').length + leaves.filter(l => l.status === 'rejected').length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}