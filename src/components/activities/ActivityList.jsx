import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Briefcase, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export default function ActivityList({ activities, onEndMission, onDelete, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
            <div className="h-5 bg-slate-200 rounded w-1/2 mb-3"></div>
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="shadow-xl border-0">
        <CardContent className="p-12 text-center">
          <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg font-medium">Aucune mission enregistrée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-slate-700">Historique des missions</h3>
      <AnimatePresence>
        {activities.map((activity) => {
          const isActive = activity.mission_status === "en_cours";
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className={`shadow-lg border-0 ${isActive ? "border-l-4 border-l-blue-500" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? "bg-blue-100" : "bg-slate-100"}`}>
                        <Briefcase className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{activity.project_name}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {activity.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Départ : {format(new Date(activity.start_date), "dd/MM/yyyy")}
                          </span>
                          {activity.end_date && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Retour : {format(new Date(activity.end_date), "dd/MM/yyyy")}
                            </span>
                          )}
                        </div>
                        {activity.description && (
                          <p className="text-xs text-slate-500 mt-1 italic">{activity.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isActive ? (
                        <>
                          <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3 mr-1" />
                            En cours
                          </Badge>
                          <Button
                            onClick={() => onEndMission(activity)}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-xs px-3 py-2 h-auto"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Fin de Mission
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge className="bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Terminée
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}