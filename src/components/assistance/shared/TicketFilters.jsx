import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { APPLICATIONS, REQUEST_TYPES, PRIORITIES, STATUSES } from '@/lib/assistanceConstants';

export default function TicketFilters({ filters, onFiltersChange, onReset }) {
  const update = (key, value) => {
    onFiltersChange({ ...filters, [key]: value === 'all' ? '' : value });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un ticket..."
          value={filters.search || ''}
          onChange={(e) => update('search', e.target.value)}
          className="pl-10 h-10"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={filters.application || 'all'} onValueChange={(v) => update('application', v)}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Application" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les apps</SelectItem>
            {APPLICATIONS.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.status || 'all'} onValueChange={(v) => update('status', v)}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.priority || 'all'} onValueChange={(v) => update('priority', v)}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.request_type || 'all'} onValueChange={(v) => update('request_type', v)}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {REQUEST_TYPES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={onReset}>
          <X className="w-3 h-3 mr-1" /> Réinitialiser
        </Button>
      </div>
    </div>
  );
}