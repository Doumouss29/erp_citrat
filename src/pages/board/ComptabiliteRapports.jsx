import React, { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import CaisseLedgerReport, { buildLedgerRows } from '@/components/board/comptabilite/CaisseLedgerReport';
import CaisseReportsFilters from '@/components/board/comptabilite/CaisseReportsFilters';
import useCaisseModule from '@/hooks/useCaisseModule';
import { computeCarryOver, filterOperationsByRange, formatCurrency, formatDate, getDateRangeConfig, getOperationsMetrics, lastClosedWeekReference, todayString } from '@/components/board/comptabilite/caisseUtils';
import { escapeHtml } from '@/lib/htmlUtils';

function getToday() {
  return todayString();
}

function buildPrintHtml({ bureauLabel, periodLabel, metrics, rows }) {
  const generatedDate = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const rowMarkup = rows.map((row) => `
    <tr>
      <td>${formatDate(row.date_operation)}</td>
      <td>${escapeHtml(row.description || '—')}</td>
      <td class="amount">${row.soldeDepart ? formatCurrency(row.soldeDepart) : '—'}</td>
      <td class="amount">${row.entree ? formatCurrency(row.entree) : '—'}</td>
      <td class="amount">${row.sortie ? formatCurrency(row.sortie) : '—'}</td>
      <td class="amount strong">${formatCurrency(row.soldeProgressif)}</td>
      <td class="amount ${row.montantReste > 0 ? 'reste' : ''}">${row.montantReste > 0 ? formatCurrency(row.montantReste) : '—'}</td>
      <td>${escapeHtml(row.clientLabel)}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <title>Rapport de caisse</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; color: #0f172a; background: #f8fafc; }
          .page { width: 297mm; min-height: 210mm; margin: 0 auto; background: white; }
          .page-break { page-break-after: always; break-after: page; }
          .cover {
            min-height: 210mm;
            padding: 18mm 24mm;
            background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0f172a 100%);
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .cover img { width: auto; height: 84px; margin-bottom: 28px; }
          .brand { font-size: 42px; font-weight: 700; letter-spacing: 0.06em; margin: 0; }
          .subtitle { margin: 10px 0 0; font-size: 20px; color: #cbd5e1; }
          .divider { width: 90px; height: 4px; border-radius: 999px; background: rgba(255,255,255,0.28); margin: 38px 0; }
          .cover-box {
            width: 100%;
            max-width: 540px;
            padding: 24px 28px;
            border-radius: 24px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.18);
          }
          .cover-box h2 { margin: 0 0 8px; font-size: 30px; color: white; }
          .cover-box p { margin: 0; font-size: 22px; color: #bfdbfe; }
          .bureau { margin-top: 34px; font-size: 28px; font-weight: 700; text-transform: uppercase; }
          .generated { margin-top: 14px; font-size: 14px; color: #cbd5e1; }
          .content { min-height: 210mm; padding: 14mm 18mm 12mm; }
          .content-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding-bottom: 18px; border-bottom: 2px solid #e2e8f0; }
          .content-header h1 { margin: 0; font-size: 30px; }
          .content-header p { margin: 6px 0 0; color: #475569; font-size: 15px; }
          .content-header img { height: 52px; width: auto; }
          .header-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 24px; align-items: start; margin: 20px 0 18px; }
          .intro-card { border: 1px solid #dbeafe; background: #f8fbff; border-radius: 20px; padding: 20px 22px; }
          .intro-card h2 { margin: 0 0 10px; font-size: 18px; color: #0f172a; }
          .intro-card p { margin: 0; color: #475569; line-height: 1.6; font-size: 13px; }
          .recap { border: 2px solid #0f172a; border-radius: 18px; overflow: hidden; }
          .recap-title { background: #0f172a; color: white; padding: 12px 14px; text-transform: uppercase; font-weight: 700; text-align: center; letter-spacing: 0.04em; }
          .recap-row { display: grid; grid-template-columns: 1fr auto; }
          .recap-row div { padding: 12px 14px; border-top: 1px solid #cbd5e1; font-size: 13px; }
          .recap-row div:last-child { font-weight: 700; text-align: right; }
          .sheet-wrapper { border: 1px solid #cbd5e1; border-radius: 18px; overflow: hidden; }
          .sheet { width: 100%; border-collapse: collapse; }
          .sheet th, .sheet td { border: 1px solid #cbd5e1; padding: 12px 10px; font-size: 12px; line-height: 1.4; vertical-align: top; }
          .sheet thead th { background: #f6dfcf; text-transform: uppercase; font-size: 10px; letter-spacing: 0.03em; }
          .sheet tbody tr:nth-child(even) { background: #f8fafc; }
          .sheet td.amount { text-align: right; white-space: nowrap; }
          .sheet td.strong { font-weight: 700; }
          .sheet td.reste { color: #dc2626; font-weight: 700; }
          .sheet tfoot td { background: #e0f2fe; font-weight: 700; }
          .footer { border-top: 1px solid #e2e8f0; margin-top: 18px; padding-top: 10px; text-align: center; color: #94a3b8; font-size: 11px; }
          @page { size: A4 landscape; margin: 0; }
        </style>
      </head>
      <body>
        <section class="page cover page-break">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696fe5195586fd61f32bcb08/47c566a2e_images.png" alt="CITRAT Logo" />
          <h1 class="brand">CITRAT</h1>
          <p class="subtitle">Cabinet de Géomètre-Expert Soro Nanga</p>
          <div class="divider"></div>
          <div class="cover-box">
            <h2>Rapport de caisse</h2>
            <p>${periodLabel}</p>
          </div>
          <div class="bureau">${bureauLabel}</div>
          <div class="generated">Rapport généré le ${generatedDate}</div>
        </section>

        <section class="page content">
          <div class="content-header">
            <div>
              <h1>Rapport de caisse</h1>
              <p>${bureauLabel} • ${periodLabel}</p>
            </div>
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696fe5195586fd61f32bcb08/47c566a2e_images.png" alt="CITRAT Logo" />
          </div>

          <div class="header-grid">
            <div class="intro-card">
              <h2>Synthèse de la période</h2>
              <p>Ce rapport présente les mouvements d'entrée et de sortie de caisse, le solde progressif ainsi que les bénéficiaires et observations associés à chaque opération.</p>
            </div>
            <div class="recap">
              <div class="recap-title">Récapitulatif</div>
              <div class="recap-row"><div>Solde de départ</div><div>${formatCurrency(metrics.soldeDepart)}</div></div>
              <div class="recap-row"><div>Entrée de la période</div><div>${formatCurrency(metrics.totalEntrees)}</div></div>
              <div class="recap-row"><div>Sortie de la période</div><div>${formatCurrency(metrics.totalSorties)}</div></div>
              <div class="recap-row"><div>Solde de fin de période</div><div>${formatCurrency(metrics.solde)}</div></div>
            </div>
          </div>

          <div class="sheet-wrapper">
            <table class="sheet">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Libellé</th>
                  <th>Solde départ</th>
                  <th>Entrée</th>
                  <th>Sortie</th>
                  <th>Solde progressif</th>
                  <th>Reste à payer</th>
                  <th>Client / Bénéficiaire</th>
                </tr>
              </thead>
              <tbody>
                ${rowMarkup || '<tr><td colspan="8" style="text-align:center;padding:28px;color:#64748b;">Aucune donnée disponible.</td></tr>'}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2">Montant total fin de période</td>
                  <td class="amount">${formatCurrency(metrics.soldeDepart)}</td>
                  <td class="amount">${formatCurrency(metrics.totalEntrees)}</td>
                  <td class="amount">${formatCurrency(metrics.totalSorties)}</td>
                  <td class="amount">${formatCurrency(metrics.solde)}</td>
                  <td class="amount">${rows.reduce((s, r) => s + (r.montantReste || 0), 0) > 0 ? formatCurrency(rows.reduce((s, r) => s + (r.montantReste || 0), 0)) : '—'}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="footer">Cabinet de Géomètre-Expert Soro Nanga — CITRAT · Rapport de caisse</div>
        </section>
      </body>
    </html>
  `;
}

export default function ComptabiliteRapports() {
  const { bureaux, userBureau, operations, isAdmin, isLoading } = useCaisseModule();
  const initialFilters = {
    bureauId: 'all',
    // Par défaut : semaine comptable en cours (vendredi → jeudi), mise à jour au fil des saisies
    periodType: 'hebdomadaire',
    referenceDate: getToday(),
    dateFrom: getToday(),
    dateTo: getToday()
  };

  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  // Les filtres s'appliquent immédiatement
  const updateDraftFilter = (key, value) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
    setAppliedFilters((current) => ({ ...current, [key]: value }));
  };

  // Plus d'option « Tous » : par défaut, le premier bureau par ordre alphabétique
  const defaultBureauId = useMemo(
    () => [...bureaux].sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'))[0]?.id || 'all',
    [bureaux]
  );
  const adminBureauId = appliedFilters.bureauId && appliedFilters.bureauId !== 'all' ? appliedFilters.bureauId : defaultBureauId;
  const selectedBureauId = isAdmin ? adminBureauId : userBureau?.id || 'all';
  const selectedBureauLabel = isAdmin
    ? (bureaux.find((bureau) => bureau.id === adminBureauId)?.nom || 'Bureau')
    : (userBureau?.nom || 'Mon bureau');

  const bureauOperations = useMemo(() => {
    return operations.filter((operation) => selectedBureauId === 'all' || operation.bureau_id === selectedBureauId);
  }, [operations, selectedBureauId]);

  const reportRange = useMemo(() => getDateRangeConfig(appliedFilters), [appliedFilters]);
  const reportOperations = useMemo(() => filterOperationsByRange(bureauOperations, reportRange), [bureauOperations, reportRange]);
  // Solde de départ = reste du solde antérieur (tout ce qui précède le début de la période)
  const carryOver = useMemo(() => computeCarryOver(bureauOperations, reportRange.startString), [bureauOperations, reportRange]);
  const metrics = useMemo(() => getOperationsMetrics(reportOperations, carryOver), [reportOperations, carryOver]);
  const ledgerRows = useMemo(() => buildLedgerRows(reportOperations, { carryOver, startDate: reportRange.startString }), [reportOperations, carryOver, reportRange]);

  const handleGenerateReport = () => {
    setAppliedFilters(draftFilters);
    toast.success('Rapport généré');
  };

  const handleResetFilters = () => {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
    toast.success('Filtres réinitialisés');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;
    printWindow.document.write(buildPrintHtml({ bureauLabel: selectedBureauLabel, periodLabel: reportRange.periodLabel, metrics, rows: ledgerRows }));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-[1600px] space-y-4 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Rapports de caisse</h1>
          <Button onClick={handlePrint} className="h-10 w-10 shrink-0 rounded-xl bg-slate-900 p-0 text-white hover:bg-slate-800 sm:h-10 sm:w-auto sm:rounded-2xl sm:px-4" title="Imprimer" aria-label="Imprimer">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimer</span>
          </Button>
        </div>

        <CaisseReportsFilters
          draftFilters={draftFilters}
          onChange={updateDraftFilter}
          bureaux={bureaux}
          isAdmin={isAdmin}
          selectedBureauLabel={selectedBureauLabel}
          onApply={handleGenerateReport}
          onReset={handleResetFilters}
          onBureauChange={(bureauId) => {
            setAppliedFilters((current) => ({ ...current, bureauId }));
          }}
        />

        <CaisseLedgerReport
          bureauLabel={selectedBureauLabel}
          periodLabel={reportRange.periodLabel}
          rows={ledgerRows}
          metrics={metrics}
        />
      </div>
    </div>
  );
}