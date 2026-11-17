import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBadge, PriorityBadge, RequestTypeBadge } from '@/components/assistance/shared/StatusBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import { STATUSES } from '@/lib/assistanceConstants';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import SITicketCard from '@/components/assistance/si/SITicketCard';

const PRIORITY_ORDER = { urgente: 0, elevee: 1, moyenne: 2, faible: 3 };

export default function SIQueue({ tickets, onRefetch }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sortField, setSortField] = useState('priority');
  const [sortDir, setSortDir] = useState('asc');

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.SiTicket.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['si-workspace-tickets'] });
      onRefetch?.();
      toast.success('Statut mis à jour');
    },
  });

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = [...tickets].sort((a, b) => {
    let va, vb;
    if (sortField === 'priority') {
      va = PRIORITY_ORDER[a.priority] ?? 9;
      vb = PRIORITY_ORDER[b.priority] ?? 9;
    } else if (sortField === 'created_date') {
      va = new Date(a.created_date || 0).getTime();
      vb = new Date(b.created_date || 0).getTime();
    } else {
      va = (a[sortField] || '').toString().toLowerCase();
      vb = (b[sortField] || '').toString().toLowerCase();
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const thClass = "text-[11px] font-semibold uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none";

  const SORTS = [
    { id: 'priority', label: 'Priorité' },
    { id: 'created_date', label: 'Date' },
    { id: 'status', label: 'Statut' },
    { id: 'application', label: 'Application' },
    { id: 'requester_name', label: 'Demandeur' },
  ];

  return (
    <>
    {/* Mobile et tablette : liste de cartes triable (pas de tableau à faire défiler) */}
    <div className="xl:hidden">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm text-slate-600"><b className="text-slate-900">{sorted.length}</b> ticket{sorted.length > 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Trier par</span>
          <Select value={sortField} onValueChange={(v) => { setSortField(v); setSortDir(v === 'created_date' ? 'desc' : 'asc'); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORTS.map((o) => <SelectItem key={o.id} value={o.id} className="text-xs">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">Aucun ticket trouvé</div>
      ) : (
        <div className="grid gap-2.5 sm:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))' }}>
          {sorted.map((t) => (
            <SITicketCard key={t.id} ticket={t} onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })} />
          ))}
        </div>
      )}
    </div>

    {/* Grand écran : tableau complet */}
    <div className="hidden xl:block bg-card border rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className={thClass} onClick={() => handleSort('ticket_number')}>
                N° <SortIcon field="ticket_number" />
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort('title')}>
                Titre <SortIcon field="title" />
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort('application')}>
                Application <SortIcon field="application" />
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort('priority')}>
                Priorité <SortIcon field="priority" />
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort('status')}>
                Statut <SortIcon field="status" />
              </TableHead>
              <TableHead className={thClass}>Type</TableHead>
              <TableHead className={thClass} onClick={() => handleSort('requester_name')}>
                Demandeur <SortIcon field="requester_name" />
              </TableHead>
              <TableHead className={thClass}>Assigné à</TableHead>
              <TableHead className={thClass} onClick={() => handleSort('created_date')}>
                Date <SortIcon field="created_date" />
              </TableHead>
              <TableHead className={thClass}>Action rapide</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12 text-sm text-muted-foreground">
                  Aucun ticket trouvé
                </TableCell>
              </TableRow>
            )}
            {sorted.map((ticket, i) => (
              <motion.tr
                key={ticket.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className={`group hover:bg-muted/30 transition-colors border-b ${
                  ticket.priority === 'urgente' ? 'bg-red-50/40' : ''
                }`}
              >
                <TableCell className="font-mono text-[11px] text-muted-foreground">{ticket.ticket_number}</TableCell>
                <TableCell>
                  <button
                    onClick={() => navigate(`/assistance/ticket/${ticket.id}`)}
                    className="font-medium text-sm text-foreground hover:text-primary transition-colors text-left line-clamp-1 max-w-[200px]"
                  >
                    {ticket.title}
                  </button>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded uppercase">
                    {ticket.application}
                  </span>
                </TableCell>
                <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                <TableCell><StatusBadge status={ticket.status} /></TableCell>
                <TableCell><RequestTypeBadge type={ticket.request_type} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{ticket.requester_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {ticket.assigned_to_name ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">
                        {ticket.assigned_to_name.charAt(0)}
                      </div>
                      <span className="text-xs">{ticket.assigned_to_name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Non assigné</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {ticket.created_date ? format(new Date(ticket.created_date), 'dd MMM yyyy', { locale: fr }) : '-'}
                </TableCell>
                <TableCell>
                  <Select
                    value={ticket.status}
                    onValueChange={(v) => updateStatusMutation.mutate({ id: ticket.id, status: v })}
                  >
                    <SelectTrigger className="h-7 text-[11px] w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => navigate(`/assistance/ticket/${ticket.id}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  </button>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
    </>
  );
}