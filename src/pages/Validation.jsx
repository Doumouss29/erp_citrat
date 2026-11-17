import { FormSelect } from "@/components/ui/form-select";
import React, { useState, useEffect, useMemo } from "react";
import RhPageHeader, { RH_GOLD, RH_GRADIENT } from "@/components/rh/RhPageHeader";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowLeft, Calendar, CheckCircle, CheckCircle2, ChevronDown, Clock, FileX, Search, User, XCircle } from "lucide-react";
import { loadWorkflowValidators, resolveUserWorkflowLevel, isReadOnlyValidator } from "@/lib/workflowValidators";
import {
  BandTile, BandTitle, CARD_GRID, PENDING_STATUSES, RequestCard, SectionBlock, THEMES,
  byDeparture, decisionOutcome, departureInfo, expectedValidator, formatDate, needsControl, norm, toDate,
} from "@/components/rh/RequestUi";
import { reviewRhRequest } from "@/lib/rhRequest";
import { canAccessRh } from "@/lib/rhAccess";
import { getMe, getEmployees } from "@/lib/rhSession";

const HISTORY_PAGE_SIZE = 50;

export default function ValidationPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [validators, setValidators] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [employeesById, setEmployeesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("todo");
  const [historyType, setHistoryType] = useState("conges");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [historySearch, setHistorySearch] = useState("");
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_SIZE);
  const [showTracking, setShowTracking] = useState(false);
  const [reviewDialog, setReviewDialog] = useState(null);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await getMe();
      setCurrentUser(user);
      setValidators(await loadWorkflowValidators());

      const [allLeaves, allAbsences, employees] = await Promise.all([
        base44.entities.LeaveRequest.list("-created_date", 1000),
        base44.entities.Absence.list("-created_date", 1000),
        // La RLS limite la lecture des fiches : le solde n'apparaît que lorsque la fiche est accessible.
        getEmployees().catch(() => []),
      ]);

      if (canAccessRh(user)) {
        setLeaves(allLeaves || []);
        setAbsences(allAbsences || []);
      } else {
        const me = norm(user.email);
        const isMyValidation = (request) =>
          [request.level1_approver_email, request.level2_approver_email, request.level3_approver_email]
            .some((email) => norm(email) === me);
        setLeaves((allLeaves || []).filter(isMyValidation));
        setAbsences((allAbsences || []).filter(isMyValidation));
      }
      setEmployeesById(Object.fromEntries((employees || []).map((employee) => [employee.id, employee])));
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const validationLevel = resolveUserWorkflowLevel(validators, currentUser);
  const readOnly = isReadOnlyValidator(validators, currentUser);

  const isOwnRequest = (item) => {
    const me = norm(currentUser?.email);
    return !!me && norm(item.employee_email) === me;
  };

  const isAwaitingMe = (item) => {
    if (!PENDING_STATUSES.includes(item.status) || !validationLevel) return false;
    if (validationLevel === "admin" || validationLevel === "read_only") return true;
    return item.status === `pending_${validationLevel}`;
  };

  const leaveTodo = useMemo(() => leaves.filter(isAwaitingMe).sort(byDeparture), [leaves, validationLevel]);
  const absenceTodo = useMemo(() => absences.filter(isAwaitingMe).sort(byDeparture), [absences, validationLevel]);

  const openDecision = (item, itemKind, approved) => {
    if (readOnly) return;
    setComment("");
    setCommentError("");
    setReviewDialog({ item, kind: itemKind, approved });
  };

  const closeDecision = () => {
    if (submitting) return;
    setReviewDialog(null);
    setComment("");
    setCommentError("");
  };

  const handleReview = async () => {
    if (!reviewDialog || submitting || readOnly) return;
    const { item, kind: itemKind, approved } = reviewDialog;
    const cleanComment = comment.trim();

    if (!approved && !cleanComment) {
      setCommentError("Indiquez le motif du refus.");
      return;
    }

    setSubmitting(true);
    try {
      // La décision (statut, niveaux, soldes) est appliquée côté serveur, qui vérifie
      // que l'utilisateur est bien le validateur attendu pour ce niveau.
      await reviewRhRequest(itemKind, item.id, approved, cleanComment);

      setReviewDialog(null);
      setComment("");
      setCommentError("");
      await loadData();
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
      alert(`Erreur lors de la validation: ${error.message || "Erreur inconnue"}. Veuillez réessayer ou contacter le support.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-[#0d5c66] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!validationLevel) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <Card className="max-w-md shadow-2xl">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Accès Refusé</h2>
            <p className="text-slate-600">Vous n'avez pas les permissions pour accéder à cette page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const blocks = [
    { id: "conges", kind: "leave", title: "Congés", name: "congé", Icon: Calendar, all: leaves, todo: leaveTodo },
    { id: "absences", kind: "absence", title: "Absences", name: "absence", Icon: FileX, all: absences, todo: absenceTodo },
  ];
  const allTodo = blocks.flatMap((block) => block.todo.map((item) => ({ item, itemKind: block.kind })));
  const totalTodo = allTodo.length;
  const urgentCount = allTodo.filter(({ item }) => departureInfo(item).urgent).length;
  const controlCount = allTodo.filter(({ item, itemKind }) => needsControl(itemKind, item, employeesById)).length;
  const allRequests = [...leaves, ...absences];
  const approvedCount = allRequests.filter((item) => item.status === "approved").length;
  const rejectedCount = allRequests.filter((item) => item.status === "rejected").length;

  const historyFor = (list) => {
    const search = norm(historySearch);
    const decisionTime = (item) => toDate(item.review_date || item.approved_date || item.updated_date || item.created_date)?.getTime() || 0;
    return list
      .filter((item) => (historyStatus === "all" ? ["approved", "rejected"].includes(item.status) : item.status === historyStatus))
      .filter((item) => !search || norm(item.employee_name).includes(search))
      .sort((a, b) => decisionTime(b) - decisionTime(a));
  };
  const openHistory = (status) => {
    setHistoryStatus(status);
    setHistoryLimit(HISTORY_PAGE_SIZE);
    setView("history");
  };
  const goToBlock = (id) => {
    setView("todo");
    setTimeout(() => document.getElementById(`bloc-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const orderPill = <span className="text-xs font-semibold rounded-full px-3 py-1" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>Départs les plus proches en premier</span>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <RhPageHeader
          className="!mb-0"
          icon={CheckCircle}
          title="Validation des Demandes"
          mobileTitle="Validations"
        />

        <section className="relative overflow-hidden rounded-2xl text-[#0D5C66] shadow-sm border border-[#DFE8EA]" style={{ background: "#F3F7F8" }}>
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl" style={{ background: "rgba(13,92,102,0.025)" }} aria-hidden="true" />
          <div className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-[#E8F2F3]/30 blur-3xl" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${RH_GOLD}, transparent)` }} aria-hidden="true" />
          <div className="relative grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 [&_.group]:py-3">
            <div className="p-4 sm:p-5">
              <BandTitle
                right={totalTodo > 0
                  ? <span className="rounded-full text-[11px] font-bold px-2.5 py-1" style={{ background: "#E8F2F3", color: "#0D5C66" }}>{totalTodo} en attente</span>
                  : <span className="inline-flex items-center gap-1 rounded-full bg-white ring-1 ring-[#DFE8EA] text-[#0D5C66] text-[11px] font-bold px-2.5 py-1"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />À jour</span>}
              >
                À traiter
              </BandTitle>
              <div className="space-y-2.5">
                <BandTile label="Demandes de congé" sub={leaveTodo.length ? "En attente de validation" : "Aucune demande"} value={leaveTodo.length} Icon={Calendar} highlight={leaveTodo.length > 0} onClick={() => goToBlock("conges")} />
                <BandTile label="Demandes d'absence" sub={absenceTodo.length ? "En attente de validation" : "Aucune demande"} value={absenceTodo.length} Icon={FileX} highlight={absenceTodo.length > 0} onClick={() => goToBlock("absences")} />
              </div>
            </div>
            <div className="p-4 sm:p-5 border-t md:border-t-0 md:border-l border-[#DFE8EA]">
              <BandTitle>Priorités</BandTitle>
              <div className="space-y-2.5">
                <BandTile label="Départs sous 48 h" sub="Demandes urgentes" value={urgentCount} Icon={Clock} highlight={urgentCount > 0} />
                <BandTile label="Points à contrôler" sub="Solde ou justificatif" value={controlCount} Icon={AlertTriangle} highlight={controlCount > 0} />
              </div>
            </div>
            <div className="p-4 sm:p-5 md:col-span-2 xl:col-span-1 border-t xl:border-t-0 xl:border-l border-[#DFE8EA]">
              <BandTitle>Historique · Congés et absences</BandTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-2.5">
                <BandTile label="Approuvées" sub="Voir les demandes" value={approvedCount} Icon={CheckCircle2} selected={view === "history" && historyStatus === "approved"} onClick={() => openHistory("approved")} />
                <BandTile label="Refusées" sub="Voir les demandes" value={rejectedCount} Icon={XCircle} selected={view === "history" && historyStatus === "rejected"} onClick={() => openHistory("rejected")} />
              </div>
            </div>
          </div>
        </section>

        {view === "todo" ? (
          <>
            {blocks.map(({ id, kind, title, name, Icon, all, todo }) => {
              const tracking = all.filter((item) => PENDING_STATUSES.includes(item.status) && !isAwaitingMe(item)).sort(byDeparture);
              return (
                <div key={id} id={`bloc-${id}`} className="scroll-mt-4 space-y-4">
                  <SectionBlock kind={kind} icon={Icon} title={`${title} à traiter (${todo.length})`} right={todo.length > 1 ? orderPill : null}>
                    {todo.length === 0 ? (
                      <p className="py-6 text-center font-semibold text-slate-600">Aucune demande de {name} à traiter</p>
                    ) : (
                      <div className={CARD_GRID}>
                        {todo.map((item) => (
                          <RequestCard key={item.id} item={item} kind={kind} employeesById={employeesById} validators={validators} canDecide={!isOwnRequest(item)} showActions={!readOnly} onDecide={openDecision} />
                        ))}
                      </div>
                    )}
                    {tracking.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[#0d5c66]/10">
                        <button type="button" onClick={() => setShowTracking((value) => !value)} aria-expanded={showTracking} className="inline-flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: "var(--accent)" }}>
                          Suivi du circuit ({tracking.length})
                          <ChevronDown className={`w-4 h-4 transition-transform ${showTracking ? "rotate-180" : ""}`} aria-hidden="true" />
                        </button>
                        {showTracking && (
                          <div className={`${CARD_GRID} mt-3`}>
                            {tracking.map((item) => (
                              <RequestCard key={item.id} item={item} kind={kind} employeesById={employeesById} validators={validators} onDecide={openDecision} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </SectionBlock>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button onClick={() => setView("todo")} className="sm:mr-auto h-11 px-5 rounded-xl border-0 bg-[#0d5c66] hover:bg-[#0e4b53] text-white font-bold shadow-sm ring-1 ring-[#d4af6a]/50">
                <ArrowLeft className="w-5 h-5 mr-2" style={{ color: RH_GOLD }} aria-hidden="true" />
                Retour aux demandes à traiter
                {totalTodo > 0 && (
                  <span className="ml-2.5 min-w-6 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums" style={{ background: RH_GOLD, color: "#0e4b53" }}>{totalTodo}</span>
                )}
              </Button>
              <label className="relative">
                <span className="sr-only">Rechercher un agent</span>
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input type="search" value={historySearch} onChange={(e) => { setHistorySearch(e.target.value); setHistoryLimit(HISTORY_PAGE_SIZE); }} placeholder="Rechercher un agent" className="w-full sm:w-56 h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm" />
              </label>
              <label>
                <span className="sr-only">Filtrer par statut</span>
                <FormSelect value={historyStatus} onChange={(e) => { setHistoryStatus(e.target.value); setHistoryLimit(HISTORY_PAGE_SIZE); }} className="w-full sm:w-auto h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm">
                  <option value="all">Tous les statuts</option>
                  <option value="approved">Approuvées</option>
                  <option value="rejected">Refusées</option>
                </FormSelect>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3" role="group" aria-label="Type de demande">
              {blocks.map(({ id, kind, title, Icon, all }) => {
                const selected = historyType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setHistoryType(id); setHistoryLimit(HISTORY_PAGE_SIZE); }}
                    aria-pressed={selected}
                    style={THEMES[kind].vars}
                    className={`flex items-center justify-center gap-2 sm:gap-3 rounded-2xl px-3 py-3.5 font-bold text-sm sm:text-base shadow-sm ring-1 ring-[var(--accent-ring)] transition-colors ${
                      selected ? "bg-[var(--accent)] text-white" : "bg-white text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-none" aria-hidden="true" />
                    {title}
                    <span className={`min-w-6 px-2 py-0.5 rounded-full text-xs tabular-nums ${selected ? "bg-white/20" : "bg-[var(--accent-soft)]"}`}>{historyFor(all).length}</span>
                  </button>
                );
              })}
            </div>
            {blocks.filter(({ id }) => id === historyType).map(({ id, kind, title, Icon, all }) => {
              const list = historyFor(all);
              return (
                <SectionBlock key={id} kind={kind} icon={Icon} title={`Historique des ${title.toLowerCase()} (${list.length})`}>
                  {list.length === 0 ? (
                    <p className="py-6 text-center text-slate-600">Aucune demande ne correspond à ces filtres.</p>
                  ) : (
                    <>
                      <div className={CARD_GRID}>
                        {list.slice(0, historyLimit).map((item) => (
                          <RequestCard key={item.id} item={item} kind={kind} employeesById={employeesById} validators={validators} decisionMode onDecide={openDecision} />
                        ))}
                      </div>
                      {list.length > historyLimit && (
                        <div className="text-center mt-4">
                          <Button variant="outline" className="rounded-xl" onClick={() => setHistoryLimit((value) => value + HISTORY_PAGE_SIZE)}>Afficher plus</Button>
                        </div>
                      )}
                    </>
                  )}
                </SectionBlock>
              );
            })}
          </>
        )}

        
<Dialog open={!!reviewDialog} onOpenChange={(open) => { if (!open) closeDecision(); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{reviewDialog?.approved ? "Accepter la demande" : "Refuser la demande"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert className="bg-slate-50 border-slate-200">
                <User className="w-4 h-4 text-slate-600" />
                <AlertDescription>
                  <p className="text-sm font-semibold text-slate-900">{reviewDialog?.item?.employee_name}</p>
                  <p className="text-xs text-slate-600">
                    {reviewDialog?.item?.total_days} jour(s) du {formatDate(reviewDialog?.item?.start_date)} au {formatDate(reviewDialog?.item?.end_date)}
                  </p>
                </AlertDescription>
              </Alert>
              {reviewDialog && (
                <p className="text-sm text-slate-700 rounded-xl bg-[#0d5c66]/[0.05] px-3 py-2.5">
                  {decisionOutcome(reviewDialog.item, reviewDialog.kind, reviewDialog.approved)}
                </p>
              )}
              {reviewDialog && (() => {
                const level = String(reviewDialog.item.status).replace("pending_", "");
                const expected = expectedValidator(reviewDialog.item, level, validators);
                return norm(expected.email) !== norm(currentUser?.email) ? (
                  <p className="text-sm font-medium text-amber-800 rounded-xl bg-amber-50 px-3 py-2.5">
                    Vous décidez à la place de {expected.name}. Votre nom sera conservé dans le circuit.
                  </p>
                ) : null;
              })()}
              <div>
                <label htmlFor="validation-comment" className="text-sm font-semibold text-slate-700 mb-2 block">
                  {reviewDialog?.approved ? "Commentaire (facultatif)" : "Motif du refus"}
                </label>
                <Textarea
                  id="validation-comment"
                  value={comment}
                  onChange={(e) => { setComment(e.target.value); setCommentError(""); }}
                  placeholder={reviewDialog?.approved ? "Ajoutez un commentaire si nécessaire" : "Expliquez à l'agent la raison du refus"}
                  className="min-h-24 rounded-xl"
                  aria-invalid={!!commentError}
                />
                {commentError && <p className="text-sm text-red-700 mt-1.5">{commentError}</p>}
              </div>
            </div>
            <DialogFooter className="flex gap-3">
              <Button onClick={closeDecision} variant="outline" className="rounded-xl" disabled={submitting}>
                Annuler
              </Button>
              <Button
                onClick={handleReview}
                disabled={submitting}
                className={`rounded-xl text-white ${reviewDialog?.approved ? "bg-[#0d5c66] hover:bg-[#0e4b53]" : "bg-red-700 hover:bg-red-800"}`}
              >
                {submitting ? "Traitement..." : reviewDialog?.approved ? "Confirmer l'acceptation" : "Confirmer le refus"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
