import { FormSelect } from "@/components/ui/form-select";
import React from 'react';
import { Filter } from 'lucide-react';

export default function CaisseFilters({ filters, onChange, bureaux, isAdmin, onApply, onReset }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tableau des opérations</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onReset} className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Réinitialiser
          </button>
          <button type="button" onClick={onApply} className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Appliquer le filtre
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {isAdmin && (
          <label className="space-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 font-medium text-slate-700"><Filter className="h-4 w-4" /> Bureau</span>
            <FormSelect value={filters.bureauId} onChange={(event) => onChange('bureauId', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-slate-900 outline-none focus:border-slate-400">
              <option value="all">Tous les bureaux</option>
              {bureaux.map((bureau) => (
                <option key={bureau.id} value={bureau.id}>{bureau.nom}</option>
              ))}
            </FormSelect>
          </label>
        )}

        <label className="space-y-2 text-sm text-slate-600">
          <span className="font-medium text-slate-700">Type</span>
          <FormSelect value={filters.type} onChange={(event) => onChange('type', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-slate-900 outline-none focus:border-slate-400">
            <option value="all">Tous</option>
            <option value="entree">Entrée</option>
            <option value="sortie">Sortie</option>
            <option value="solde_depart">Solde de départ</option>
          </FormSelect>
        </label>


        <label className="space-y-2 text-sm text-slate-600">
          <span className="font-medium text-slate-700">Du</span>
          <input type="date" value={filters.dateFrom} onChange={(event) => onChange('dateFrom', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-slate-900 outline-none focus:border-slate-400" />
        </label>

        <label className="space-y-2 text-sm text-slate-600">
          <span className="font-medium text-slate-700">Au</span>
          <input type="date" value={filters.dateTo} onChange={(event) => onChange('dateTo', event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-slate-900 outline-none focus:border-slate-400" />
        </label>
      </div>
    </div>
  );
}