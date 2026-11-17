import React, { useMemo, useState } from "react";
import { Calendar, FileX } from "lucide-react";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { useWorkflowValidators } from "@/lib/workflowValidators";
import { ABSENCE_ALLOWANCE, CARD_GRID, RequestCard, SectionBlock, byDeparture, toDate } from "@/components/rh/RequestUi";

const FINISHED_PREVIEW = 3;

const isPending = (item) => String(item.status || "").startsWith("pending");

// Espace agent : soldes et demandes personnelles, avec le circuit de validation de chaque demande.
export default function MyRequests({ kind, requests, employee, loading, onRefresh }) {
  const validators = useWorkflowValidators();
  const [showAllFinished, setShowAllFinished] = useState(() => new URLSearchParams(window.location.search).has("demande"));
  const isLeave = kind === "leave";
  const Icon = isLeave ? Calendar : FileX;
  const noun = isLeave ? "congés" : "absences";

  const inProgress = useMemo(() => requests.filter(isPending).sort(byDeparture), [requests]);
  const finished = useMemo(() => {
    const decisionTime = (item) => toDate(item.review_date || item.approved_date || item.updated_date || item.created_date)?.getTime() || 0;
    return requests
      .filter((item) => !isPending(item))
      .sort((a, b) => decisionTime(b) - decisionTime(a));
  }, [requests]);
  const visibleFinished = showAllFinished ? finished : finished.slice(0, FINISHED_PREVIEW);

  const renderCard = (item) => (
    <RequestCard
      key={item.id}
      item={item}
      kind={kind}
      employeesById={employeesById}
      validators={validators}
      decisionMode={!isPending(item)}
      selfView
      note={isPending(item) ? "Pour modifier ou annuler cette demande, adressez-vous au service des Ressources Humaines." : undefined}
    />
  );

  const employeesById = employee ? { [employee.id]: employee } : {};
  const balances = !employee ? [] : isLeave
    ? [
        { label: "Solde janvier à novembre", value: employee.remaining_year_days ?? 15 },
        { label: "Solde décembre", value: employee.remaining_december_days ?? 15 },
      ]
    : [{ label: `Solde sur ${ABSENCE_ALLOWANCE} jours`, value: Math.max(0, ABSENCE_ALLOWANCE - (employee.absence_days_used || 0)) }];

  return (
    <div className="space-y-4 lg:space-y-6">
      <SectionBlock
        kind={kind}
        icon={Icon}
        title={`Mes ${noun}`}
        right={
          balances.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {balances.map(({ label, value }) => (
                <span key={label} className="text-xs font-semibold rounded-full px-3 py-1.5 bg-[var(--accent-soft)] text-[var(--accent)]">
                  {label} : <strong className="font-bold tabular-nums">{value} j</strong>
                </span>
              ))}
            </div>
          )
        }
      >
        <PullToRefresh onRefresh={onRefresh}>
        {loading ? (
          <p className="py-5 text-center text-sm text-slate-500" aria-busy="true">Chargement des demandes…</p>
        ) : requests.length === 0 ? (
          <p className="py-5 text-center font-semibold text-slate-600">Aucune demande pour le moment.</p>
        ) : (
          <div className="space-y-6">
            {inProgress.length > 0 && (
              <div>
                <h3 className="text-sm font-bold mb-3 text-[var(--accent)]">En cours ({inProgress.length})</h3>
                <div className={CARD_GRID}>{inProgress.map(renderCard)}</div>
              </div>
            )}
            {finished.length > 0 && (
              <div>
                <h3 className="text-sm font-bold mb-3 text-[var(--accent)]">Terminées ({finished.length})</h3>
                <div className={CARD_GRID}>{visibleFinished.map(renderCard)}</div>
                {finished.length > FINISHED_PREVIEW && (
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => setShowAllFinished((value) => !value)}
                      aria-expanded={showAllFinished}
                      className="rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-[var(--accent-ring)] bg-white text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    >
                      {showAllFinished ? "Réduire la liste" : `Voir les ${finished.length} demandes terminées`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </PullToRefresh>
      </SectionBlock>
    </div>
  );
}
