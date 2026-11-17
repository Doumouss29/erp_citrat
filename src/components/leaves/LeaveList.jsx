import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, Check, X, Trash2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function LeaveList({ leaves, loading, isHR, currentUser, onUpdateStatus, onDelete }) {
  const [reviewDialog, setReviewDialog] = useState(null);
  const [comment, setComment] = useState("");

  const statusColors = {
    pending_level1: "bg-yellow-100 text-yellow-800 border-yellow-300",
    pending_level2: "bg-orange-100 text-orange-800 border-orange-300",
    pending_level3: "bg-blue-100 text-blue-800 border-blue-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300"
  };

  const STATUS = {
    pending_level1: { label: "Attente hiérarchie", cls: "bg-amber-50 text-amber-800 ring-1 ring-amber-200", dot: "bg-amber-500" },
    pending_level2: { label: "Attente RH", cls: "bg-orange-50 text-orange-800 ring-1 ring-orange-200", dot: "bg-orange-500" },
    pending_level3: { label: "Attente Direction", cls: "bg-blue-50 text-blue-800 ring-1 ring-blue-200", dot: "bg-blue-500" },
    approved: { label: "Approuvée", cls: "bg-green-50 text-green-800 ring-1 ring-green-200", dot: "bg-green-500" },
    rejected: { label: "Refusée", cls: "bg-red-50 text-red-800 ring-1 ring-red-200", dot: "bg-red-500" },
    pending: { label: "En attente", cls: "bg-amber-50 text-amber-800 ring-1 ring-amber-200", dot: "bg-amber-500" },
  };

  const periodLabels = {
    annee: "Congés Année",
    decembre: "Congés Collectifs décembre"
  };
  
  const periodColors = {
    annee: "bg-blue-100 text-blue-800 border-blue-300",
    decembre: "bg-purple-100 text-purple-800 border-purple-300"
  };

  const handleReview = (status) => {
    onUpdateStatus(reviewDialog.id, status, comment);
    setReviewDialog(null);
    setComment("");
  };

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i} className="shadow-xl border-0">
            <CardContent className="p-4 sm:p-6">
              <Skeleton className="h-16 sm:h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        <AnimatePresence>
          {leaves.length === 0 ? (
            <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
              <CardContent className="p-8 sm:p-12 text-center">
                <CalendarIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 text-base sm:text-lg">Aucun congé à afficher</p>
              </CardContent>
            </Card>
          ) : (
            leaves.map((leave) => {
              const st = STATUS[leave.status] || STATUS.pending;
              const isOwner = (leave.employee_email || leave.created_by) === currentUser?.email;
              const isPending = leave.status?.startsWith("pending");
              const requested = leave.requested_date || leave.created_date;
              const fmt = (d, f = "EEE d MMM yyyy") => { try { return format(parseISO(d), f, { locale: fr }); } catch { return "—"; } };
              const steps = [
                { n: 1, label: "Hiérarchie", who: leave.level1_approver || "Non défini", status: leave.level1_status, date: leave.level1_date, current: leave.status === "pending_level1" },
                { n: 2, label: "RH", who: "SIDIBE ABOUBACAR", status: leave.level2_status, date: leave.level2_date, current: leave.status === "pending_level2" },
                { n: 3, label: "Direction", who: "CITRAT", status: leave.level3_status, date: leave.level3_date, current: leave.status === "pending_level3" },
              ];
              const comments = [
                leave.level1_comment && { who: "Hiérarchie", text: leave.level1_comment },
                leave.level2_comment && { who: "RH", text: leave.level2_comment },
                leave.level3_comment && { who: "Direction", text: leave.level3_comment },
              ].filter(Boolean);
              return (
              <motion.div
                key={leave.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                  {/* En-tête : qui, quel type, où en est la demande */}
                  <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-100">
                    <div className="min-w-0">
                      <p className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">{leave.employee_name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${leave.leave_period === "decembre" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                          {periodLabels[leave.leave_period] || "Congés"}
                        </span>
                        {leave.is_urgent && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Urgent</span>}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-none ${st.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                    </span>
                  </div>

                  <CardContent className="p-4 sm:p-6 space-y-4">
                    {/* Informations de la demande */}
                    <dl className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))" }}>
                      {[
                        { k: "Du", v: fmt(leave.start_date) },
                        { k: "Au", v: fmt(leave.end_date) },
                        { k: "Durée", v: leave.total_days ? `${leave.total_days} jour${leave.total_days > 1 ? "s" : ""}` : "—", strong: true },
                        requested && { k: "Demandée le", v: fmt(requested, "d MMM yyyy") },
                      ].filter(Boolean).map((it) => (
                        <div key={it.k} className="rounded-xl bg-slate-50 px-3 py-2.5">
                          <dt className="text-xs font-medium text-slate-500">{it.k}</dt>
                          <dd className={`mt-0.5 text-sm font-semibold first-letter:uppercase ${it.strong ? "text-emerald-700" : "text-slate-900"}`}>{it.v}</dd>
                        </div>
                      ))}
                    </dl>

                    {leave.reason && (
                      <div className="text-sm">
                        <p className="text-xs font-medium text-slate-500">Motif</p>
                        <p className="mt-0.5 text-slate-800 break-words">{leave.reason}</p>
                      </div>
                    )}

                    {/* Parcours de validation */}
                    <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
                      <p className="text-xs font-semibold text-slate-500 mb-3">Parcours de validation</p>
                      <ol className="grid grid-cols-3 gap-2">
                        {steps.map((s, i) => {
                          const ok = s.status === "approved", ko = s.status === "rejected";
                          return (
                            <li key={s.n} className="relative flex flex-col items-center text-center min-w-0">
                              {i > 0 && <span className={`absolute top-4 right-1/2 w-full h-0.5 -z-0 ${steps[i - 1].status === "approved" ? "bg-green-400" : "bg-slate-200"}`} aria-hidden />}
                              <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ring-4 ring-white ${
                                ok ? "bg-green-500 text-white" : ko ? "bg-red-500 text-white" : s.current ? "bg-amber-400 text-white" : "bg-slate-200 text-slate-500"}`}>
                                {ok ? <Check className="w-4 h-4" /> : ko ? <X className="w-4 h-4" /> : s.n}
                              </span>
                              <span className={`mt-1.5 text-xs font-bold ${s.current ? "text-amber-700" : "text-slate-800"}`}>{s.label}</span>
                              <span className="text-xs text-slate-500 leading-tight line-clamp-2 break-words">{s.who}</span>
                              {s.date && <span className="text-xs text-slate-400 mt-0.5">{fmt(s.date, "dd/MM HH:mm")}</span>}
                            </li>
                          );
                        })}
                      </ol>
                      {comments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                          {comments.map((c) => (
                            <p key={c.who} className="text-xs text-slate-600"><span className="font-semibold text-slate-700">{c.who} :</span> « {c.text} »</p>
                          ))}
                        </div>
                      )}
                    </div>

                    {isHR && leave.status === "pending" && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => setReviewDialog(leave)} className="bg-green-600 hover:bg-green-700 rounded-xl h-10 text-sm">
                          <Check className="w-4 h-4 mr-2" />Approuver
                        </Button>
                        <Button onClick={() => setReviewDialog(leave)} variant="destructive" className="rounded-xl h-10 text-sm">
                          <X className="w-4 h-4 mr-2" />Refuser
                        </Button>
                      </div>
                    )}

                    {/* Seul le service RH peut supprimer une demande */}
                    {isPending && isHR && (
                      <div className="pt-3 border-t border-slate-100">
                        <Button onClick={() => onDelete(leave.id)} variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl h-9 text-sm px-3">
                          <Trash2 className="w-4 h-4 mr-2" />Supprimer la demande
                        </Button>
                      </div>
                    )}
                    {isPending && !isHR && isOwner && (
                      <p className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                        Pour modifier ou annuler cette demande, adressez-vous au service des Ressources Humaines.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
              );
            })

          )}
        </AnimatePresence>
      </div>

      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">Validation de la Demande</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 mb-2">Commentaire (optionnel)</p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ajoutez un commentaire..."
                className="border-2 rounded-xl min-h-20 sm:min-h-24 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={() => handleReview("approved")}
              className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 rounded-xl h-10 sm:h-11 text-sm"
            >
              <Check className="w-4 h-4 mr-2" />
              Approuver
            </Button>
            <Button
              onClick={() => handleReview("rejected")}
              variant="destructive"
              className="w-full sm:flex-1 rounded-xl h-10 sm:h-11 text-sm"
            >
              <X className="w-4 h-4 mr-2" />
              Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}