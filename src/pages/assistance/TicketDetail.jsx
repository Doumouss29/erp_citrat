import React, { useState } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getTicketOwner } from '@/lib/assistanceAssign';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequestTypeBadge } from '@/components/assistance/shared/StatusBadge';
import { STATUSES, getApplicationInfo } from '@/lib/assistanceConstants';
import { APP_ICONS, APP_COLORS } from '@/lib/assistanceAppVisuals';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Send, Paperclip, User, ExternalLink, CheckCircle2, Clock, Ticket, ChevronRight, Reply, X
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { safeUrl } from "@/lib/safeUrl";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const [newComment, setNewComment] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['si-ticket', id],
    queryFn: () => base44.entities.SiTicket.get(id),
    enabled: !!id,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['si-comments', id],
    queryFn: async () => { const page = await base44.entities.SiComment.filter({ ticket_id: id }, { sort: 'created_date' }); return page.items; },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.SiTicket.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['si-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['si-tickets'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (data) => base44.entities.SiComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['si-comments', id] });
      setNewComment('');
      toast.success('Commentaire ajouté');
    },
  });

  const handleStatusChange = (newStatus) => {
    updateMutation.mutate({ status: newStatus });
    if (newStatus !== ticket.status) {
      commentMutation.mutate({
        ticket_id: id,
        author_name: user?.full_name || 'Système',
        author_email: user?.email,
        content: `Statut changé de "${STATUSES.find(s => s.id === ticket.status)?.label}" à "${STATUSES.find(s => s.id === newStatus)?.label}"`,
        is_technical: true,
        status_change: newStatus,
      });
    }
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    commentMutation.mutate({
      ticket_id: id,
      author_name: user?.full_name || 'Utilisateur',
      author_email: user?.email,
      content: newComment,
    });
  };

  // Ticket sans responsable : assignation automatique au super administrateur
  React.useEffect(() => {
    if (!ticket || ticket.assigned_to || !isAdmin) return;
    getTicketOwner().then((owner) => {
      if (owner) updateMutation.mutate({ assigned_to: owner.email, assigned_to_name: owner.name });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id, ticket?.assigned_to, isAdmin]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Ticket introuvable</p>
        <Button asChild className="mt-4"><Link to="/assistance/tickets">Retour aux tickets</Link></Button>
      </div>
    );
  }

  const appInfo = getApplicationInfo(ticket.application);
  const AppIcon = APP_ICONS[ticket.application];
  const isClosed = ticket.status === 'ferme' || ticket.status === 'resolu';
  const canClose = !isClosed && (isAdmin || ticket.requester_email === user?.email);
  const fmtDate = (d) => (d ? format(new Date(d), 'dd/MM/yyyy (HH:mm)', { locale: fr }) : '');
  const STATUS_PILL = {
    nouveau: 'bg-emerald-500', en_attente: 'bg-amber-500', en_cours: 'bg-green-600', resolu: 'bg-teal-600', ferme: 'bg-slate-500',
  };
  const statusLabel = STATUSES.find((st) => st.id === ticket.status)?.label || ticket.status;
  const focusReply = () => {
    const el = document.getElementById('ticket-reply');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el?.focus(), 300);
  };
  const roleOf = (email) => (email && email === ticket.requester_email ? 'Demandeur' : 'Support SI');

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5">
      {/* En-tête : icône + titre + fil d'Ariane */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-4 sm:p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#1e40af] text-white flex items-center justify-center flex-none shadow-sm">
              <Ticket className="w-6 h-6 sm:w-7 sm:h-7" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-heading font-bold text-slate-900 leading-tight truncate">
                Ticket de support <span className="whitespace-nowrap">#{ticket.ticket_number}</span>
              </h1>
              <nav aria-label="Fil d'Ariane" className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
                <Link to="/assistance" className="hover:text-slate-800 no-underline">Support</Link>
                <ChevronRight className="w-3.5 h-3.5 text-[#1e40af] flex-none" />
                <Link to="/assistance/tickets" className="hover:text-slate-800 no-underline">Mes tickets</Link>
                <ChevronRight className="w-3.5 h-3.5 text-[#1e40af] flex-none" />
                <span className="truncate">#{ticket.ticket_number}</span>
              </nav>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Carte principale */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="rounded-2xl overflow-hidden">
          {/* Sujet, actions, pastilles */}
          <div className="p-4 sm:p-6 border-b-2 border-[#1e40af]">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <h2 className="text-lg sm:text-2xl font-bold text-slate-900 leading-snug break-words min-w-0">{ticket.title}</h2>
              <div className="grid grid-cols-2 md:flex gap-2 flex-none">
                <Button onClick={focusReply} className="h-11 px-5 rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a] text-white shadow-sm">
                  <Reply className="w-4 h-4 mr-2" /> Répondre
                </Button>
                {canClose ? (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange('ferme')}
                    disabled={updateMutation.isPending}
                    className="h-11 px-5 rounded-xl border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mr-2" /> Fermer
                  </Button>
                ) : <span className="hidden md:block" />}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#1e40af] text-white text-xs font-bold px-3 py-1">#{ticket.ticket_number}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full text-white text-xs font-bold px-3 py-1 ${STATUS_PILL[ticket.status] || 'bg-slate-500'}`}>
                <Clock className="w-3.5 h-3.5" /> {statusLabel}
              </span>
              <RequestTypeBadge type={ticket.request_type} />
              {ticket.application && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  {AppIcon && (
                    <span className={`w-5 h-5 rounded bg-gradient-to-br ${APP_COLORS[ticket.application] || 'from-gray-400 to-gray-600'} flex items-center justify-center`}>
                      <AppIcon className="w-3 h-3 text-white" />
                    </span>
                  )}
                  {appInfo?.label || ticket.application}
                </span>
              )}
            </div>
          </div>

          {/* Traitement (équipe SI) */}
          {isAdmin && (
            <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-slate-500 w-14 flex-none">Statut</span>
                <Select value={ticket.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.filter(st => st.id !== 'nouveau').map(st => <SelectItem key={st.id} value={st.id}>{st.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-slate-500 w-14 flex-none">Assigné</span>
                <span className="h-9 flex-1 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 flex items-center gap-2">
                  <span className="truncate">{ticket.assigned_to_name || 'Attribution en cours…'}</span>
                  <span className="ml-auto text-xs text-slate-400 whitespace-nowrap">automatique</span>
                </span>
              </div>
            </div>
          )}

          {/* Conversation */}
          <div className="bg-slate-50/70 px-4 sm:px-6 py-5 sm:py-6 space-y-6">
            <Message
              name={ticket.requester_name}
              role="Demandeur"
              date={fmtDate(ticket.created_date)}
              meta={[ticket.requester_email, ticket.requester_service].filter(Boolean).join(' · ')}
            >
              <p className="whitespace-pre-wrap">{ticket.description}</p>
              {ticket.attachment_url && (
                <a href={safeUrl(ticket.attachment_url)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#1e40af] hover:underline">
                  <Paperclip className="w-4 h-4" /> Pièce jointe <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </Message>

            {comments.map((c) => c.is_technical ? (
              <div key={c.id} className="flex items-center gap-3 text-xs text-slate-500">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-center">{c.content} · {fmtDate(c.created_date)}</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            ) : (
              <Message key={c.id} name={c.author_name} role={roleOf(c.author_email)} date={fmtDate(c.created_date)} support={roleOf(c.author_email) !== 'Demandeur'}>
                <p className="whitespace-pre-wrap">{c.content}</p>
              </Message>
            ))}

            {ticket.assigned_to_name && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Pris en charge par <b className="text-slate-700">{ticket.assigned_to_name}</b>
              </p>
            )}
          </div>

          {/* Réponse */}
          <form onSubmit={handleAddComment} className="p-4 sm:p-6 border-t border-slate-200">
            <label htmlFor="ticket-reply" className="text-sm font-semibold text-slate-700">Votre réponse</label>
            <Textarea
              id="ticket-reply"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isClosed ? 'Ce ticket est fermé. Écrivez ici pour ajouter une précision.' : 'Écrivez votre message…'}
              rows={4}
              className="mt-2 rounded-xl"
            />
            <div className="mt-3 flex justify-end">
              <Button type="submit" disabled={commentMutation.isPending || !newComment.trim()} className="h-10 px-5 rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a]">
                <Send className="w-4 h-4 mr-2" /> Envoyer
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

/* Message du fil : avatar, nom, rôle, date, puis la bulle */
function Message({ name, role, date, meta, support = false, children }) {
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div className="flex gap-3 sm:gap-4">
      <span className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-none text-sm font-bold ${support ? 'bg-[#1e40af] text-white' : 'bg-slate-200 text-slate-600'}`}>
        {support ? initials : <User className="w-5 h-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="text-sm font-bold text-slate-900 uppercase">{name || 'Utilisateur'}</span>
          <span className={`text-xs font-semibold ${support ? 'text-[#1e40af]' : 'text-slate-600'}`}>{role}</span>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{date}{meta ? <span className="hidden sm:inline"> · {meta}</span> : null}</p>
        <div className={`mt-3 rounded-2xl p-4 sm:p-6 text-sm leading-relaxed text-slate-800 shadow-sm ${support ? 'bg-blue-50 border border-blue-100' : 'bg-white border border-slate-100'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
