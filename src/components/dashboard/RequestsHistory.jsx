import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileX, Calendar, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";

export default function RequestsHistory({ absences = [], leaves = [] }) {
  const [filter, setFilter] = useState("pending");

  const allRequests = [
    ...absences.map(a => ({ ...a, type: 'absence' })),
    ...leaves.map(l => ({ ...l, type: 'leave' }))
  ].filter(r => {
    if (filter === "pending") return r.status === "pending";
    if (filter === "approved") return r.status === "approved";
    if (filter === "rejected") return r.status === "rejected";
    return false;
  }).sort((a, b) => new Date(b.requested_date || b.created_date) - new Date(a.requested_date || a.created_date));

  const getStatusBadge = (status) => {
    if (status === "pending") {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          En attente
        </Badge>
      );
    }
    if (status === "approved") {
      return (
        <Badge className="bg-green-100 text-green-700 border border-green-300">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Approuvée
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-700 border border-red-300">
        <XCircle className="w-3 h-3 mr-1" />
        Refusée
      </Badge>
    );
  };

  const totalLeaves = leaves.length;
  const totalAbsences = absences.length;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-xl border-0 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Total Congés</p>
                  <p className="text-4xl font-bold text-green-900">{totalLeaves}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-xl border-0 bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <FileX className="w-7 h-7 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Total Absences</p>
                  <p className="text-4xl font-bold text-orange-900">{totalAbsences}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="shadow-xl border-0 bg-white">
        <CardContent className="p-6">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-slate-100 p-1 rounded-xl w-full">
              <TabsTrigger value="pending" className="data-[state=active]:bg-white rounded-lg flex-1">
                En attente
              </TabsTrigger>
              <TabsTrigger value="approved" className="data-[state=active]:bg-white rounded-lg flex-1">
                Approuvées
              </TabsTrigger>
              <TabsTrigger value="rejected" className="data-[state=active]:bg-white rounded-lg flex-1">
                Refusées
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {allRequests.length === 0 ? (
          <Card className="shadow-xl border-0 bg-white">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">Aucune demande à afficher</p>
            </CardContent>
          </Card>
        ) : (
          allRequests.map((request) => (
            <motion.div
              key={`${request.type}-${request.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={`shadow-lg border-0 border-l-4 ${
                request.type === 'leave' ? 'border-l-green-500' : 'border-l-orange-500'
              }`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        request.type === 'leave' ? 'bg-green-50' : 'bg-orange-50'
                      }`}>
                        {request.type === 'leave' ? (
                          <Calendar className="w-6 h-6 text-green-600" />
                        ) : (
                          <FileX className="w-6 h-6 text-orange-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${
                            request.type === 'leave' 
                              ? 'bg-green-600 text-white' 
                              : 'bg-orange-600 text-white'
                          } font-bold`}>
                            {request.type === 'leave' ? 'CONGÉ' : 'ABSENCE'}
                          </Badge>
                          {request.type === 'leave' && (
                            <Badge className={`${
                              request.leave_period === "decembre" 
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {request.leave_period === "decembre" ? "Décembre" : "Année"}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="font-bold text-lg text-slate-900 mb-1">
                          {request.employee_name}
                        </p>
                        
                        {request.type === 'absence' && (
                          <p className="text-sm text-slate-600 mb-2">{request.absence_type}</p>
                        )}
                        
                        <p className="text-sm text-slate-600 mb-1">
                          {format(new Date(request.start_date), "dd/MM/yyyy")} - {format(new Date(request.end_date), "dd/MM/yyyy")} ({request.total_days} jours)
                        </p>
                        
                        {request.reason && (
                          <div className="mt-3 bg-slate-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-slate-600 mb-1">Motif:</p>
                            <p className="text-sm text-slate-700">{request.reason}</p>
                          </div>
                        )}

                        {request.review_comment && (
                          <div className={`mt-3 rounded-lg p-3 border ${
                            request.type === 'leave' 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-orange-50 border-orange-200'
                          }`}>
                            <p className={`text-xs font-semibold mb-1 ${
                              request.type === 'leave' ? 'text-green-700' : 'text-orange-700'
                            }`}>
                              Commentaire RH:
                            </p>
                            <p className="text-sm text-slate-700">{request.review_comment}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Par {request.reviewed_by}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}