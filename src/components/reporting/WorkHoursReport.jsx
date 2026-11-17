import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileDown, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function WorkHoursReport({ workLogs, employees, loading, onExportCSV, onExportPDF }) {
  if (loading) {
    return (
      <Card className="shadow-xl border-0 bg-white">
        <CardHeader className="border-b border-slate-100">
          <div className="h-8 bg-slate-200 animate-pulse rounded w-1/3"></div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalHours = workLogs.reduce((sum, log) => sum + (log.hours_worked || 0), 0);
  const avgHours = workLogs.length > 0 ? (totalHours / workLogs.length).toFixed(2) : 0;
  const totalBalance = workLogs.reduce((sum, log) => sum + (log.balance || 0), 0);

  const topPerformers = [...workLogs]
    .sort((a, b) => (b.cumulative_balance || 0) - (a.cumulative_balance || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-white">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Rapport des Heures de Travail</CardTitle>
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
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
              <p className="text-sm font-semibold text-slate-600 mb-2">Total Heures Travaillées</p>
              <p className="text-3xl font-bold text-blue-900">{totalHours.toFixed(2)}h</p>
              <p className="text-sm text-slate-600 mt-2">Sur {workLogs.length} jour(s)</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-6 border border-purple-200">
              <p className="text-sm font-semibold text-slate-600 mb-2">Moyenne Quotidienne</p>
              <p className="text-3xl font-bold text-purple-900">{avgHours}h</p>
              <p className="text-sm text-slate-600 mt-2">Base: 8h/jour</p>
            </div>
            <div className={`rounded-2xl p-6 border ${
              totalBalance >= 0 
                ? 'bg-red-50 border-red-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <p className="text-sm font-semibold text-slate-600 mb-2">Balance Totale</p>
              <p className={`text-3xl font-bold ${
                totalBalance >= 0 ? 'text-red-900' : 'text-green-900'
              }`}>
                {totalBalance >= 0 ? '' : '+'}{totalBalance.toFixed(2)}h
              </p>
              <p className="text-sm text-slate-600 mt-2">
                {totalBalance >= 0 ? 'En retard' : 'En avance'}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Top 5 - Balance Positive</h3>
            <div className="space-y-3">
              {topPerformers.map((log, index) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{log.employee_name}</p>
                      <p className="text-sm text-slate-600">{format(new Date(log.date), "dd/MM/yyyy", { locale: fr })}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-600 text-white text-lg px-4 py-2">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    +{Math.abs(log.cumulative_balance)}h
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Détail des Heures ({workLogs.length} entrées)</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {workLogs.map((log) => (
                <div key={log.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-900">{log.employee_name}</p>
                      <p className="text-sm text-slate-500">
                        {format(new Date(log.date), "EEEE dd MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">{log.entry_time} → {log.exit_time}</p>
                      <p className="font-bold text-lg text-slate-900">{log.hours_worked}h</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                    <Badge className={`${
                      log.balance >= 0 
                        ? "bg-red-100 text-red-700" 
                        : "bg-green-100 text-green-700"
                    } text-sm font-semibold`}>
                      {log.balance >= 0 ? <TrendingDown className="w-4 h-4 mr-1" /> : <TrendingUp className="w-4 h-4 mr-1" />}
                      {log.balance >= 0 ? '' : '+'}{log.balance}h
                    </Badge>
                    <div className="h-4 w-px bg-slate-300" />
                    <div className="text-sm">
                      <span className="text-slate-600">Cumul: </span>
                      <span className={`font-bold ${
                        log.cumulative_balance >= 0 ? "text-red-600" : "text-green-600"
                      }`}>
                        {log.cumulative_balance >= 0 ? '' : '+'}{log.cumulative_balance}h
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}