import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, ChevronRight, Home } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RhPageHeader from "@/components/rh/RhPageHeader";
import { APP_DEFS } from "@/lib/cgesnData";
import { DEPARTEMENTS } from "@/lib/rhReferentiels";
import { useEffectiveAccess } from "@/lib/accessProfiles";
import { missionDaysLeft } from "@/lib/externalAccess";
import { loadWorkflowValidators, resolveUserWorkflowLevel } from "@/lib/workflowValidators";

const norm = (value) => String(value || "").trim().toLowerCase();
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "d MMM yyyy", { locale: fr });
};
const STATUS_LABELS = {
  pending_level1: "À valider",
  pending_level2: "Attente RH",
  pending_level3: "Attente direction",
  approved: "Approuvée",
  rejected: "Refusée",
};

// Accueil RH des prestataires et consultants : mission, puis demandes à traiter s'ils sont validateurs.
export default function ExternalHome({ user, employee }) {
  const { access } = useEffectiveAccess(user);
  const [level, setLevel] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const validators = await loadWorkflowValidators();
        const userLevel = resolveUserWorkflowLevel(validators, user);
        if (!alive) return;
        setLevel(userLevel);
        if (!userLevel) return;
        const [leaves, absences] = await Promise.all([
          base44.entities.LeaveRequest.list("-created_date", 200),
          base44.entities.Absence.list("-created_date", 200),
        ]);
        if (!alive) return;
        const me = norm(user.email);
        const mine = (item) =>
          [item.level1_approver_email, item.level2_approver_email, item.level3_approver_email].some((email) => norm(email) === me);
        setRequests([
          ...(leaves || []).filter(mine).map((item) => ({ ...item, kindLabel: "Congé" })),
          ...(absences || []).filter(mine).map((item) => ({ ...item, kindLabel: "Absence" })),
        ].sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || ""))));
      } catch (error) {
        console.error("ExternalHome:", error);
        if (alive) setLoadError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  const fullName = employee ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim() : user?.full_name;
  const statusLabel = user?.grade === "consultant" ? "Consultant" : "Prestataire";
  const department = DEPARTEMENTS.find((d) => d.value === employee?.department)?.label;
  const daysLeft = missionDaysLeft(employee?.contract_end_date);
  const pendingStatus = level ? `pending_${level}` : null;
  const todo = requests.filter((item) => item.status === pendingStatus);
  const apps = APP_DEFS.filter((app) => access.includes(app.id));

  return (
    <div className="min-h-screen bg-slate-50">
      <RhPageHeader icon={Home} title="Accueil" subtitle={fullName} />
      <div className="max-w-3xl mx-auto p-3 sm:p-6 space-y-4">
        {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && (
          <div className="flex gap-3 items-start rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="w-5 h-5 flex-none" aria-hidden="true" />
            <p>Votre mission prend fin le {formatDate(employee.contract_end_date)}. Vos accès seront coupés après cette date.</p>
          </div>
        )}

        <Card>
          <CardContent className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div><p className="text-slate-500">Statut</p><p className="font-semibold text-slate-900">{statusLabel}</p></div>
            <div><p className="text-slate-500">Service</p><p className="font-semibold text-slate-900">{department || "—"}</p></div>
            <div><p className="text-slate-500">Fin de mission</p><p className="font-semibold text-slate-900">{formatDate(employee?.contract_end_date)}</p></div>
          </CardContent>
        </Card>

        {level && (
          <Card>
            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">À valider</p>
                <p className="text-3xl font-bold text-slate-900">{loading ? "…" : todo.length}</p>
              </div>
              <Button asChild className="rounded-xl w-full sm:w-auto">
                <Link to={createPageUrl("Validation")}><CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />Traiter les demandes</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {level && (
          <Card>
            <CardHeader className="p-4 sm:px-6 pb-0"><CardTitle className="text-base">Dernières demandes</CardTitle></CardHeader>
            <CardContent className="p-4 sm:px-6">
              {loadError && <p className="text-sm text-red-700">Les demandes n'ont pas pu être chargées. Réessayez plus tard.</p>}
              {!loadError && !loading && requests.length === 0 && <p className="text-sm text-slate-500">Aucune demande pour le moment.</p>}
              <ul className="divide-y divide-slate-100">
                {requests.slice(0, 5).map((item) => (
                  <li key={`${item.kindLabel}-${item.id}`}>
                    <Link to={createPageUrl("Validation")} className="flex items-center gap-3 py-3 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-slate-900 truncate">{item.employee_name}</span>
                        <span className="block text-slate-500">{item.kindLabel} · {formatDate(item.start_date)} au {formatDate(item.end_date)}</span>
                      </span>
                      <span className="flex-none text-xs text-slate-600">{STATUS_LABELS[item.status] || item.status}</span>
                      <ChevronRight className="w-4 h-4 flex-none text-slate-400" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {!level && !loading && (
          <Card>
            <CardHeader className="p-4 sm:px-6 pb-0"><CardTitle className="text-base">Vos applications</CardTitle></CardHeader>
            <CardContent className="p-4 sm:px-6 text-sm text-slate-700">
              {apps.length ? apps.map((app) => app.name).join(", ") : "Aucune application supplémentaire n'est attribuée à votre compte."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
