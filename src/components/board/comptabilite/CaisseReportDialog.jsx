import { FormSelect } from "@/components/ui/form-select";
import React, { useMemo, useState } from 'react';
import { Calendar, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buildReportData, formatCurrency, formatDate, TYPE_LABELS } from './caisseUtils';
import { escapeHtml } from '@/lib/htmlUtils';

function getToday() {
  return new Date().toISOString().split('T')[0];
}

export default function CaisseReportDialog({ open, onOpenChange, operations, bureauLabel }) {
  const [periodType, setPeriodType] = useState('hebdomadaire');
  const [referenceDate, setReferenceDate] = useState(getToday());

  const report = useMemo(() => {
    return buildReportData(operations, periodType, referenceDate, bureauLabel);
  }, [operations, periodType, referenceDate, bureauLabel]);

  const handlePrint = () => {
    const reportWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!reportWindow) return;

    const rows = report.operations.map((operation) => `
      <tr>
        <td>${formatDate(operation.date_operation)}</td>
        <td>${escapeHtml(operation.bureau_code || '—')}</td>
        <td>${escapeHtml(TYPE_LABELS[operation.type_operation] || '')}</td>
        <td>${escapeHtml(formatCurrency(operation.montant))}</td>
        <td>${escapeHtml(operation.description)}</td>
        <td>${escapeHtml(operation.statut)}</td>
      </tr>
    `).join('');

    reportWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(report.title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            h1 { margin-bottom: 8px; }
            .meta { color: #475569; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
            .card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(report.title)}</h1>
          <p class="meta">Bureau : ${escapeHtml(report.bureauLabel)} • Période : ${escapeHtml(report.periodLabel)}</p>
          <div class="grid">
            <div class="card"><strong>Total entrées</strong><div>${formatCurrency(report.totalEntrees)}</div></div>
            <div class="card"><strong>Total sorties</strong><div>${formatCurrency(report.totalSorties)}</div></div>
            <div class="card"><strong>Solde</strong><div>${formatCurrency(report.solde)}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Bureau</th>
                <th>Type</th>
                <th>Montant</th>
                <th>Description</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="6">Aucune opération sur la période.</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `);

    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-3xl border-slate-200 p-0 overflow-hidden">
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-900">Rapport de caisse</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Générez un rapport hebdomadaire ou mensuel puis imprimez-le ou exportez-le en PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid grid-cols-1 gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Type de rapport</span>
              <FormSelect value={periodType} onChange={(event) => setPeriodType(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-slate-900 outline-none focus:border-slate-400">
                <option value="hebdomadaire">Hebdomadaire</option>
                <option value="mensuel">Mensuel</option>
              </FormSelect>
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 font-medium text-slate-700"><Calendar className="h-4 w-4" /> Date de référence</span>
              <input type="date" value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-slate-900 outline-none focus:border-slate-400" />
            </label>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total entrées</p>
              <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(report.totalEntrees)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total sorties</p>
              <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(report.totalSorties)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Solde</p>
              <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(report.solde)}</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{report.title}</h3>
                <p className="text-sm text-slate-500">{report.bureauLabel} • {report.periodLabel}</p>
              </div>
              <Button onClick={handlePrint} className="rounded-2xl bg-slate-900 hover:bg-slate-800">
                <Printer className="h-4 w-4" />
                Imprimer / PDF
              </Button>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Bureau</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Montant</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {report.operations.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-slate-500">Aucune opération sur cette période.</td>
                    </tr>
                  ) : report.operations.map((operation) => (
                    <tr key={operation.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{formatDate(operation.date_operation)}</td>
                      <td className="px-4 py-3">{operation.bureau_code || '—'}</td>
                      <td className="px-4 py-3">{TYPE_LABELS[operation.type_operation]}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(operation.montant)}</td>
                      <td className="px-4 py-3 text-slate-600">{operation.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}