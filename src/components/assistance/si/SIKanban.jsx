import React, { useState } from 'react';
import SITicketCard, { PRIORITY_ORDER } from '@/components/assistance/si/SITicketCard';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PriorityBadge } from '@/components/assistance/shared/StatusBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, User, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const COLUMNS = [
  { id: 'nouveau', label: 'Nouveau', color: 'border-t-emerald-500', headerBg: 'bg-emerald-50' },
  { id: 'en_attente', label: 'En attente', color: 'border-t-yellow-500', headerBg: 'bg-yellow-50' },
  { id: 'en_cours', label: 'En cours', color: 'border-t-blue-500', headerBg: 'bg-blue-50' },
  { id: 'resolu', label: 'Résolu', color: 'border-t-green-500', headerBg: 'bg-green-50' },
  { id: 'ferme', label: 'Fermé', color: 'border-t-gray-400', headerBg: 'bg-gray-50' },
];

const PRIORITY_BORDER = {
  urgente: 'border-l-4 border-l-red-500',
  elevee: 'border-l-4 border-l-orange-400',
  moyenne: 'border-l-4 border-l-blue-300',
  faible: 'border-l-4 border-l-gray-200',
};

export default function SIKanban({ tickets, onRefetch }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const moveMutation = useMutation({
    mutationFn: ({ ticketId, newStatus }) =>
      base44.entities.SiTicket.update(ticketId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['si-workspace-tickets'] });
      onRefetch?.();
      toast.success('Statut mis à jour');
    },
  });

  const handleDragStart = (e, ticketId) => {
    e.dataTransfer.setData('ticketId', ticketId);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('ticketId');
    if (ticketId) moveMutation.mutate({ ticketId, newStatus });
  };

  const handleDragOver = (e) => e.preventDefault();

  // Mobile : une colonne à la fois, choisie dans la barre de statuts
  const firstWithTickets = COLUMNS.find((c) => tickets.some((t) => t.status === c.id))?.id || 'nouveau';
  const [mobileCol, setMobileCol] = useState(null);
  const activeCol = mobileCol || firstWithTickets;
  const mobileTickets = tickets
    .filter((t) => t.status === activeCol)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));

  return (
    <>
    <div className="md:hidden">
      <div className="grid grid-cols-5 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Colonnes du Kanban">
        {COLUMNS.map((col) => {
          const n = tickets.filter((t) => t.status === col.id).length;
          const on = col.id === activeCol;
          return (
            <button key={col.id} type="button" role="tab" aria-selected={on} onClick={() => setMobileCol(col.id)}
              className={`rounded-lg px-1 py-2 text-center transition-colors ${on ? 'bg-white shadow-sm' : 'hover:bg-white/60'}`}>
              <span className={`block text-lg font-bold leading-none tabular-nums ${on ? 'text-slate-900' : 'text-slate-500'}`}>{n}</span>
              <span className={`mt-1 block text-[11px] font-semibold leading-tight ${on ? 'text-slate-800' : 'text-slate-500'}`}>{col.label}</span>
              <span className={`mx-auto mt-1 block h-1 w-6 rounded-full ${on ? col.color.replace('border-t-', 'bg-') : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>
      <div className="mt-3 space-y-2.5">
        {mobileTickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-8 text-center text-sm text-slate-500">
            Aucun ticket « {COLUMNS.find((c) => c.id === activeCol)?.label} »
          </div>
        ) : mobileTickets.map((t) => (
          <SITicketCard key={t.id} ticket={t} showStatus={false}
            onStatusChange={(id, newStatus) => moveMutation.mutate({ ticketId: id, newStatus })} />
        ))}
      </div>
    </div>

    <div className="hidden md:grid gap-3 lg:gap-4 items-start" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))" }}>
      {COLUMNS.map(col => {
        const colTickets = tickets.filter(t => t.status === col.id);
        return (
          <div
            key={col.id}
            className={`rounded-2xl border-t-4 ${col.color} bg-card shadow-sm min-h-[140px] overflow-hidden`}
            onDrop={(e) => handleDrop(e, col.id)}
            onDragOver={handleDragOver}
          >
            <div className={`px-3.5 py-3 ${col.headerBg} border-b flex items-center justify-between`}>
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{col.label}</span>
              <span className="text-xs font-bold bg-card rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                {colTickets.length}
              </span>
            </div>

            <div className="p-2 space-y-2">
              {colTickets.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">Aucun ticket</div>
              )}
              {colTickets.map((ticket, i) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, ticket.id)}
                  onClick={() => navigate(`/assistance/ticket/${ticket.id}`)}
                  className={`bg-card rounded-xl border shadow-sm p-3 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 ${PRIORITY_BORDER[ticket.priority] || ''}`}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <span className="font-mono text-[10px] text-muted-foreground">{ticket.ticket_number}</span>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-snug mb-2 line-clamp-2">{ticket.title}</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Monitor className="w-3 h-3" />
                      <span className="uppercase font-medium">{ticket.application}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{ticket.requester_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{ticket.created_date ? format(new Date(ticket.created_date), 'dd MMM', { locale: fr }) : '-'}</span>
                    </div>
                  </div>
                  {ticket.assigned_to_name && (
                    <div className="mt-2 pt-2 border-t flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-bold">
                        {ticket.assigned_to_name.charAt(0)}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{ticket.assigned_to_name}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {col.id !== 'ferme' && colTickets.length > 0 && (
              <div className="px-2 pb-2">
                <div className="text-[10px] text-center text-muted-foreground py-1 border border-dashed rounded-lg">
                  Glissez-déposez pour changer le statut
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
    </>
  );
}