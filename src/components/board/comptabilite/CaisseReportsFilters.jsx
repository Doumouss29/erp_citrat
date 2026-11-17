import { FormSelect } from "@/components/ui/form-select";
import React from 'react';

export default function CaisseReportsFilters({ draftFilters, onChange, bureaux, isAdmin, selectedBureauLabel, onApply, onReset, onBureauChange }) {
  // Barre d'onglets des bureaux : même modèle que le module Activités (largeur égale, ordre alphabétique)
  const tabs = [...bureaux].sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));
  // Sans choix explicite, le premier bureau (ordre alphabétique) est sélectionné
  const current = draftFilters.bureauId && draftFilters.bureauId !== 'all' ? draftFilters.bureauId : tabs[0]?.id;

  const field = 'h-11 w-full min-w-0 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 px-3 sm:px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white';
  const labelCls = 'min-w-0 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-600';
  const btn = 'h-11 rounded-xl sm:rounded-2xl border px-4 sm:px-5 text-sm font-medium transition';
  const isCustom = draftFilters.periodType === 'personnalise';

  return (
    <div className="space-y-3 sm:space-y-4">
      {isAdmin && (
        <div className="flex w-full gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:p-3" role="tablist" aria-label="Bureau">
          {tabs.map((bureau) => {
            const active = current === bureau.id;
            return (
              <button
                key={bureau.id}
                type="button"
                role="tab"
                aria-selected={active}
                title={bureau.nom}
                onClick={() => { onChange('bureauId', bureau.id); onBureauChange && onBureauChange(bureau.id); }}
                className={`min-w-0 flex-1 truncate rounded-lg px-1 py-2.5 text-center text-xs font-semibold transition-all sm:px-2 sm:py-3 sm:text-sm ${active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="sm:hidden">{bureau.code || bureau.nom}</span>
                <span className="hidden sm:inline">{bureau.nom}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className={`grid flex-1 grid-cols-2 gap-3 sm:gap-4 ${isCustom ? 'lg:grid-cols-3' : ''}`}>
            <label className={`${labelCls} ${isCustom ? 'col-span-2 lg:col-span-1' : ''}`}>
              <span className="font-medium text-slate-700">Période</span>
              <FormSelect value={draftFilters.periodType} onChange={(event) => onChange('periodType', event.target.value)} className={field}>
                <option value="hebdomadaire">Hebdomadaire (ven. → jeu.)</option>
                <option value="mensuel">Mensuel</option>
                <option value="personnalise">Personnalisé</option>
              </FormSelect>
            </label>

            {isCustom ? (
              <>
                <label className={labelCls}>
                  <span className="font-medium text-slate-700">Du</span>
                  <input type="date" value={draftFilters.dateFrom} onChange={(event) => onChange('dateFrom', event.target.value)} className={field} />
                </label>
                <label className={labelCls}>
                  <span className="font-medium text-slate-700">Au</span>
                  <input type="date" value={draftFilters.dateTo} onChange={(event) => onChange('dateTo', event.target.value)} className={field} />
                </label>
              </>
            ) : (
              <label className={labelCls}>
                <span className="font-medium text-slate-700">Date de référence</span>
                <input type="date" value={draftFilters.referenceDate} onChange={(event) => onChange('referenceDate', event.target.value)} className={field} />
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:flex lg:shrink-0">
            <button type="button" onClick={onReset} className={`${btn} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
              Réinitialiser
            </button>
            <button type="button" onClick={onApply} className={`${btn} border-slate-900 bg-slate-900 text-white hover:bg-slate-800`}>
              Appliquer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
