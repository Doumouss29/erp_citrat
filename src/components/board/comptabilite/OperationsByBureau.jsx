import React from 'react';
import { Eye, History, Ban, Pencil, Printer, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Plus, Lock, CalendarDays, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, getTypeBadgeClass, TYPE_LABELS, computeCarryOver, filterOperationsByRange, getOperationsMetrics, getAccountingWeek, shiftDateString, todayString } from './caisseUtils';
import CaisseOperationsKpis from './CaisseOperationsKpis';

import { canEditOperationCaisse } from '@/lib/userFonctions';

function canEditOperation(operation, user, isAdmin) {
  return !isAdmin && canEditOperationCaisse(operation, user);
}

// Synthèse d'une semaine comptable : solde de départ = reste du solde antérieur
export function weekMetrics(operations, range) {
  if (!range) return getOperationsMetrics(operations);
  const carry = computeCarryOver(operations, range.startString);
  return getOperationsMetrics(filterOperationsByRange(operations, range), carry);
}

// Sélecteur de semaine comptable (vendredi → jeudi)
const dayMonth = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const yearFmt = new Intl.DateTimeFormat('fr-FR', { year: 'numeric', timeZone: 'UTC' });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function WeekNav({ range, onChange }) {
  if (!range || !onChange) return null;
  const today = todayString();
  const isCurrent = today >= range.startString && today <= range.endString;
  const isFuture = range.startString > today;
  const status = isCurrent
    ? { label: 'En cours', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
    : isFuture
      ? { label: 'À venir', cls: 'bg-slate-100 text-slate-600 ring-slate-200' }
      : { label: 'Clôturée', cls: 'bg-amber-50 text-amber-700 ring-amber-200' };
  const startLabel = cap(dayMonth.format(range.start).replace('.', ''));
  const endLabel = cap(dayMonth.format(range.end).replace('.', ''));

  const arrowCls = 'flex h-10 w-9 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-900';
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button type="button" className={arrowCls} onClick={() => onChange(shiftDateString(range.startString, -7))} aria-label="Semaine précédente" title="Semaine précédente">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <label className="relative flex cursor-pointer items-center gap-2 border-x border-slate-200 px-3 text-sm hover:bg-slate-50" title="Semaine comptable (vendredi → jeudi) — cliquer pour choisir une date">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          <span className="whitespace-nowrap font-semibold text-slate-800">{startLabel} → {endLabel} {yearFmt.format(range.end)}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${status.cls}`}>{status.label}</span>
          <input type="date" value={range.startString} onChange={(e) => e.target.value && onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Choisir une date" />
        </label>
        <button type="button" className={arrowCls} onClick={() => onChange(shiftDateString(range.startString, 7))} aria-label="Semaine suivante" title="Semaine suivante">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {!isCurrent && (
        <button type="button" onClick={() => onChange(today)} className="text-xs font-semibold text-slate-500 hover:text-slate-900 hover:underline underline-offset-4">
          Aujourd'hui
        </button>
      )}
    </div>
  );
}

// Carte grisée d'un bureau auquel l'utilisateur n'a pas accès : nom visible, montants masqués
function LockedBureauCard({ bureau }) {
  const Line = ({ label }) => (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-400 font-medium">{label}</span>
      <span className="font-bold text-base text-slate-300">—</span>
    </div>
  );
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden opacity-60 grayscale select-none" title="Vous n'avez pas accès à ce bureau" aria-disabled="true">
      <div className="flex items-center justify-between bg-slate-400 px-4 py-3">
        <h3 className="font-bold text-white text-base">{bureau.nom}</h3>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white border border-white/40 rounded-lg px-3 py-1.5 cursor-not-allowed">
          <Lock className="h-3.5 w-3.5" />
          Accès réservé
        </span>
      </div>
      <div className="p-3 space-y-2">
        <Line label="Solde actuel" />
        <Line label="Entrées" />
        <Line label="Sorties" />
      </div>
    </div>
  );
}

function BureauCard({ bureau, operations, onSelect, range }) {
  const { totalEntrees: entrees, totalSorties: sorties, solde } = weekMetrics(operations, range);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between bg-blue-600 px-4 py-3">
        <h3 className="font-bold text-white text-base">{bureau.nom}</h3>
        <Button
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/20 gap-1.5 text-xs font-semibold border border-white/30 rounded-lg px-3 py-1.5"
          onClick={() => onSelect(bureau)}
        >
          <Eye className="h-3.5 w-3.5" />
          Voir
        </Button>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500">
              <Wallet className="h-4 w-4 text-white" />
            </span>
            Solde actuel
          </div>
          <span className={`font-bold text-base ${solde >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(solde)}</span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500">
              <TrendingUp className="h-4 w-4 text-white" />
            </span>
            Entrées
          </div>
          <span className="font-bold text-base text-green-600">{formatCurrency(entrees)}</span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-400">
              <TrendingDown className="h-4 w-4 text-white" />
            </span>
            Sorties
          </div>
          <span className="font-bold text-base text-orange-500">{formatCurrency(sorties)}</span>
        </div>
      </div>
    </div>
  );
}

