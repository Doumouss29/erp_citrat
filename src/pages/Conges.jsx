import React, { useState, useEffect } from "react";
import { RH_ACTION_CLASS } from "@/components/rh/RhPageHeader";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import LeaveForm from "@/components/leaves/LeaveForm";
import MyRequests from "@/components/rh/MyRequests";
import { submitRhRequest } from "@/lib/rhRequest";
import { getMe, getEmployees } from "@/lib/rhSession";


export default function CongesPage() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
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
      
      // Charger uniquement les congés de l'utilisateur (limite 50)
      const leavesData = await base44.entities.LeaveRequest.filter(
        { employee_email: user.email }, 
        "-created_date", 
        50
      );
      setLeaves(leavesData);
      
      // Charger les employés avec limite
      const allEmployees = await getEmployees();
      const employee = allEmployees.find(emp => 
        emp.email?.toLowerCase() === user.email?.toLowerCase() ||
        emp.employee_code === user.employee_code
      );
      setCurrentEmployee(employee);
      setEmployees(employee ? [employee] : []);
    } catch (error) {
      console.error("Erreur chargement:", error);
      alert("Erreur de connexion. Veuillez réessayer.");
    }
    setLoading(false);
  };

  const handleSubmit = async (leaveData) => {
    let newLeave;
    try {
      // Dépôt côté serveur : statut, validateurs et identité de l'employé sont fixés par la fonction rhRequest.
      newLeave = await submitRhRequest("leave", leaveData);
    } catch (error) {
      alert(`Demande non enregistrée : ${error.message}`);
      return;
    }
    setLeaves([newLeave, ...leaves]);
    setShowForm(false);

  };

  return (
    <div className="bg-[#f1f6f7] px-3 py-2 sm:px-6 sm:py-3">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="flex justify-end">
          <Button
            onClick={() => setShowForm(true)}
            className={`w-full sm:w-auto h-11 px-5 ${RH_ACTION_CLASS}`}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Nouvelle Demande
          </Button>
        </div>

        <AnimatePresence>
          {showForm && (
            <LeaveForm
              employees={employees}
              currentUser={currentUser}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          )}
        </AnimatePresence>

        <MyRequests kind="leave" requests={leaves} employee={currentEmployee} loading={loading} onRefresh={loadData} />
      </div>
    </div>
  );
}