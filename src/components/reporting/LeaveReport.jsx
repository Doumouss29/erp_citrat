import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, FileDown, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LeaveReport({ leaves, employees, loading, filters, onExportCSV, onExportPDF }) {
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2].map(i => (
          <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
        ))}
      </div>
    );
  }

  const totalLeaves = leaves.length;
  const pendingLeaves = leaves.filter(l => l.status === "pending").length;
  const approvedLeaves = leaves.filter(l => l.status === "approved").length;
  const rejectedLeaves = leaves.filter(l => l.status === "rejected").length;

  const employeeLeaveBalance = employees
    .filter(e => e.is_active)
    .map(emp => ({
      name: emp.full_name,
      code: emp.employee_code,
      department: emp.department,
      position: emp.position,
      remaining: emp.remaining_leave_days || 0,
      used: 25 - (emp.remaining_leave_days || 0),
      total: 25
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const departmentLabels = {
    direction: "Direction",
    administratif: "Administratif",
    topographie: "Topographie",
    grand_projet: "Grand Projet",
    logistique: "Logistique",
    foncier: "Foncier",
    stagiaires: "Stagiaires"
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-white">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Rapport des Congés</CardTitle>
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
                <Calendar className="w-8 h-8 text-emerald-600" />
                <p className="text-sm font-semibold text-slate-600">Total Demandes</p>
              </div>
              <p className="text-3xl font-bold text-emerald-900">{totalLeaves}</p>
            </div>
            <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200">
              <p className="text-sm font-semibold text-slate-600 mb-2">En attente</p>
              <p className="text-3xl font-bold text-yellow-900">{pendingLeaves}</p>
            </div>
            <div className="bg-cyan-50 rounded-2xl p-6 border border-cyan-200">
              <p className="text-sm font-semibold text-slate-600 mb-2">Approuvés</p>
              <p className="text-3xl font-bold text-cyan-900">{approvedLeaves}</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
              <p className="text-sm font-semibold text-slate-600 mb-2">Refusés</p>
              <p className="text-3xl font-bold text-red-900">{rejectedLeaves}</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-indigo-600" />
              <h3 className="text-xl font-bold text-slate-900">Tableau de Solde de Congés - Tous les Salariés ({employeeLeaveBalance.length})</h3>
            </div>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-100 sticky top-0">
                    <TableRow>
                      <TableHead className="font-bold text-slate-900">Code</TableHead>
                      <TableHead className="font-bold text-slate-900">Nom</TableHead>
                      <TableHead className="font-bold text-slate-900">Poste</TableHead>
                      <TableHead className="font-bold text-slate-900">Département</TableHead>
                      <TableHead className="font-bold text-slate-900 text-center">Jours Totaux</TableHead>
                      <TableHead className="font-bold text-slate-900 text-center">Jours Utilisés</TableHead>
                      <TableHead className="font-bold text-slate-900 text-center">Jours Restants</TableHead>
                      <TableHead className="font-bold text-slate-900 text-center">% Utilisé</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeLeaveBalance.map((emp) => {
                      const percentUsed = ((emp.used / emp.total) * 100).toFixed(0);
                      return (
                        <TableRow key={emp.code} className="hover:bg-slate-50">
                          <TableCell className="font-medium">{emp.code}</TableCell>
                          <TableCell className="font-semibold text-slate-900">{emp.name}</TableCell>
                          <TableCell className="text-slate-600">{emp.position}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {departmentLabels[emp.department] || emp.department}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{emp.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-red-100 text-red-700">{emp.used}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-100 text-green-700">{emp.remaining}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-20 bg-slate-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    percentUsed >= 80 ? "bg-red-500" : 
                                    percentUsed >= 50 ? "bg-orange-500" : 
                                    "bg-green-500"
                                  }`}
                                  style={{ width: `${percentUsed}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold text-slate-700">{percentUsed}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}