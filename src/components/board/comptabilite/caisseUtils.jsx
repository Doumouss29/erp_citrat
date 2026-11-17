const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF',
  maximumFractionDigits: 0
});

const compactCurrencyFormatter = new Intl.NumberFormat('fr-FR', {
  notation: 'compact',
  maximumFractionDigits: 1
});

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit'
});

const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric'
});

export const TYPE_LABELS = {
  solde_depart: 'Solde de départ',
  entree: 'Entrée de caisse',
  sortie: 'Sortie de caisse'
};

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

export function formatCompactCurrency(value) {
  return compactCurrencyFormatter.format(Number(value) || 0);
}

export function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : '—';
}

export function getTypeBadgeClass(type) {
  return {
    entree: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    sortie: 'bg-red-50 text-red-700 border border-red-200'
  }[type] || 'bg-slate-100 text-slate-700 border border-slate-200';
}

export function toDateString(value) {
  return new Date(value).toISOString().split('T')[0];
}

function addDays(value, amount) {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

// Date du jour (heure locale) au format AAAA-MM-JJ
export function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toUtcDate(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  const [y, m, d] = String(value || todayString()).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function shiftDateString(value, days) {
  const d = toUtcDate(value);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Semaine comptable : du vendredi au jeudi (rapport envoyé le vendredi)
export function getAccountingWeek(referenceDate) {
  const base = toUtcDate(referenceDate);
  const diff = (base.getUTCDay() - 5 + 7) % 7; // jours écoulés depuis le vendredi
  const start = new Date(base);
  start.setUTCDate(base.getUTCDate() - diff);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const startString = start.toISOString().slice(0, 10);
  const endString = end.toISOString().slice(0, 10);
  return {
    start,
    end,
    startDate: start,
    endDate: end,
    startString,
    endString,
    periodLabel: `Semaine comptable du vendredi ${formatDate(startString)} au jeudi ${formatDate(endString)}`
  };
}

// Dernière semaine comptable terminée (celle dont le rapport est envoyé le vendredi)
export function lastClosedWeekReference(referenceDate = todayString()) {
  const current = getAccountingWeek(referenceDate);
  return shiftDateString(current.startString, -1); // le jeudi précédent
}

function getWeekRange(referenceDate) {
  const { start, end } = getAccountingWeek(referenceDate);
  return { start, end };
}

export const montantEffectif = (op) => (op.montant_recu != null ? Number(op.montant_recu) : Number(op.montant || 0));

// Solde reporté : tout ce qui précède la date (solde initial + entrées - sorties)
export function computeCarryOver(operations, beforeDateString) {
  return (operations || [])
    .filter((op) => op.date_operation && op.date_operation < beforeDateString)
    .reduce((sum, op) => {
      if (op.type_operation === 'solde_depart') return sum + Number(op.montant || 0);
      if (op.type_operation === 'entree') return sum + montantEffectif(op);
      if (op.type_operation === 'sortie') return sum - montantEffectif(op);
      return sum;
    }, 0);
}

function getMonthRange(referenceDate) {
  const base = toUtcDate(referenceDate);
  const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0));
  return { start, end };
}

export function getDateRangeConfig(filters) {
  if (filters.periodType === 'personnalise') {
    const start = new Date(filters.dateFrom || filters.referenceDate);
    const end = new Date(filters.dateTo || filters.dateFrom || filters.referenceDate);
    return {
      startDate: start,
      endDate: end,
      startString: toDateString(start),
      endString: toDateString(end),
      periodLabel: `${formatDate(start)} au ${formatDate(end)}`
    };
  }

  const { start, end } = filters.periodType === 'mensuel'
    ? getMonthRange(filters.referenceDate)
    : getWeekRange(filters.referenceDate);

  if (filters.periodType !== 'mensuel') return getAccountingWeek(filters.referenceDate);

  return {
    startDate: start,
    endDate: end,
    startString: toDateString(start),
    endString: toDateString(end),
    periodLabel: `Mois de ${monthFormatter.format(start)}`
  };
}

export function filterOperationsByRange(operations, range) {
  return operations
    .filter((operation) => operation.date_operation >= range.startString && operation.date_operation <= range.endString)
    .sort((a, b) => new Date(a.date_operation) - new Date(b.date_operation));
}

// carryOver : solde reporté de la période précédente (le solde de départ = reste du solde antérieur)
export function getOperationsMetrics(operations, carryOver = 0) {
  const effectif = montantEffectif;
  const reste = (op) => Number(op.montant_reste || 0);

  const soldeDepart = Number(carryOver || 0) + operations
    .filter((op) => op.type_operation === 'solde_depart')
    .reduce((sum, op) => sum + Number(op.montant || 0), 0);

  const totalEntrees = operations
    .filter((op) => op.type_operation === 'entree')
    .reduce((sum, op) => sum + effectif(op), 0);

  const totalSorties = operations
    .filter((op) => op.type_operation === 'sortie')
    .reduce((sum, op) => sum + effectif(op), 0);

  const totalRestesEntrees = operations
    .filter((op) => op.type_operation === 'entree')
    .reduce((sum, op) => sum + reste(op), 0);

  const totalRestesSorties = operations
    .filter((op) => op.type_operation === 'sortie')
    .reduce((sum, op) => sum + reste(op), 0);

  return {
    soldeDepart,
    totalEntrees,
    totalSorties,
    totalRestesEntrees,
    totalRestesSorties,
    solde: soldeDepart + totalEntrees - totalSorties,
    totalOperations: operations.length
  };
}

export function buildTrendData(operations, range) {
  const buckets = [];
  let cursor = new Date(range.startDate);

  while (cursor <= range.endDate) {
    const dateKey = toDateString(cursor);
    const dayOperations = operations.filter((operation) => operation.date_operation === dateKey);
    const dayMetrics = getOperationsMetrics(dayOperations);

    buckets.push({
      label: shortDateFormatter.format(cursor),
      entrees: dayMetrics.totalEntrees,
      sorties: dayMetrics.totalSorties
    });

    cursor = addDays(cursor, 1);
  }

  return buckets;
}

export function buildSummaryRows(operations, periodType, range) {
  const rows = [];

  if (periodType === 'mensuel') {
    let cursor = new Date(range.startDate);

    while (cursor <= range.endDate) {
      const bucketStart = new Date(cursor);
      const bucketEnd = addDays(bucketStart, 6);
      const boundedEnd = bucketEnd > range.endDate ? new Date(range.endDate) : bucketEnd;
      const bucketOperations = operations.filter((operation) => operation.date_operation >= toDateString(bucketStart) && operation.date_operation <= toDateString(boundedEnd));
      const bucketMetrics = getOperationsMetrics(bucketOperations);

      rows.push({
        period: `${formatDate(bucketStart)} — ${formatDate(boundedEnd)}`,
        totalEntrees: bucketMetrics.totalEntrees,
        totalSorties: bucketMetrics.totalSorties,
        solde: bucketMetrics.solde
      });

      cursor = addDays(bucketStart, 7);
    }

    return rows;
  }

  let cursor = new Date(range.startDate);
  while (cursor <= range.endDate) {
    const dateKey = toDateString(cursor);
    const dayOperations = operations.filter((operation) => operation.date_operation === dateKey);
    const dayMetrics = getOperationsMetrics(dayOperations);

    rows.push({
      period: formatDate(cursor),
      totalEntrees: dayMetrics.totalEntrees,
      totalSorties: dayMetrics.totalSorties,
      solde: dayMetrics.solde
    });

    cursor = addDays(cursor, 1);
  }

  return rows;
}

export function buildReportData(operations, periodType, referenceDate, bureauLabel) {
  const range = getDateRangeConfig({ periodType, referenceDate });
  const filteredOperations = filterOperationsByRange(operations, range).sort((a, b) => new Date(b.date_operation) - new Date(a.date_operation));
  const metrics = getOperationsMetrics(filteredOperations);

  return {
    title: periodType === 'mensuel' ? 'Rapport mensuel de caisse' : 'Rapport hebdomadaire de caisse',
    bureauLabel,
    periodLabel: range.periodLabel,
    totalEntrees: metrics.totalEntrees,
    totalSorties: metrics.totalSorties,
    solde: metrics.solde,
    operations: filteredOperations
  };
}