import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Shield, ScrollText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useCaisseModule from '@/hooks/useCaisseModule';
import { formatCurrency } from '@/components/board/comptabilite/caisseUtils';
import { ACTION_LABELS, ACTION_BADGES } from '@/lib/caisseApi';
import { scopeToUserBureaux } from '@/lib/boardScope';

const dateTime = (v) => (v ? new Date(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '');
// Date réelle de l'action (renseignée pour les lignes reconstituées), sinon date d'enregistrement
const actionDate = (e) => e.date_action || e.created_date;
const TYPE_SHORT = { entree: 'Entrée', sortie: 'Sortie', solde_depart: 'Solde initial' };

function details(e) {
  const parts = [];
  // Les lignes de reprise sont signalées par leur badge : leur motif générique n'est pas répété
  if (e.motif && !e.reprise) parts.push(`Motif : ${e.motif}`);
  if (e.action === 'modification' && Array.isArray(e.changements)) {
    e.changements.forEach((c) => parts.push(`${c.label || c.champ} : ${c.avant || '—'} → ${c.apres || '—'}`));
  }
  return parts;
}

function exportCsv(rows, bureauName) {
  const head = ['Date et heure', 'Utilisateur', 'Email', 'Action', 'N° bon', 'Type', 'Bureau', 'Bénéficiaire', 'Montant', 'Détails'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((e) => [
    dateTime(actionDate(e)), e.user_nom, e.user_email, ACTION_LABELS[e.action] || e.action, e.numero_bon,
    TYPE_SHORT[e.type_operation] || e.type_operation, bureauName(e), e.beneficiaire, e.montant ?? '', details(e).join(' | '),
  ].map(esc).join(';'));
  const blob = new Blob(['﻿' + [head.map(esc).join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `journal-caisses-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ComptabiliteJournal() {
  const { user, bureaux, allBureaux, isAdmin, hasAssignedBureau, isLoading } = useCaisseModule();
  const isDirection = isAdmin || user?.role === 'admin';
  // Direction : tous les bureaux. Bureaux : lecture seule de leur propre journal.
  const canRead = isDirection || hasAssignedBureau;
  const [filters, setFilters] = useState({ bureau: '', user: '', action: '', from: '', to: '', search: '' });
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const { data: rawEntries = [], isLoading: loadingJournal } = useQuery({
    queryKey: ['caisse-journal', user?.id],
    queryFn: () => base44.entities.JournalCaisse.list('-created_date', 5000),
    enabled: !!canRead,
    refetchInterval: 60_000,
  });

  const entries = useMemo(() => (isDirection ? rawEntries : scopeToUserBureaux(rawEntries, user)), [rawEntries, user, isDirection]);
  const filterBureaux = isDirection ? allBureaux : bureaux;
  const bureauName = (e) => allBureaux.find((b) => b.id === e.bureau_id)?.nom || e.bureau_code || '';
  const users = useMemo(() => {
    const m = new Map();
    entries.forEach((e) => m.set(e.user_email, e.user_nom || e.user_email));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [entries]);

  const rows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return entries.filter((e) => {
      const day = (actionDate(e) || '').slice(0, 10);
      if (filters.bureau && e.bureau_id !== filters.bureau) return false;
      if (filters.user && e.user_email !== filters.user) return false;
      if (filters.action && e.action !== filters.action) return false;
      if (filters.from && day < filters.from) return false;
      if (filters.to && day > filters.to) return false;
      if (q && ![e.numero_bon, e.beneficiaire, e.motif].some((v) => String(v || '').toLowerCase().includes(q))) return false;
      return true;
    }).sort((a, b) => new Date(actionDate(b)) - new Date(actionDate(a)));
  }, [entries, filters]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm max-w-md">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Accès réservé</h2>
          <p className="text-slate-500">Le journal est disponible une fois votre compte rattaché à un bureau.</p>
        </div>
      </div>
    );
  }

  const selectCls = 'h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200';
  const hasFilters = Object.values(filters).some(Boolean);
  const amountOf = (e) => (e.montant != null ? formatCurrency(e.montant) : '');
  const ReprisePill = () => (
    <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500" title="Ligne reconstituée à partir des bons existants avant la mise en place du journal">Reprise</span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-7xl space-y-4 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8">
        {/* En-tête : titre et export sur la même ligne */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 sm:gap-3 sm:text-3xl"><ScrollText className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" /> Journal des caisses</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-base">
              Qui a créé, modifié ou annulé quel bon, et quand. Non modifiable.
              {!isDirection && <span className="ml-1 font-medium text-slate-600">Lecture seule, limitée à votre bureau.</span>}
            </p>
          </div>
          <Button onClick={() => exportCsv(rows, bureauName)} disabled={!rows.length} className="h-10 shrink-0 gap-2 rounded-xl bg-slate-900 px-3 hover:bg-slate-800 sm:rounded-2xl sm:px-4" title="Exporter en CSV">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter</span>
            <span>({rows.length})</span>
          </Button>
        </div>

        {/* Filtres : recherche en premier, puis 2 colonnes (mobile), 3 (tablette), 6 (ordinateur) */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-3 sm:p-4 md:grid-cols-3 lg:grid-cols-6">
          <Input className="col-span-2 md:col-span-3 lg:col-span-1 lg:order-last" value={filters.search} onChange={set('search')} placeholder="Rechercher : N° bon, bénéficiaire…" />
          <select className={selectCls} value={filters.bureau} onChange={set('bureau')} aria-label="Bureau">
            <option value="">{isDirection ? 'Tous les bureaux' : 'Mes bureaux'}</option>
            {filterBureaux.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
          <select className={selectCls} value={filters.user} onChange={set('user')} aria-label="Utilisateur">
            <option value="">Tous les utilisateurs</option>
            {users.map(([email, name]) => <option key={email} value={email}>{name}</option>)}
          </select>
          <select className={`${selectCls} col-span-2 md:col-span-1`} value={filters.action} onChange={set('action')} aria-label="Action">
            <option value="">Toutes les actions</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="relative min-w-0 md:col-span-1">
            <span className="pointer-events-none absolute -top-2 left-2 bg-white px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Du</span>
            <Input type="date" value={filters.from} onChange={set('from')} aria-label="Du" />
          </label>
          <label className="relative min-w-0 md:col-span-1">
            <span className="pointer-events-none absolute -top-2 left-2 bg-white px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Au</span>
            <Input type="date" value={filters.to} onChange={set('to')} aria-label="Au" />
          </label>
          {hasFilters && (
            <button type="button" onClick={() => setFilters({ bureau: '', user: '', action: '', from: '', to: '', search: '' })} className="col-span-2 text-left text-xs font-semibold text-slate-500 hover:text-slate-900 md:col-span-3 lg:col-span-6">
              Effacer les filtres
            </button>
          )}
        </div>

        {loadingJournal ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">Aucune action enregistrée pour ces critères.</div>
        ) : (
          <>
            {/* Mobile et tablette : une carte par action */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
              {rows.map((e) => (
                <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${ACTION_BADGES[e.action] || ''}`}>{ACTION_LABELS[e.action] || e.action}</span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">{e.reprise && <ReprisePill />}{dateTime(actionDate(e))}</span>
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-slate-700">{e.numero_bon || '—'}</p>
                      <p className="mt-0.5 truncate text-sm text-slate-800">{e.beneficiaire || TYPE_SHORT[e.type_operation] || '—'}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{TYPE_SHORT[e.type_operation] || ''}{bureauName(e) ? ` · ${bureauName(e)}` : ''}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-bold tabular-nums ${e.type_operation === 'sortie' ? 'text-red-600' : e.type_operation === 'entree' ? 'text-emerald-600' : 'text-slate-900'}`}>{amountOf(e)}</p>
                  </div>
                  {details(e).length > 0 && (
                    <div className="mt-2 space-y-0.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {details(e).map((d, i) => <div key={i}>{d}</div>)}
                    </div>
                  )}
                  <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
                    Par <strong className="text-slate-800">{e.user_nom || e.user_email}</strong>
                    {e.user_nom && e.user_nom !== e.user_email && <span className="text-slate-400"> · {e.user_email}</span>}
                  </p>
                </div>
              ))}
            </div>

            {/* Ordinateur : tableau */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-left text-xs uppercase tracking-wide text-white">
                      <th className="px-4 py-3">Date et heure</th>
                      <th className="px-4 py-3">Utilisateur</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">N° bon</th>
                      <th className="px-4 py-3">Bureau</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                      <th className="px-4 py-3">Détails</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((e) => (
                      <tr key={e.id} className="align-top hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                          <div>{dateTime(actionDate(e))}</div>
                          {e.reprise && <div className="mt-1"><ReprisePill /></div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{e.user_nom || e.user_email}</div>
                          {e.user_nom && e.user_nom !== e.user_email && <div className="text-xs text-slate-400">{e.user_email}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${ACTION_BADGES[e.action] || ''}`}>{ACTION_LABELS[e.action] || e.action}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="whitespace-nowrap font-mono text-xs font-semibold text-slate-700">{e.numero_bon || '—'}</div>
                          <div className="text-xs text-slate-400">{TYPE_SHORT[e.type_operation] || ''}{e.beneficiaire ? ` · ${e.beneficiaire}` : ''}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{bureauName(e)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">{amountOf(e)}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {details(e).map((d, i) => <div key={i}>{d}</div>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
