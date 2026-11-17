import MonthInput from "@/components/shared/MonthInput";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, DollarSign, Clock, Calendar, FileX, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";
import { calculateWorkingDays } from "@/components/utils/workingDays";

export default function PayrollReport({ employees, absences, leaves, workLogs, timeEntries }) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [expandedEmployees, setExpandedEmployees] = useState(new Set());
  const [payrollData, setPayrollData] = useState([]);

  const departmentLabels = {
    administratif_financier: "Administratif & Financier",
    technique: "Technique",
    grand_projet_developpement: "Grand Projet & Développement",
    logistique: "Logistique"
  };

  useEffect(() => {
    calculatePayrollData();
  }, [selectedMonth, selectedDepartment, employees, absences, leaves, workLogs]);

  const calculatePayrollData = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

    let filteredEmployees = employees.filter(e => e.is_active && e.contract_type !== "Prestation");
    if (selectedDepartment !== 'all') {
      filteredEmployees = filteredEmployees.filter(e => e.department === selectedDepartment);
    }

    const data = filteredEmployees.map(employee => {
      // Heures de travail
      const employeeWorkLogs = workLogs.filter(w => 
        w.employee_id === employee.id && 
        w.date >= monthStartStr && 
        w.date <= monthEndStr
      );

      const totalHours = employeeWorkLogs.reduce((sum, log) => sum + (log.hours_worked || 0), 0);
      const workDays = employeeWorkLogs.length;
      const overtimeBalance = employeeWorkLogs.reduce((sum, log) => sum + (log.balance || 0), 0);
      const cumulativeBalance = employeeWorkLogs[employeeWorkLogs.length - 1]?.cumulative_balance || 0;

      // Absences du mois
      const employeeAbsences = absences.filter(a => 
        a.employee_id === employee.id && 
        a.status === 'approved' &&
        a.start_date <= monthEndStr && 
        a.end_date >= monthStartStr
      );

      const absenceDays = employeeAbsences.reduce((sum, abs) => {
        const absStart = abs.start_date >= monthStartStr ? abs.start_date : monthStartStr;
        const absEnd = abs.end_date <= monthEndStr ? abs.end_date : monthEndStr;
        return sum + calculateWorkingDays(absStart, absEnd);
      }, 0);

      // Congés du mois
      const employeeLeaves = leaves.filter(l => 
        l.employee_id === employee.id && 
        l.status === 'approved' &&
        l.start_date <= monthEndStr && 
        l.end_date >= monthStartStr
      );

      const leaveDays = employeeLeaves.reduce((sum, leave) => sum + (leave.total_days || 0), 0);

      // Jours ouvrables du mois
      const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const workableDays = allDaysInMonth.filter(day => !isWeekend(day)).length;

      // Calculs pour la paie
      const daysWorked = workDays;
      const daysToPay = daysWorked + leaveDays; // Jours travaillés + congés payés
      const daysToDeduct = absenceDays; // Absences à déduire

      // Anomalies
      const anomalies = [];
      if (totalHours > workableDays * 10) anomalies.push("Heures excessives");
      if (overtimeBalance > 40) anomalies.push("Heures sup. élevées");
      if (overtimeBalance < -40) anomalies.push("Heures négatives élevées");
      if (absenceDays > 10) anomalies.push("Absences élevées");

      return {
        employee,
        totalHours: parseFloat(totalHours.toFixed(2)),
        workDays,
        overtimeBalance: parseFloat(overtimeBalance.toFixed(2)),
        cumulativeBalance: parseFloat(cumulativeBalance.toFixed(2)),
        absenceDays,
        leaveDays,
        workableDays,
        daysToPay,
        daysToDeduct,
        absences: employeeAbsences,
        leaves: employeeLeaves,
        anomalies
      };
    });

    setPayrollData(data.sort((a, b) => {
      const nameA = `${a.employee.last_name} ${a.employee.first_name}`.toUpperCase();
      const nameB = `${b.employee.last_name} ${b.employee.first_name}`.toUpperCase();
      return nameA.localeCompare(nameB);
    }));
  };

  const toggleExpand = (employeeId) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  const exportToExcel = () => {
    const headers = [
      "Code", "Nom", "Prénom", "Poste", "Département",
      "Heures Travaillées", "Jours Ouvrés Travaillés", "Heures Sup/Déficit",
      "Jours Congés", "Jours Absences", "Jours à Payer", "Jours à Déduire",
      "Solde Cumulé Heures", "Anomalies"
    ];

    const rows = payrollData.map(data => [
      data.employee.employee_code || "",
      data.employee.last_name || "",
      data.employee.first_name || "",
      data.employee.position || "",
      departmentLabels[data.employee.department] || data.employee.department || "",
      data.totalHours,
      data.workDays,
      data.overtimeBalance,
      data.leaveDays,
      data.absenceDays,
      data.daysToPay,
      data.daysToDeduct,
      data.cumulativeBalance,
      data.anomalies.join(", ")
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport_paie_${selectedMonth}.csv`;
    link.click();
  };

  const exportToPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`Rapport Mensuel de Paie - ${format(new Date(selectedMonth), 'MMMM yyyy', { locale: fr })}`, 14, 15);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);
    doc.text(`Nombre d'employés: ${payrollData.length}`, 14, 28);

    const columns = [
      { header: 'Nom', dataKey: 'name' },
      { header: 'Poste', dataKey: 'position' },
      { header: 'H. Trav.', dataKey: 'hours' },
      { header: 'J. Trav.', dataKey: 'days' },
      { header: 'H. Sup', dataKey: 'overtime' },
      { header: 'Congés', dataKey: 'leaves' },
      { header: 'Abs.', dataKey: 'absences' },
      { header: 'À Payer', dataKey: 'toPay' },
      { header: 'À Déd.', dataKey: 'toDeduct' }
    ];

    const rows = payrollData.map(data => ({
      name: `${data.employee.last_name} ${data.employee.first_name}`,
      position: data.employee.position || '-',
      hours: data.totalHours,
      days: data.workDays,
      overtime: data.overtimeBalance,
      leaves: data.leaveDays,
      absences: data.absenceDays,
      toPay: data.daysToPay,
      toDeduct: data.daysToDeduct
    }));

    autoTable(doc, {
      startY: 35,
      columns: columns,
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`rapport_paie_${selectedMonth}.pdf`);
  };

  const totals = {
    employees: payrollData.length,
    totalHours: payrollData.reduce((sum, d) => sum + d.totalHours, 0),
    totalDays: payrollData.reduce((sum, d) => sum + d.workDays, 0),
    totalLeaves: payrollData.reduce((sum, d) => sum + d.leaveDays, 0),
    totalAbsences: payrollData.reduce((sum, d) => sum + d.absenceDays, 0),
    anomalies: payrollData.filter(d => d.anomalies.length > 0).length
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1 block">Mois</label>
              <MonthInput
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1 block">Département</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les départements</SelectItem>
                  {Object.entries(departmentLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques globales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-600 mb-1">Employés</p>
            <p className="text-2xl font-bold text-blue-900">{totals.employees}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-600 mb-1">Heures Totales</p>
            <p className="text-2xl font-bold text-purple-900">{totals.totalHours.toFixed(0)}h</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-cyan-50 to-cyan-100">
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 text-cyan-600 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-600 mb-1">Jours Travaillés</p>
            <p className="text-2xl font-bold text-cyan-900">{totals.totalDays}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-600 mb-1">Jours Congés</p>
            <p className="text-2xl font-bold text-green-900">{totals.totalLeaves}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4 text-center">
            <FileX className="w-6 h-6 text-orange-600 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-600 mb-1">Jours Absences</p>
            <p className="text-2xl font-bold text-orange-900">{totals.totalAbsences}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-600 mb-1">Anomalies</p>
            <p className="text-2xl font-bold text-red-900">{totals.anomalies}</p>
          </CardContent>
        </Card>
      </div>

      {/* Boutons d'export */}
      <div className="flex gap-4">
        <Button onClick={exportToExcel} className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl">
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
        <Button onClick={exportToPDF} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl">
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Liste des employés */}
      <div className="space-y-3">
        {payrollData.map((data) => {
          const isExpanded = expandedEmployees.has(data.employee.id);
          
          return (
            <Card key={data.employee.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow">
              <CardHeader 
                className="cursor-pointer hover:bg-slate-50 p-4"
                onClick={() => toggleExpand(data.employee.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                      <span className="text-purple-700 font-bold text-sm">
                        {data.employee.first_name?.[0]}{data.employee.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">
                        {data.employee.last_name?.toUpperCase()} {data.employee.first_name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {data.employee.position} • {departmentLabels[data.employee.department]}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-xs text-slate-500">Heures</p>
                        <p className="font-bold text-slate-900">{data.totalHours}h</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Jours</p>
                        <p className="font-bold text-slate-900">{data.workDays}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">À Payer</p>
                        <p className="font-bold text-green-700">{data.daysToPay}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">À Déduire</p>
                        <p className="font-bold text-red-700">{data.daysToDeduct}</p>
                      </div>
                    </div>
                    {data.anomalies.length > 0 && (
                      <Badge className="bg-red-100 text-red-700">
                        {data.anomalies.length} alerte{data.anomalies.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="p-4 border-t border-slate-100 bg-slate-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {/* Détails heures */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        Temps de Travail
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Heures travaillées:</span>
                          <span className="font-semibold">{data.totalHours}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Jours travaillés:</span>
                          <span className="font-semibold">{data.workDays}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Heures sup/déficit:</span>
                          <span className={`font-semibold ${data.overtimeBalance > 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {data.overtimeBalance > 0 ? '+' : ''}{data.overtimeBalance}h
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Solde cumulé:</span>
                          <span className={`font-semibold ${data.cumulativeBalance > 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {data.cumulativeBalance > 0 ? '+' : ''}{data.cumulativeBalance}h
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Congés */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-600" />
                        Congés ({data.leaveDays} jour{data.leaveDays > 1 ? 's' : ''})
                      </h4>
                      {data.leaves.length > 0 ? (
                        <div className="space-y-2">
                          {data.leaves.map((leave, idx) => (
                            <div key={idx} className="text-sm bg-green-50 rounded-lg p-2">
                              <div className="font-semibold text-green-900">
                                {leave.leave_period === 'collectif' ? 'Collectif' : 'Individuel'}
                              </div>
                              <div className="text-xs text-slate-600">
                                {leave.start_date && leave.end_date ? `${format(new Date(leave.start_date), 'dd/MM/yyyy')} - ${format(new Date(leave.end_date), 'dd/MM/yyyy')}` : '-'}
                              </div>
                              <div className="text-xs text-slate-600">{leave.total_days} JC</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Aucun congé ce mois-ci</p>
                      )}
                    </div>

                    {/* Absences */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <FileX className="w-4 h-4 text-orange-600" />
                        Absences ({data.absenceDays} jour{data.absenceDays > 1 ? 's' : ''})
                      </h4>
                      {data.absences.length > 0 ? (
                        <div className="space-y-2">
                          {data.absences.map((absence, idx) => (
                            <div key={idx} className="text-sm bg-orange-50 rounded-lg p-2">
                              <div className="font-semibold text-orange-900">
                                {absence.absence_type?.replace(/_/g, ' ')}
                              </div>
                              <div className="text-xs text-slate-600">
                                {absence.start_date && absence.end_date ? `${format(new Date(absence.start_date), 'dd/MM/yyyy')} - ${format(new Date(absence.end_date), 'dd/MM/yyyy')}` : '-'}
                              </div>
                              <div className="text-xs text-slate-600">{absence.total_days} jour(s)</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Aucune absence ce mois-ci</p>
                      )}
                    </div>
                  </div>

                  {/* Anomalies */}
                  {data.anomalies.length > 0 && (
                    <Alert className="mt-4 bg-red-50 border-red-200">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-900">
                        <strong>Anomalies détectées:</strong> {data.anomalies.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Synthèse paie */}
                  <div className="mt-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
                    <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Synthèse Paie
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Jours ouvrables du mois</p>
                        <p className="text-2xl font-bold text-slate-900">{data.workableDays}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Jours travaillés</p>
                        <p className="text-2xl font-bold text-blue-700">{data.workDays}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Jours à payer</p>
                        <p className="text-2xl font-bold text-green-700">{data.daysToPay}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Jours à déduire</p>
                        <p className="text-2xl font-bold text-red-700">{data.daysToDeduct}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {payrollData.length === 0 && (
        <Card className="shadow-lg border-0">
          <CardContent className="p-8 text-center text-slate-500">
            Aucune donnée disponible pour la période sélectionnée
          </CardContent>
        </Card>
      )}
    </div>
  );
}