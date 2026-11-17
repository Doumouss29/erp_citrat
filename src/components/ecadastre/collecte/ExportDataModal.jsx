import React, { useState, useMemo } from 'react';
import JSZip from 'jszip';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Download, CheckSquare, Square, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportDataModal({ isOpen, onClose, collectes }) {
  const [selectedCommune, setSelectedCommune] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const availableCommunes = useMemo(() => {
    const communes = new Set((collectes || []).map(c => c.commune).filter(Boolean));
    return [...communes].sort();
  }, [collectes]);

  const availableSections = useMemo(() => {
    const base = selectedCommune ? (collectes || []).filter(c => c.commune === selectedCommune) : (collectes || []);
    const sections = new Set(base.map(c => c.section).filter(Boolean));
    return [...sections].sort();
  }, [collectes, selectedCommune]);

  const filtered = useMemo(() => {
    return (collectes || []).filter(c => {
      const matchCommune = !selectedCommune || c.commune === selectedCommune;
      const matchSection = !selectedSection || c.section === selectedSection;
      const createdDate = c.created_date ? new Date(c.created_date) : null;
      const matchFrom = !dateFrom || (createdDate && createdDate >= new Date(dateFrom));
      const matchTo = !dateTo || (createdDate && createdDate <= new Date(dateTo + 'T23:59:59'));
      return matchCommune && matchSection && matchFrom && matchTo;
    });
  }, [collectes, selectedCommune, selectedSection, dateFrom, dateTo]);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map(c => c.id));
    }
  };

  const generatePdfForCollecte = (collecte, jsPDF) => {
    const doc = new jsPDF();
    const safe = (v) => String(v ?? '');
    const pageW = 210;
    const marginL = 15;
    const marginR = 15;
    const colW1 = 65;
    const colW2 = pageW - marginL - marginR - colW1;
    const rowH = 7;

    const drawTable = (doc, title, rows, startY) => {
      let y = startY;
      if (y > 250) { doc.addPage(); y = 15; }

      // Section title
      doc.setFontSize(10); doc.setFont(undefined, 'bold');
      doc.text(title, marginL, y); y += 6;

      // Header
      doc.setFillColor(41, 128, 185);
      doc.rect(marginL, y, colW1, rowH, 'F');
      doc.rect(marginL + colW1, y, colW2, rowH, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8); doc.setFont(undefined, 'bold');
      doc.text('Champ', marginL + 2, y + 5);
      doc.text('Valeur', marginL + colW1 + 2, y + 5);
      y += rowH;

      // Rows
      rows.forEach((row, i) => {
        if (y > 270) { doc.addPage(); y = 15; }
        const fillColor = i % 2 === 0 ? [255, 255, 255] : [245, 245, 245];
        doc.setFillColor(...fillColor);
        doc.rect(marginL, y, colW1, rowH, 'F');
        doc.rect(marginL + colW1, y, colW2, rowH, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(marginL, y, colW1 + colW2, rowH, 'S');
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold'); doc.setFontSize(8);
        doc.text(safe(row[0]), marginL + 2, y + 5);
        doc.setFont(undefined, 'normal');
        const valText = doc.splitTextToSize(safe(row[1]), colW2 - 4);
        doc.text(valText[0] || '', marginL + colW1 + 2, y + 5);
        y += rowH;
      });

      return y + 5;
    };

    // Header
    let y = 15;
    doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(0,0,0);
    doc.text('MINISTERE DE L\'ECONOMIE ET DES FINANCES', 105, y, { align: 'center' }); y += 6;
    doc.text('DIRECTION GENERALE DES IMPOTS - DIRECTION DU CADASTRE', 105, y, { align: 'center' }); y += 6;
    doc.text('OPERATION DE RECENSEMENT DES PROPRIETAIRES FONCIERS', 105, y, { align: 'center' }); y += 10;

    // I - Parcelle
    y = drawTable(doc, 'I - INFORMATIONS SUR LA PARCELLE', [
      ['Commune', safe(collecte.commune)], ['Section', safe(collecte.section)],
      ['Parcelle', safe(collecte.parcelle)], ['Quartier', safe(collecte.quartier)],
      ['Lot', safe(collecte.lot)], ['Ilot', safe(collecte.ilot)],
      ['Surface imposable (m²)', safe(collecte.surface_imposable)], ['Ref DGI', safe(collecte.reference_dgi)],
    ], y);

    // II - Propriétaire
    const propRows = collecte.type_proprietaire === 'societe'
      ? [['Raison sociale', safe(collecte.societe_raison_sociale)], ['N° RC', safe(collecte.societe_registre_commerce)],
         ['N° Compte', safe(collecte.societe_compte_contribuable)], ['Adresse', safe(collecte.societe_adresse_postale)],
         ['Ville', safe(collecte.societe_ville)], ['Tél', safe(collecte.societe_tel)]]
      : [['Nom', safe(collecte.prop_nom)], ['Prénoms', safe(collecte.prop_prenoms)],
         ['Date naissance', safe(collecte.prop_date_naissance)], ['Lieu naissance', safe(collecte.prop_lieu_naissance)],
         ['Nationalité', safe(collecte.prop_nationalite)], ['N° CNI', safe(collecte.prop_carte_identite)],
         ['Adresse', safe(collecte.prop_adresse_postale)], ['Ville', safe(collecte.prop_ville)],
         ['Tél', safe(collecte.prop_tel)], ['Profession', safe(collecte.prof_profession)],
         ['Sit. familiale', safe(collecte.situation_familiale)], ['Enfants', safe(collecte.nombre_enfants)],
         ['N° Compte', safe(collecte.prop_compte_contribuable)]];
    y = drawTable(doc, 'II - RENSEIGNEMENTS SUR LE PROPRIETAIRE', propRows, y);

    // III - Bien
    y = drawTable(doc, 'III - RENSEIGNEMENTS CONCERNANT LE BIEN', [
      ['Nature', safe(collecte.bien_nature_local)],
      ['Eau', collecte.bien_equipe_eau ? 'Oui' : 'Non'],
      ['Electricité', collecte.bien_equipe_electricite ? 'Oui' : 'Non'],
      ['Niveaux', safe(collecte.bien_nombre_niveaux)], ['Bâtiments', safe(collecte.bien_nombre_batiments)],
      ['Année achèvement', safe(collecte.bien_annee_achevement)], ['Pièces', safe(collecte.bien_nombre_pieces)],
      ['Val. loc. mensuelle', safe(collecte.bien_valeur_locative_mensuelle)],
    ], y);

    // Signature
    if (y > 270) { doc.addPage(); y = 15; }
    doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(0,0,0);
    doc.text(`Date de collecte : ${safe(collecte.date_collecte)}   |   Agent : ${safe(collecte.signature_agent)}`, marginL, y);

    return doc.output('arraybuffer');
  };

  const handleExport = async () => {
    if (selected.length === 0) {
      toast.error('Veuillez sélectionner au moins un rapport');
      return;
    }
    setIsExporting(true);
    setProgress({ current: 0, total: selected.length });

    try {
      // Import jsPDF dynamically
      const { jsPDF } = await import('jspdf');

      const zip = new JSZip();
      const toExport = collectes.filter(c => selected.includes(c.id));

      for (let i = 0; i < toExport.length; i++) {
        const collecte = toExport[i];
        setProgress({ current: i + 1, total: toExport.length });
        const pdfBuffer = generatePdfForCollecte(collecte, jsPDF);
        const safeName = `${collecte.commune || 'commune'}_${collecte.section || 'section'}_${collecte.parcelle || 'parcelle'}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
        zip.file(`${safeName}_${i + 1}.pdf`, pdfBuffer);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapports_pdf_${format(new Date(), 'yyyy-MM-dd')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success(`${toExport.length} rapport(s) PDF exporté(s) avec succès`);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'export : ' + error.message);
    } finally {
      setIsExporting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isExporting ? undefined : onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-800" />
            Exporter des rapports PDF (ZIP)
          </DialogTitle>
        </DialogHeader>

        {/* Filtres */}
        <div className="space-y-3 pb-3 border-b">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Date de début</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Date de fin</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          {availableCommunes.length > 0 && (
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Filtrer par commune</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelectedCommune(''); setSelectedSection(''); }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    !selectedCommune ? 'bg-blue-800 text-white border-blue-800' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                  }`}
                >
                  Toutes ({(collectes || []).length})
                </button>
                {availableCommunes.map(commune => {
                  const count = (collectes || []).filter(c => c.commune === commune).length;
                  return (
                    <button
                      key={commune}
                      onClick={() => { setSelectedCommune(prev => prev === commune ? '' : commune); setSelectedSection(''); }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        selectedCommune === commune
                          ? 'bg-blue-800 text-white border-blue-800'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                      }`}
                    >
                      {commune} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {availableSections.length > 0 && (
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Filtrer par section</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSection('')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    !selectedSection ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                  }`}
                >
                  Toutes sections
                </button>
                {availableSections.map(section => {
                  const base = selectedCommune ? (collectes || []).filter(c => c.commune === selectedCommune) : (collectes || []);
                  const count = base.filter(c => c.section === section).length;
                  return (
                    <button
                      key={section}
                      onClick={() => setSelectedSection(prev => prev === section ? '' : section)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        selectedSection === section
                          ? 'bg-slate-700 text-white border-slate-700'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                      }`}
                    >
                      Section {section} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sélection tout */}
        <div className="flex items-center justify-between text-sm">
          <button onClick={toggleAll} className="flex items-center gap-2 text-blue-800 hover:underline">
            {selected.length === filtered.length && filtered.length > 0
              ? <CheckSquare className="w-4 h-4" />
              : <Square className="w-4 h-4" />
            }
            Tout sélectionner ({filtered.length})
          </button>
          <span className="text-slate-500">{selected.length} sélectionné(s)</span>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {filtered.length === 0 && (
            <p className="text-center text-slate-500 py-8">Aucun rapport trouvé</p>
          )}
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => !isExporting && toggleSelect(c.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selected.includes(c.id)
                  ? 'border-blue-800 bg-blue-50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              {selected.includes(c.id)
                ? <CheckSquare className="w-5 h-5 text-blue-800 flex-shrink-0" />
                : <Square className="w-5 h-5 text-slate-400 flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 text-sm">
                  {c.commune || '—'} — Parcelle {c.parcelle || '—'}
                  {c.section ? ` / Section ${c.section}` : ''}
                </div>
                <div className="text-xs text-slate-500">
                  {c.type_proprietaire === 'particulier'
                    ? `${c.prop_nom || ''} ${c.prop_prenoms || ''}`.trim() || '—'
                    : c.societe_raison_sociale || '—'
                  } • {c.created_date ? format(new Date(c.created_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                </div>
              </div>
              <FileText className="w-4 h-4 text-slate-300 flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {isExporting && progress.total > 0 && (
          <div className="pt-2 pb-1">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Génération des PDFs...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-800 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>Annuler</Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || selected.length === 0}
            className="bg-blue-800 hover:bg-blue-900 text-white"
          >
            {isExporting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Génération en cours...</>
              : <><Download className="w-4 h-4 mr-2" /> Exporter {selected.length > 0 ? `${selected.length} PDF(s)` : ''} ZIP</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}