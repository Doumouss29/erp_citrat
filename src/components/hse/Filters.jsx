import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Filter, ChevronDown } from "lucide-react";

export default function Filters({ filters, setFilters, onReset }) {
  // Sur mobile, les filtres sont repliés par défaut pour laisser la place aux fiches
  const [open, setOpen] = useState(false);
  const activeCount = ['zone', 'type', 'severity', 'status'].filter((k) => filters[k] && filters[k] !== 'all').length
    + (filters.date_from ? 1 : 0) + (filters.date_to ? 1 : 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:cursor-default"
          aria-expanded={open}
        >
          <Filter className="w-4 h-4 text-slate-500" />
          Filtres
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#c2580c] text-white text-[11px] font-bold">{activeCount}</span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform sm:hidden ${open ? 'rotate-180' : ''}`} />
        </button>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="text-slate-500 h-8 px-2">
            <X className="w-4 h-4 mr-1" />
            Réinitialiser
          </Button>
        )}
      </div>

      <div className={`${open ? 'grid' : 'hidden'} sm:grid mt-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4`}>
          {/* Zone */}
          <Select
            value={filters.zone}
            onValueChange={(value) => setFilters(prev => ({ ...prev, zone: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes zones</SelectItem>
              <SelectItem value="Worodougou">Worodougou</SelectItem>
              <SelectItem value="Cavally">Cavally</SelectItem>
            </SelectContent>
          </Select>

          {/* Type */}
          <Select
            value={filters.type}
            onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="A">Accident</SelectItem>
              <SelectItem value="I">Incident</SelectItem>
              <SelectItem value="PA">Presqu'accident</SelectItem>
            </SelectContent>
          </Select>

          {/* Severity */}
          <Select
            value={filters.severity}
            onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes gravités" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes gravités</SelectItem>
              <SelectItem value="G₀">G₀ - Grave</SelectItem>
              <SelectItem value="M₁">M₁ - Modéré</SelectItem>
              <SelectItem value="m₁">m₁ - Mineur</SelectItem>
            </SelectContent>
          </Select>

          {/* Status */}
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="Ouvert">En cours</SelectItem>
              <SelectItem value="Clos">Clôturé</SelectItem>
            </SelectContent>
          </Select>

          {/* Date début */}
          <Input
            type="date"
            placeholder="Date début"
            value={filters.date_from || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
            className="text-sm"
          />

          {/* Date fin */}
          <Input
            type="date"
            placeholder="Date fin"
            value={filters.date_to || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
            className="text-sm"
          />
      </div>
    </div>
  );
}
