import React, { useState, useEffect } from "react";
import RhPageHeader from "@/components/rh/RhPageHeader";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, MapPin, Search, Calendar, User } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function MissionsHistory() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    setLoading(true);
    const data = await base44.entities.ActivityReport.list("-start_date", 200);
    setMissions(data);
    setLoading(false);
  };

  const filtered = missions.filter(m => {
    const matchSearch =
      m.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.project_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.location?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || m.mission_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const enCours = missions.filter(m => m.mission_status === "en_cours").length;
  const terminees = missions.filter(m => m.mission_status === "terminee").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <RhPageHeader icon={Briefcase} title="Historique des Missions" subtitle="Missions en cours et terminées" />

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-50 to-cyan-100">
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-cyan-900">{missions.length}</p>
              <p className="text-sm text-slate-600 mt-1">Total</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-green-900">{enCours}</p>
              <p className="text-sm text-slate-600 mt-1">En cours</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-slate-700">{terminees}</p>
              <p className="text-sm text-slate-600 mt-1">Terminées</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, projet, localité..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="terminee">Terminées</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-cyan-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Aucune mission trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((mission, i) => (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-white">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-slate-400" />
                          <p className="font-bold text-slate-900">{mission.employee_name}</p>
                          <span className="text-slate-400 text-sm">({mission.employee_code})</span>
                        </div>
                        <p className="text-base font-semibold text-cyan-700 mb-2">{mission.project_name}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {mission.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Du {format(new Date(mission.start_date), "dd/MM/yyyy")}
                            {mission.end_date && ` au ${format(new Date(mission.end_date), "dd/MM/yyyy")}`}
                          </span>
                        </div>
                        {mission.description && (
                          <p className="text-sm text-slate-400 mt-2 italic">{mission.description}</p>
                        )}
                      </div>
                      <Badge className={
                        mission.mission_status === "en_cours"
                          ? "bg-green-100 text-green-700 border border-green-200 whitespace-nowrap"
                          : "bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap"
                      }>
                        {mission.mission_status === "en_cours" ? "🟢 En cours" : "✅ Terminée"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}