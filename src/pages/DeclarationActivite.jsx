import React, { useState, useEffect } from "react";
import RhPageHeader, { RH_ACTION_CLASS } from "@/components/rh/RhPageHeader";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, AlertCircle, Briefcase } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import ActivityForm from "@/components/activities/ActivityForm";
import ActivityList from "@/components/activities/ActivityList";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getEmployees, getMe, invalidateEmployees } from "@/lib/rhSession";

export default function DeclarationActivitePage() {
  const [employee, setEmployee] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [missionToEnd, setMissionToEnd] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const user = await getMe();
    const allEmployees = await getEmployees();
    const employeeData = allEmployees.find(
      (emp) =>
        emp.email?.toLowerCase() === user.email?.toLowerCase() ||
        emp.employee_code === user.employee_code
    );
    if (employeeData) {
      setEmployee(employeeData);
      const employeeActivities = await base44.entities.ActivityReport.filter(
        { employee_id: employeeData.id },
        "-start_date",
        100
      );
      setActivities(employeeActivities);
    }
    setLoading(false);
  };

  const handleSubmit = async (formData) => {
    // Créer la mission
    await base44.entities.ActivityReport.create({
      ...formData,
      employee_id: employee.id,
      employee_code: employee.employee_code,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      employee_email: employee.email,
      mission_status: "en_cours"
    });

    // Mettre l'employé en mode mission (pointage non requis)
    await base44.entities.Employee.update(employee.id, {
      work_mode: "mission",
      attendance_status: "Actif - Pointage non requis"
    }); invalidateEmployees();

    setShowForm(false);
    loadData();
  };

  const handleEndMission = (activity) => {
    setMissionToEnd(activity);
  };

  const confirmEndMission = async () => {
    if (!missionToEnd) return;
    const today = new Date().toISOString().split("T")[0];

    await base44.entities.ActivityReport.update(missionToEnd.id, {
      mission_status: "terminee",
      end_date: today
    });

    await base44.entities.Employee.update(employee.id, {
      work_mode: "bureau",
      attendance_status: "Actif - Pointage requis"
    }); invalidateEmployees();

    setMissionToEnd(null);
    loadData();
  };

  const handleDelete = async (activityId) => {
    if (!confirm("Supprimer cette mission ?")) return;
    await base44.entities.ActivityReport.delete(activityId);
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="max-w-md shadow-2xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <p className="text-slate-600">Profil employé non trouvé. Contactez le service RH.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeMission = activities.find((a) => a.mission_status === "en_cours");
  const pastMissions = activities.filter((a) => a.mission_status !== "en_cours");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <RhPageHeader icon={MapPin} eyebrow="Mon espace" title="Missions & Activités" subtitle="Déclarez vos missions et activités hors bureau"
          className="!mb-0"
          actions={!activeMission && !showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className={`w-full sm:w-auto ${RH_ACTION_CLASS}`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Mission
            </Button>
          )} />

        {/* Mission en cours (bannière) */}
        {activeMission && !showForm && (
          <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-100 uppercase mb-0.5">Mission en cours</p>
                  <p className="text-xl font-bold">{activeMission.project_name}</p>
                  <p className="text-sm text-blue-100">{activeMission.location}</p>
                </div>
              </div>
              <Button
                onClick={() => handleEndMission(activeMission)}
                className="bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl w-full sm:w-auto"
              >
                Fin de Mission
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Formulaire */}
        <AnimatePresence>
          {showForm && (
            <ActivityForm
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          )}
        </AnimatePresence>

        {/* Historique - uniquement les missions terminées */}
        {pastMissions.length > 0 && (
          <ActivityList
            activities={pastMissions}
            onEndMission={handleEndMission}
            onDelete={handleDelete}
            loading={false}
          />
        )}

        {/* Dialog confirmation fin de mission */}
        <Dialog open={!!missionToEnd} onOpenChange={(open) => !open && setMissionToEnd(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fin de mission</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600">
              Confirmer la fin de la mission <strong>{missionToEnd?.project_name}</strong> ? Vous serez réintégré dans le circuit de pointage.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMissionToEnd(null)}>Annuler</Button>
              <Button onClick={confirmEndMission} className="bg-blue-600 hover:bg-blue-700 text-white">Confirmer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {activities.length === 0 && !showForm && (
          <Card className="shadow-xl border-0">
            <CardContent className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium">Aucune mission enregistrée</p>
              <p className="text-sm text-slate-400 mt-1">Cliquez sur "Nouvelle Mission" pour déclarer votre départ.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}