import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function downloadPDF({ pdfBase64 }, filename) {
  if (!pdfBase64) throw new Error('Réponse PDF vide');
  const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

export function usePDFExport() {
  const [exporting, setExporting] = useState(false);

  const exportSingleEvent = async (event) => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportHSEPDF', {
        eventId: event.id,
        exportAll: false
      });
      downloadPDF(response.data, `fiche_hse_${event.reference}.pdf`);
      toast.success('PDF exporté avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  const exportAllEvents = async (events = []) => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportHSEPDF', {
        exportAll: true,
        filteredEvents: events.length > 0 ? events : undefined
      });
      downloadPDF(response.data, 'fiches_hse_completes.pdf');
      toast.success('Fiches exportées avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  return {
    exporting,
    exportSingleEvent,
    exportAllEvents,
  };
}