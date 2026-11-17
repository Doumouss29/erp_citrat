import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileX, Calendar, Check, X, Paperclip, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { safeUrl } from "@/lib/safeUrl";

export default function PendingApprovals({ absences, leaves, onApproval, loading }) {
  if (loading) {
    return (
      <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100 p-6">
          <CardTitle className="text-xl font-bold">Demandes en Attente</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full mb-4" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100 p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">Demandes en Attente</CardTitle>
          <Badge className="bg-yellow-500 shadow-sm">
            {absences.length + leaves.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="absences">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="absences" className="data-[state=active]:bg-white rounded-lg">
              <FileX className="w-4 h-4 mr-2" />
              Absences ({absences.length})
            </TabsTrigger>
            <TabsTrigger value="leaves" className="data-[state=active]:bg-white rounded-lg">
              <Calendar className="w-4 h-4 mr-2" />
              Congés ({leaves.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="absences" className="space-y-4">
            {absences.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">Aucune absence en attente</p>
              </div>
            ) : (
              absences.map((absence) => (
                <div key={absence.id} className="border-2 border-slate-100 rounded-xl p-4 hover:border-orange-200 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{absence.employee_name}</p>
                      <p className="text-sm text-slate-500">
                        {format(parseISO(absence.start_date), "d MMM", { locale: fr })} - {format(parseISO(absence.end_date), "d MMM", { locale: fr })}
                      </p>
                      {absence.reason && (
                        <p className="text-sm text-slate-600 mt-2">
                          <span className="font-semibold">Motif:</span> {absence.reason}
                        </p>
                      )}
                      {absence.justification_file_url && (
                        <a
                          href={safeUrl(absence.justification_file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2 font-medium"
                        >
                          <Paperclip className="w-4 h-4" />
                          Voir le justificatif
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">
                      {absence.absence_type}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onApproval("absence", absence.id, "approved", "")}
                      className="flex-1 bg-green-600 hover:bg-green-700 rounded-lg"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onApproval("absence", absence.id, "rejected", "")}
                      className="flex-1 rounded-lg"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Refuser
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="leaves" className="space-y-4">
            {leaves.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">Aucun congé en attente</p>
              </div>
            ) : (
              leaves.map((leave) => {
                const currentLevel = leave.status === "pending_level1" ? 1 : 
                                    leave.status === "pending_level2" ? 2 :
                                    leave.status === "pending_level3" ? 3 : 0;
                
                return (
                  <div key={leave.id} className="border-2 border-slate-100 rounded-xl p-4 hover:border-green-200 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-slate-900">{leave.employee_name}</p>
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            Niveau {currentLevel}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500">
                          {format(parseISO(leave.start_date), "d MMM", { locale: fr })} - {format(parseISO(leave.end_date), "d MMM", { locale: fr })}
                          <span className="ml-2">• {leave.total_days} jours</span>
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {leave.leave_period === "decembre" ? "Congés Décembre" : "Congés Annuels"}
                        </p>
                        {leave.reason && (
                          <p className="text-sm text-slate-600 mt-2">
                            <span className="font-semibold">Motif:</span> {leave.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => onApproval("leave", leave.id, "approved", "")}
                        className="flex-1 bg-green-600 hover:bg-green-700 rounded-lg"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Valider Niveau {currentLevel}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onApproval("leave", leave.id, "rejected", "")}
                        className="flex-1 rounded-lg"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Refuser
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}