function BureauDetail({ bureau, operations: allBureauOps, cancelledOperations = [], user, isAdmin, onBack, onEdit, onPrint, onDelete, onHistory, canCreate, onCreate, range, onRangeChange }) {
  const cancelledThisWeek = (range ? filterOperationsByRange(cancelledOperations, range) : cancelledOperations)
    .slice()
    .sort((a, b) => new Date(b.date_operation) - new Date(a.date_operation));
  const metrics = weekMetrics(allBureauOps, range);
  // Opérations de la semaine comptable affichée (les plus récentes d'abord)
  const operations = (range ? filterOperationsByRange(allBureauOps, range) : allBureauOps)
    .slice()
    .sort((a, b) => new Date(b.date_operation) - new Date(a.date_operation));

  const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;

  // Liste des semaines comptables : de la plus ancienne opération du bureau (au plus 1 an) à la semaine en cours
  const today = todayString();
  const currentStart = getAccountingWeek(today).startString;
  const oldest = allBureauOps.reduce((m, o) => (o.date_operation && o.date_operation < m ? o.date_operation : m), currentStart);
  const limit = shiftDateString(currentStart, -52 * 7);
  const firstStart = getAccountingWeek(oldest < limit ? limit : oldest).startString;
  const weeks = [];
  for (let d = currentStart; d >= firstStart; d = shiftDateString(d, -7)) weeks.push(getAccountingWeek(d));
  if (range && !weeks.some((w) => w.startString === range.startString)) weeks.unshift(range);

  const NAVY = '#0f2a4a';
  const renderActions = (operation) => (
    <>
      {operation.type_operation === 'solde_depart' ? (
        (isAdmin || canEditOperationCaisse(operation, user)) && (
        <div className="flex gap-1.5 justify-center">
          <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs" onClick={() => onEdit(operation)}>
            <Pencil className="h-3 w-3" />
            Modifier
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => onDelete?.(operation)} title="Annuler">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {onHistory && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100" onClick={() => onHistory(operation)} title="Historique">
              <History className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        )
      ) : (
        <div className="flex gap-1.5 justify-center">
          <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs gap-1.5" onClick={() => onPrint?.(operation)}>
            <Printer className="h-3 w-3" />
            Imprimer
          </Button>
          {canEditOperation(operation, user, isAdmin) && (
            <>
              <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs" onClick={() => onEdit(operation)}>
                <Pencil className="h-3 w-3" />
                Modifier
              </Button>
            </>
          )}
          {onDelete && (isAdmin || canEditOperationCaisse(operation, user)) && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => onDelete(operation)} title="Annuler le bon" aria-label="Annuler le bon">
              <Ban className="h-3.5 w-3.5" />
            </Button>
          )}
          {onHistory && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100" onClick={() => onHistory(operation)} title="Historique" aria-label="Historique">
              <History className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </>
  );


  return (
    <div className="space-y-4 sm:space-y-6">
      {/* En-tête institutionnel : fil d'Ariane, bureau, période et action */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1" style={{ background: NAVY }} />
        <div className="flex flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <nav className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500" aria-label="Fil d'Ariane">
              <button type="button" onClick={onBack} className="inline-flex items-center gap-1 uppercase tracking-[0.12em] hover:text-slate-900">
                <ChevronLeft className="h-3.5 w-3.5" />
                Opérations de caisse
              </button>
              <span className="text-slate-300">/</span>
              <span className="text-slate-400">Bureau</span>
            </nav>
            <h1 className="mt-1 text-xl font-bold tracking-tight sm:mt-1.5 sm:text-2xl lg:text-[28px]" style={{ color: NAVY }}>Bureau de {bureau.nom}</h1>
            <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">Journal de caisse hebdomadaire</p>
          </div>

          <div className="flex items-end gap-2 sm:gap-3">
            {range && onRangeChange && (
              <label className="flex min-w-0 flex-1 flex-col lg:flex-none">
                <span className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Semaine comptable</span>
                <select
                  value={range.startString}
                  onChange={(e) => onRangeChange(e.target.value)}
                  className="h-11 w-full min-w-0 rounded-lg sm:h-10 lg:w-auto lg:min-w-[270px] border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  {weeks.map((w) => (
                    <option key={w.startString} value={w.startString}>
                      {formatDate(w.startString).slice(0, 5)} – {formatDate(w.endString)}{w.startString === currentStart ? ' (en cours)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {onCreate && (
              <Button onClick={() => onCreate(bureau)} disabled={!canCreate} className="h-11 w-11 shrink-0 rounded-lg p-0 gap-1.5 text-white hover:opacity-90 sm:h-10 sm:w-auto sm:px-4" style={{ background: NAVY }} aria-label="Nouvelle opération" title="Nouvelle opération">
                <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Nouvelle opération</span>
              </Button>
            )}
          </div>
        </div>

      </section>

      {/* Synthèse de la semaine comptable : mêmes cartes que la page d'ensemble */}
      <CaisseOperationsKpis metrics={metrics} />

      <h2 className="px-1 text-base font-bold text-slate-800 sm:text-lg">Opérations de la semaine ({operations.length})</h2>

      {operations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
          Aucune opération pour ce bureau cette semaine.
        </div>
      ) : (
        <>
        {/* Mobile : une carte par opération */}
        <div className="space-y-3 md:hidden">
          {operations.map((operation) => (
            <div key={operation.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getTypeBadgeClass(operation.type_operation)}`}>
                    {TYPE_LABELS[operation.type_operation]}
                  </span>
                  <p className="mt-1.5 truncate text-sm font-medium text-slate-800">{operation.beneficiaire || operation.description || '—'}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDate(operation.date_operation)}{operation.numero_bon ? <> · <span className="font-mono">{operation.numero_bon}</span></> : null}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-base font-bold tabular-nums ${operation.type_operation === 'sortie' ? 'text-red-600' : operation.type_operation === 'entree' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {formatCurrency(operation.montant)}
                  </p>
                  {operation.montant_reste > 0 && (
                    <p className="mt-0.5 text-[11px] font-semibold text-red-600">Reste {formatCurrency(operation.montant_reste)}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-slate-400">{operation.justificatif_url ? 'Justificatif ✓' : 'Sans justificatif'}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                {renderActions(operation)}
              </div>
            </div>
          ))}
        </div>

        {/* Tablette et ordinateur : tableau */}
        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-left text-white">
                  <th className="px-3 py-3 lg:px-5 lg:py-3.5 font-semibold text-xs uppercase tracking-wide">Date</th>
                  <th className="px-3 py-3 lg:px-5 lg:py-3.5 font-semibold text-xs uppercase tracking-wide">N° Bon</th>
                  <th className="px-3 py-3 lg:px-5 lg:py-3.5 font-semibold text-xs uppercase tracking-wide">Type</th>
                  <th className="px-3 py-3 lg:px-5 lg:py-3.5 font-semibold text-xs uppercase tracking-wide">Bénéficiaire</th>
                  <th className="px-3 py-3 lg:px-5 lg:py-3.5 font-semibold text-xs uppercase tracking-wide text-right">Montant</th>
                  <th className="px-3 py-3 lg:px-5 lg:py-3.5 font-semibold text-xs uppercase tracking-wide text-right">Reçu</th>
                  <th className="px-3 py-3 lg:px-5 lg:py-3.5 font-semibold text-xs uppercase tracking-wide text-center">Reste</th>
                  <th className="px-3 py-3 lg:px-5 lg:py-3.5 font-semibold text-xs uppercase tracking-wide text-center">Justif.</th>
                  <th className="px-3 py-3 lg:px-5 lg:py-3.5 font-semibold text-xs uppercase tracking-wide text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operations.map((operation, idx) => (
                  <tr key={operation.id} className={`hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                    <td className="px-3 py-3 lg:px-5 lg:py-3.5">
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{formatDate(operation.date_operation)}</span>
                    </td>
                    <td className="px-3 py-3 lg:px-5 lg:py-3.5">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">{operation.numero_bon || '—'}</span>
                    </td>
                    <td className="px-3 py-3 lg:px-5 lg:py-3.5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTypeBadgeClass(operation.type_operation)}`}>
                        {TYPE_LABELS[operation.type_operation]}
                      </span>
                    </td>
                    <td className="px-3 py-3 lg:px-5 lg:py-3.5 text-slate-600 text-xs max-w-[140px] truncate" title={operation.beneficiaire || operation.description}>
                      {operation.beneficiaire || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3 lg:px-5 lg:py-3.5 text-right font-bold text-slate-900">{formatCurrency(operation.montant)}</td>
                    <td className="px-3 py-3 lg:px-5 lg:py-3.5 text-right text-xs">
                      {operation.montant_recu != null && operation.montant_recu !== operation.montant
                        ? <span className="font-semibold text-slate-700">{formatCurrency(operation.montant_recu)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3 lg:px-5 lg:py-3.5 text-center">
                      {operation.montant_reste > 0
                        ? <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 border border-red-200">{formatCurrency(operation.montant_reste)}</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3 lg:px-5 lg:py-3.5 text-center">
                      {operation.justificatif_url
                        ? <span className="inline-flex text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">✓ Oui</span>
                        : <span className="inline-flex text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">Non</span>}
                    </td>
                    <td className="px-3 py-3 lg:px-5 lg:py-3.5 text-center">
                      {renderActions(operation)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {cancelledThisWeek.length > 0 && (
        <details className="rounded-2xl border border-red-100 bg-white shadow-sm">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-red-700">
            Bons annulés cette semaine ({cancelledThisWeek.length}) — non comptés dans les soldes
          </summary>
          <ul className="divide-y divide-slate-100">
            {cancelledThisWeek.map((op) => (
              <li key={op.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-xs">
                <span className="font-mono font-semibold text-slate-500 line-through">{op.numero_bon || '—'}</span>
                <span className="text-slate-500 line-through">{formatDate(op.date_operation)} · {op.beneficiaire || op.description} · {formatCurrency(op.montant)}</span>
                <span className="text-slate-600">Annulé par <strong>{op.annule_par_email || '—'}</strong>{op.motif_annulation ? <> — « {op.motif_annulation} »</> : null}</span>
                {onHistory && (
                  <button type="button" onClick={() => onHistory(op)} className="ml-auto inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-900">
                    <History className="h-3.5 w-3.5" /> Historique
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function OperationsByBureau({ operations, cancelledOperations = [], bureaux, allowedBureauIds, user, isAdmin, onEdit, onPrint, onDelete, onHistory, canCreate, onCreate, selectedBureau, onSelectBureau, range, onRangeChange }) {
  const isAllowed = (id) => isAdmin || !allowedBureauIds || allowedBureauIds.includes(id);

  if (selectedBureau && isAllowed(selectedBureau.id)) {
    const bureauOps = operations
      .filter(o => o.bureau_id === selectedBureau.id)
      .sort((a, b) => new Date(b.date_operation) - new Date(a.date_operation));
    return (
      <BureauDetail
        bureau={selectedBureau}
        operations={bureauOps}
        cancelledOperations={cancelledOperations.filter((o) => o.bureau_id === selectedBureau.id)}
        user={user}
        isAdmin={isAdmin}
        onBack={() => onSelectBureau(null)}
        onEdit={onEdit}
        onPrint={onPrint}
        onDelete={onDelete}
        onHistory={onHistory}
        canCreate={canCreate}
        onCreate={onCreate}
        range={range}
        onRangeChange={onRangeChange}
      />
    );
  }

  // Tous les bureaux sont affichés ; ceux de l'utilisateur d'abord, les autres grisés
  const bureauxAvecOps = bureaux
    .filter(b => b.actif !== false)
    .sort((a, b) => Number(isAllowed(b.id)) - Number(isAllowed(a.id)));

  if (bureauxAvecOps.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
        Aucun bureau disponible.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Détails par Bureau</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bureauxAvecOps.map(bureau => {
          if (!isAllowed(bureau.id)) return <LockedBureauCard key={bureau.id} bureau={bureau} />;
          const bureauOps = operations.filter(o => o.bureau_id === bureau.id);
          return (
            <BureauCard
              key={bureau.id}
              bureau={bureau}
              operations={bureauOps}
              onSelect={onSelectBureau}
              range={range}
            />
          );
        })}
      </div>
    </div>
  );
}