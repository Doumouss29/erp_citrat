import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, PriorityBadge } from '@/components/assistance/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUSES } from '@/lib/assistanceConstants';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Monitor, User, Calendar, ChevronRight } from 'lucide-react';

export const PRIORITY_ORDER = { urgente: 0, elevee: 1, moyenne: 2, faible: 3 };
const PRIORITY_BORDER = {
  urgente: 'border-l-red-500',
  elevee: 'border-l-orange-400',
  moyenne: 'border-l-blue-300',
  faible: 'border-l-slate-200',
};

/**
 * Carte de ticket commune (Kanban mobile, File sur mobile et tablette).
 * - showStatus : affiche la pastille de statut (inutile dans une colonne Kanban)
 * - onStatusChange : ajoute « Changer le statut » (remplace le glisser-déposer au doigt)
 */
export default function SITicketCard({ ticket: t, showStatus = true, onStatusChange }) {
  const navigate = useNavigate();
  const open = () => navigate(`/assistance/ticket/${t.id}`);
  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${PRIORITY_BORDER[t.priority] || 'border-l-slate-200'} shadow-sm hover:shadow-md transition-shadow`}>
      <button type="button" onClick={open} className="w-full text-left p-3.5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-slate-500">{t.ticket_number}</span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <PriorityBadge priority={t.priority} />
            {showStatus && <StatusBadge status={t.status} />}
          </div>
        </div>
        <div className="mt-1.5 flex items-start gap-2">
          <p className="flex-1 text-sm font-semibold text-slate-900 leading-snug line-clamp-2">{t.title}</p>
          <ChevronRight className="w-4 h-4 text-slate-400 flex-none mt-0.5" />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          {t.application && <span className="inline-flex items-center gap-1"><Monitor className="w-3.5 h-3.5" /><span className="uppercase font-medium">{t.application}</span></span>}
          {t.requester_name && <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" />{t.requester_name}</span>}
          {t.created_date && <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{format(new Date(t.created_date), 'dd MMM', { locale: fr })}</span>}
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3.5 py-2">
        <span className="text-xs text-slate-600 truncate min-w-0">
          {t.assigned_to_name ? <>Assigné à <b>{t.assigned_to_name}</b></> : <span className="italic text-slate-400">Non assigné</span>}
        </span>
        {onStatusChange && (
          <Select value={t.status} onValueChange={(v) => onStatusChange(t.id, v)}>
            <SelectTrigger className="h-8 w-[130px] text-xs flex-none" aria-label="Changer le statut">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
