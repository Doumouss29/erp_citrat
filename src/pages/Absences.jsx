import React, { useState, useEffect } from "react";
import { RH_ACTION_CLASS } from "@/components/rh/RhPageHeader";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, FileX } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import AbsenceForm from "@/components/absences/AbsenceForm";
import MyRequests from "@/components/rh/MyRequests";
import { submitRhRequest } from "@/lib/rhRequest";
import { getMe, getEmployees } from "@/lib/rhSession";

export default function AbsencesPage() {
  const [absences, setAbsences] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);



  const loadData = async () => {
    setLoading(true);
    try {
      const user = await getMe();
      setCurrentUser(user);
      
      // Charger les données en parallèle avec Promise.allSettled pour éviter les erreurs bloquantes
      const [absencesResult, employeesResult] = await Promise.allSettled([
        base44.entities.Absence.filter({ employee_email: user.email }, "-created_date", 50),
        getEmployees()
      ]);
      
      // Traiter les résultats
      if (absencesResult.status === 'fulfilled') {
        setAbsences(absencesResult.value || []);
      } else {
        console.error("Erreur absences:", absencesResult.reason);
        setAbsences([]);
      }
      
      if (employeesResult.status === 'fulfilled') {
        setEmployees(employeesResult.value || []);
      } else {
        console.error("Erreur employés:", employeesResult.reason);
        setEmployees([]);
      }
    } catch (error) {
      console.error("Erreur chargement:", error);
      setAbsences([]);
      setEmployees([]);
    }
    setLoading(false);
  };

  const handleSubmit = async (absenceData) => {
    try {
      // Dépôt côté serveur : statut, validateurs et identité de l'employé sont fixés par la fonction rhRequest.
      const newAbsence = await submitRhRequest("absence", absenceData);
      
      // Mise à jour instantanée de l'UI
      setAbsences([newAbsence, ...absences]);
      setShowForm(false);

    } catch (error) {
      console.error("Erreur création absence:", error);
      alert(`Erreur lors de la création de l'absence : ${error.message || "veuillez réessayer."}`);
    }
  };

  const currentEmployee = employees.find((e) => e.email?.toLowerCase() === currentUser?.email?.toLowerCase());


  return (
    <div className="bg-[#f1f6f7] px-3 py-2 sm:px-6 sm:py-3">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="flex justify-end">
          <Button
            onClick={() => setShowForm(true)}
            className={`w-full sm:w-auto h-11 px-5 ${RH_ACTION_CLASS}`}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Déclarer une Absence
          </Button>
        </div>

        <AnimatePresence>
          {showForm && (
            <AbsenceForm
              employees={employees}
              currentUser={currentUser}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          )}
        </AnimatePresence>

        <MyRequests kind="absence" requests={absences} employee={currentEmployee} loading={loading} onRefresh={loadData} />
      </div>
    </div>
  );
}