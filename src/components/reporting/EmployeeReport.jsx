import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Users, Briefcase, TrendingUp, Calendar, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

export default function EmployeeReport({ employees, workLogs, loading, onExport }) {
  if (loading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Statistiques globales
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.is_active).length;
  const inactiveEmployees = employees.filter(e => !e.is_active).length;

  // Répartition par département
  const departmentLabels = {
    direction: "Direction",
    administratif: "Administratif",
    topographie: "Topographie",
    grand_projet: "Grand Projet",
    logistique: "Logistique",
    foncier: "Foncier",
    stagiaires: "Stagiaires"
  };

  const employeesByDepartment = employees.reduce((acc, emp) => {
    const dept = emp.department;
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const departmentData = Object.entries(employeesByDepartment).map(([dept, count]) => ({
    name: departmentLabels[dept] || dept,
    value: count,
    active: employees.filter(e => e.department === dept && e.is_active).length
  }));

  // Analyse des congés restants
  const leaveAnalysis = employees
    .filter(e => e.is_active)
    .map(emp => ({
      name: emp.full_name,
      code: emp.employee_code,
      department: emp.department,
      remaining: emp.remaining_leave_days || 0,
      used: 25 - (emp.remaining_leave_days || 0)
    }))
    .sort((a, b) => a.remaining - b.remaining);

  const criticalLeave = leaveAnalysis.filter(e => e.remaining < 5);
  const avgLeaveRemaining = (leaveAnalysis.reduce((sum, e) => sum + e.remaining, 0) / leaveAnalysis.length).toFixed(1);

  // Statistiques par département détaillées
  const departmentStats = Object.entries(employeesByDepartment).map(([dept, count]) => {
    const deptEmployees = employees.filter(e => e.department === dept);
    const active = deptEmployees.filter(e => e.is_active).length;
    const avgLeave = deptEmployees.reduce((sum, e) => sum + (e.remaining_leave_days || 0), 0) / count;
    
    return {
      department: departmentLabels[dept] || dept,
      total: count,
      active,
      inactive: count - active,
      avgLeave: avgLeave.toFixed(1)
    };
  }).sort((a, b) => b.total - a.total);

  const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#22d3ee', '#a3e635'];

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm text-slate-600 font-semibold mb-1">Total Employés</p>
              <p className="text-3xl font-bold text-blue-900">{totalEmployees}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-xl border-0 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-slate-600 font-semibold mb-1">Actifs</p>
              <p className="text-3xl font-bold text-green-900">{activeEmployees}</p>
              <p className="text-xs text-slate-600 mt-1">{((activeEmployees/totalEmployees)*100).toFixed(0)}%</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-xl border-0 bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-sm text-slate-600 font-semibold mb-1">Inactifs</p>
              <p className="text-3xl font-bold text-red-900">{inactiveEmployees}</p>
              <p className="text-xs text-slate-600 mt-1">{((inactiveEmployees/totalEmployees)*100).toFixed(0)}%</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Briefcase className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm text-slate-600 font-semibold mb-1">Départements</p>
              <p className="text-3xl font-bold text-purple-900">{Object.keys(employeesByDepartment).length}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="shadow-xl border-0 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-sm text-slate-600 font-semibold mb-1">Congés Moy.</p>
              <p className="text-3xl font-bold text-orange-900">{avgLeaveRemaining}</p>
              <p className="text-xs text-slate-600 mt-1">jours/employé</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tableau détaillé par département */}
      <Card className="shadow-xl border-0 bg-white">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Vue Détaillée par Département
            </CardTitle>
            <Button
              onClick={onExport}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="font-bold text-slate-900">Département</TableHead>
                  <TableHead className="font-bold text-slate-900 text-center">Total</TableHead>
                  <TableHead className="font-bold text-slate-900 text-center">Actifs</TableHead>
                  <TableHead className="font-bold text-slate-900 text-center">Inactifs</TableHead>
                  <TableHead className="font-bold text-slate-900 text-center">Congés Moy.</TableHead>
                  <TableHead className="font-bold text-slate-900 text-center">% Actifs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departmentStats.map((dept, index) => (
                  <TableRow key={index} className="hover:bg-slate-50">
                    <TableCell className="font-semibold text-slate-900">{dept.department}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-blue-100 text-blue-700">{dept.total}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-100 text-green-700">{dept.active}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-red-100 text-red-700">{dept.inactive}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{dept.avgLeave}j</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-green-500"
                            style={{ width: `${(dept.active / dept.total) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-slate-700">
                          {((dept.active / dept.total) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Graphique Répartition par Département */}
      <Card className="shadow-xl border-0">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-lg">Répartition par Département</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Alertes congés critiques */}
      {criticalLeave.length > 0 && (
        <Card className="shadow-xl border-0 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
          <CardHeader className="border-b border-red-100">
            <CardTitle className="text-lg text-red-800 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Alerte : Congés Restants Critiques ({criticalLeave.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {criticalLeave.slice(0, 6).map((emp, index) => (
                <div key={index} className="bg-white rounded-xl p-4 border-2 border-red-200">
                  <p className="font-bold text-slate-900 mb-1">{emp.name}</p>
                  <p className="text-sm text-slate-600 mb-2">{emp.code} - {departmentLabels[emp.department]}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Restant:</span>
                    <Badge className="bg-red-600 text-white">{emp.remaining}j / 25j</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}