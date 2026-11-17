import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileX } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { HISTORY_LABELS, reasonLabel, contractLabel, endDateOf, lifecycleOf } from "@/lib/departures";

// Parcours contractuel : embauche, renouvellements, changements de contrat, départ, réintégration
function ContractTimeline({ employee }) {
  if (!employee) return null;
  const d = (v) => (v ? format(new Date(v), "dd/MM/yyyy", { locale: fr }) : "");
  const stage = lifecycleOf(employee);
  const entries = [
    ...(employee.hire_date ? [{ date: employee.hire_date, action: "embauche", contract_type: employee.internship_type ? "" : "", start_date: employee.hire_date }] : []),
    ...(Array.isArray(employee.contract_history) ? employee.contract_history : [])
  ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const dot = { embauche: "bg-[#0f5c52]", renouvellement: "bg-teal-500", changement_contrat: "bg-indigo-500", depart: "bg-rose-500", reintegration: "bg-amber-500" };
  const end = endDateOf(employee);
  return (
    <Card className="border-slate-200 rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-slate-900">Parcours contractuel</CardTitle>
        <p className="text-sm text-slate-500">
          Contrat actuel : <b>{contractLabel(employee)}</b>
          {end && <> · fin le {d(end)}</>}
          {stage === "parti" && <> · <span className="text-rose-600 font-semibold">parti ({reasonLabel(employee.departure_reason)}{employee.departure_date ? `, le ${d(employee.departure_date)}` : ""})</span></>}
          {stage === "a_statuer" && <> · <span className="text-amber-600 font-semibold">décision à prendre (onglet Départs)</span></>}
        </p>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun événement enregistré.</p>
        ) : (
          <ol className="relative border-l-2 border-slate-100 ml-2 space-y-4">
            {entries.map((e, i) => (
              <li key={i} className="ml-4">
                <span className={`absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full ring-4 ring-white ${dot[e.action] || "bg-slate-400"}`} />
                <p className="text-sm font-semibold text-slate-900">
                  {HISTORY_LABELS[e.action] || e.action}
                  {e.contract_type && <span className="font-normal text-slate-600"> · {e.contract_type === "Stage" ? `Stage ${e.internship_type || ""}` : e.contract_type}</span>}
                  {e.action === "depart" && e.reason && <span className="font-normal text-slate-600"> · {reasonLabel(e.reason)}</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {d(e.date)}
                  {e.start_date && e.action !== "embauche" && <> · du {d(e.start_date)}</>}
                  {e.end_date && <> {e.action === "depart" ? "· départ le" : "au"} {d(e.end_date)}</>}
                  {e.by && <> · par {e.by}</>}
                </p>
                {e.notes && <p className="text-xs text-slate-600 mt-0.5">{e.notes}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export default function EmployeeHistory({ leaves, absences, loading, employee }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl"></div>
        ))}
      </div>
    );
  }

  const allHistory = [
    ...leaves.map(l => ({ ...l, type: 'leave' })),
    ...absences.map(a => ({ ...a, type: 'absence' }))
  ].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700"
  };

  const leaveTypeLabels = {
    conges_payes: "Congés payés",
    rtt: "RTT",
    conge_sans_solde: "Sans solde",
    conge_parental: "Parental",
    autre: "Autre"
  };

  const absenceTypeLabels = {
    maladie: "Maladie",
    accident_travail: "Accident travail",
    evenement_familial: "Événement familial",
    formation: "Formation",
    autre: "Autre"
  };

  return (
    <div className="space-y-4">
      <ContractTimeline employee={employee} />
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-10 h-10 text-green-600" />
              <div>
                <p className="text-sm text-slate-600">Total Congés</p>
                <p className="text-2xl font-bold text-green-900">{leaves.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileX className="w-10 h-10 text-orange-600" />
              <div>
                <p className="text-sm text-slate-600">Total Absences</p>
                <p className="text-2xl font-bold text-orange-900">{absences.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {allHistory.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">Aucun historique disponible</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allHistory.map((item, index) => (
            <Card 
              key={index} 
              className={`hover:shadow-lg transition-all ${
                item.type === 'leave' 
                  ? 'border-l-4 border-l-green-500 bg-green-50/30' 
                  : 'border-l-4 border-l-orange-500 bg-orange-50/30'
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      item.type === 'leave' ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      {item.type === 'leave' ? (
                        <Calendar className="w-5 h-5 text-green-600" />
                      ) : (
                        <FileX className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs ${
                          item.type === 'leave' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-orange-500 text-white'
                        }`}>
                          {item.type === 'leave' ? 'CONGÉ' : 'ABSENCE'}
                        </Badge>
                        <p className="font-bold text-slate-900">
                          {item.type === 'leave' 
                            ? leaveTypeLabels[item.leave_type] || item.leave_type
                            : absenceTypeLabels[item.absence_type] || item.absence_type
                          }
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {format(new Date(item.start_date), "dd/MM/yyyy", { locale: fr })} - {format(new Date(item.end_date), "dd/MM/yyyy", { locale: fr })}
                        {item.total_days && <span className="ml-2">({item.total_days} jours)</span>}
                      </p>
                    </div>
                  </div>
                  <Badge className={statusColors[item.status]}>
                    {item.status === 'pending' ? 'En attente' : item.status === 'approved' ? 'Approuvé' : 'Refusé'}
                  </Badge>
                </div>
                {item.reason && (
                  <p className="text-sm text-slate-600 mt-2">
                    <strong>Motif:</strong> {item.reason}
                  </p>
                )}
                {item.review_comment && (
                  <p className="text-sm text-slate-600 mt-2">
                    <strong>Commentaire RH:</strong> {item.review_comment}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}