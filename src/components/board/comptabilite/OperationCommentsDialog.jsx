import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatDate, TYPE_LABELS } from './caisseUtils';
import { safeUrl } from "@/lib/safeUrl";

export default function OperationCommentsDialog({ open, onOpenChange, operation, comments, isAdmin, user, isSubmittingComment, isUpdatingDecision, onSubmitComment, onDecision }) {
  const [message, setMessage] = useState('');
  const { data: users = [] } = useQuery({
    queryKey: ['caisse-user-names', isAdmin],
    queryFn: () => base44.entities.User.list(),
    enabled: open && isAdmin,
    initialData: []
  });

  const usersByEmail = useMemo(() => {
    return users.reduce((accumulator, item) => {
      if (item.email && item.full_name) {
        accumulator[item.email] = item.full_name;
      }
      return accumulator;
    }, {});
  }, [users]);

  const getDisplayName = (email) => {
    if (!email) return '—';
    if (email === user?.email && user?.full_name) return user.full_name;
    return usersByEmail[email] || email;
  };

  useEffect(() => {
    setMessage('');
  }, [operation, open]);

  if (!operation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-[32px] border border-slate-200 bg-white p-0 shadow-2xl shadow-slate-200/70">
        <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/50 p-6 sm:p-8">
          <DialogHeader className="rounded-[28px] border border-blue-100 bg-white/90 p-5 shadow-sm backdrop-blur">
            <DialogTitle className="text-2xl font-bold text-slate-900">Suivi de l’opération</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Consultez les détails, l’historique des échanges et les décisions administratives.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid grid-cols-1 gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Date</p>
              <p className="mt-2 font-semibold text-slate-900">{formatDate(operation.date_operation)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Type</p>
              <p className="mt-2 font-semibold text-slate-900">{TYPE_LABELS[operation.type_operation]}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Montant</p>
              <p className="mt-2 font-semibold text-slate-900">{formatCurrency(operation.montant)}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Description</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{operation.description}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span><strong className="text-slate-900">Bureau :</strong> {operation.bureau_code || '—'}</span>
              <span><strong className="text-slate-900">Saisi par :</strong> {getDisplayName(operation.cree_par_email || operation.created_by)}</span>
              {operation.justificatif_url && (
                <a href={safeUrl(operation.justificatif_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-blue-600 hover:text-blue-700">
                  <FileText className="h-4 w-4" />
                  Voir le justificatif
                </a>
              )}
            </div>
            {operation.valide_par_email && (
              <p className="text-sm text-slate-600">
                Décision par <strong className="text-slate-900">{getDisplayName(operation.valide_par_email)}</strong> le {formatDate(operation.date_validation)}
              </p>
            )}
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-slate-700" />
              <h3 className="text-lg font-semibold text-slate-900">Historique des échanges</h3>
            </div>

            <div className="mt-4 space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {comments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-blue-200 bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-6 text-center text-sm text-slate-600">
                  Aucun commentaire pour le moment.
                </div>
              )}
              {comments.map((comment) => {
                const isOwnMessage = comment.auteur_email === user?.email;
                return (
                  <div key={comment.id} className={`rounded-2xl px-4 py-3 shadow-sm ${isOwnMessage ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white' : 'border border-slate-200 bg-gradient-to-r from-white to-slate-50 text-slate-800'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs opacity-80">
                      <span>{getDisplayName(comment.auteur_email)}</span>
                      <span>{formatDate(comment.created_date)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6">{comment.message}</p>
                  </div>
                );
              })}
            </div>

            {isAdmin && (
              <div className="mt-5 space-y-3">
                <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ajouter un commentaire…" className="min-h-[110px] rounded-2xl border-slate-200 bg-slate-50/80 shadow-inner focus-visible:ring-blue-200" />
                <div className="flex justify-end">
                  <Button type="button" className="rounded-2xl bg-gradient-to-r from-slate-900 to-blue-700 text-white shadow-lg shadow-blue-200 hover:from-slate-800 hover:to-blue-600" disabled={!message.trim() || isSubmittingComment} onClick={() => onSubmitComment(message)}>
                    {isSubmittingComment ? 'Envoi...' : 'Envoyer le commentaire'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}