import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, Calendar, FileX, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function EmployeeHistoryButton({ employee, absences, leaves, workLogs, monthStart, monthEnd }) {
  const statusColors = {
    approved: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    rejected: "bg-red-100 text-red-700",
    pending_level1: "bg-orange-100 text-orange-700",
    pending_level2: "bg-orange-100 text-orange-700",
    pending_level3: "bg-orange-100 text-orange-700"
  };

  const statusIcons = {
    approved: CheckCircle,
    pending: AlertCircle,
    rejected: XCircle,
    pending_level1: AlertCircle,
    pending_level2: AlertCircle,
    pending_level3: AlertCircle
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-2 border-violet-200 hover:bg-violet-50 hover:text-violet-700"
        >
          <Eye className="w-4 h-4 mr-2" />
          Voir Historique
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center">
              <span className="text-violet-700 font-bold text-sm">
                {employee.first_name?.[0]}{employee.last_name?.[0]}
              </span>
            </div>
            <div>
              <div className="font-bold text-slate-900">
                {employee.last_name?.toUpperCase()} {employee.first_name}
              </div>
              <div className="text-sm text-slate-500 font-normal">
                Historique {format(new Date(monthStart), 'MMMM yyyy', { locale: fr })}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Logs de Travail */}
          {workLogs.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Logs de Travail ({workLogs.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {workLogs
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((log) => (
                    <div 
                      key={log.id} 
                      className="bg-blue-50 rounded-lg p-3 border border-blue-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-blue-900">
                          {format(new Date(log.date), 'dd/MM/yyyy')}
                        </span>
                        <Badge className="bg-blue-100 text-blue-700">
                          {log.hours_worked || 0}h travaillées
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-600">Entrée: </span>
                          <span className="font-semibold text-slate-900">{log.entry_time || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Sortie: </span>
                          <span className="font-semibold text-slate-900">{log.exit_time || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Balance: </span>
                          <span className={`font-semibold ${(log.balance || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {(log.balance || 0) >= 0 ? '+' : ''}{(log.balance || 0).toFixed(1)}h
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-600">Cumul: </span>
                          <span className={`font-semibold ${(log.cumulative_balance || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {(log.cumulative_balance || 0) >= 0 ? '+' : ''}{(log.cumulative_balance || 0).toFixed(1)}h
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Message si pas de données */}
          {workLogs.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p>Aucune donnée disponible pour cette période</p>
            </div>
          )}
          
          {/* Absences - Hidden */}
          {false && absences.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileX className="w-5 h-5 text-orange-600" />
                Absences ({absences.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {absences
                  .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                  .map((absence) => {
                    const StatusIcon = statusIcons[absence.status] || AlertCircle;
                    return (
                      <div 
                        key={absence.id} 
                        className="bg-orange-50 rounded-lg p-3 border border-orange-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-orange-900">
                            {absence.absence_type}
                          </span>
                          <Badge className={statusColors[absence.status] || "bg-slate-100 text-slate-700"}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {absence.status === 'approved' ? 'Approuvée' : 
                             absence.status === 'rejected' ? 'Refusée' : 
                             'En attente'}
                          </Badge>
                        </div>
                        <div className="text-xs space-y-1">
                          <div>
                            <span className="text-slate-600">Période: </span>
                            <span className="font-semibold text-slate-900">
                              {format(new Date(absence.start_date), 'dd/MM/yyyy')} - {format(new Date(absence.end_date), 'dd/MM/yyyy')}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Durée: </span>
                            <span className="font-semibold text-orange-900">{absence.total_days} jours</span>
                          </div>
                          {absence.reason && (
                            <div>
                              <span className="text-slate-600">Motif: </span>
                              <span className="text-slate-900">{absence.reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Congés - Hidden */}
          {false && leaves.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Congés ({leaves.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {leaves
                  .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                  .map((leave) => {
                    const StatusIcon = statusIcons[leave.status] || AlertCircle;
                    return (
                      <div 
                        key={leave.id} 
                        className="bg-green-50 rounded-lg p-3 border border-green-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-green-900">
                            {leave.leave_period === 'collectif' ? 'Congé Collectif (Déc.)' : 'Congé Individuel'}
                          </span>
                          <Badge className={statusColors[leave.status] || "bg-slate-100 text-slate-700"}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {leave.status === 'approved' ? 'Approuvé' : 
                             leave.status === 'rejected' ? 'Refusé' : 
                             'En attente'}
                          </Badge>
                        </div>
                        <div className="text-xs space-y-1">
                          <div>
                            <span className="text-slate-600">Période: </span>
                            <span className="font-semibold text-slate-900">
                              {format(new Date(leave.start_date), 'dd/MM/yyyy')} - {format(new Date(leave.end_date), 'dd/MM/yyyy')}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Durée: </span>
                            <span className="font-semibold text-green-900">{leave.total_days} jours calendaires</span>
                          </div>
                          {leave.reason && (
                            <div>
                              <span className="text-slate-600">Motif: </span>
                              <span className="text-slate-900">{leave.reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}