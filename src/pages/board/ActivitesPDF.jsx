import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from 'lucide-react';
import { createBoardPageUrl as createPageUrl } from "@/lib/boardPageUrl";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getISOWeek } from 'date-fns';

const STATUT_CONFIG = {
  realise:    { label: 'Réalisé',    bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  en_cours:   { label: 'En cours',   bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  en_attente: { label: 'En attente', bg: '#fef9c3', color: '#a16207', border: '#fde047' },
  reporte:    { label: 'Reporté',    bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
  planifie:   { label: 'Planifié',   bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};

export default function ActivitesPDF() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bureau, setBureau] = useState(null);
  const [fichesSemaine, setFichesSemaine] = useState([]);
  const [diligences, setDiligences] = useState([]);

  const params = new URLSearchParams(location.search);
  const bureauId = params.get('bureau_id');
  const annee = parseInt(params.get('annee') || new Date().getFullYear());
  const numeroSemaine = parseInt(params.get('semaine') || getISOWeek(new Date()));

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (!bureauId) {
          setBureau(null);
          return;
        }

        const [bureauData, toutes] = await Promise.all([
          base44.entities.Bureau.get(bureauId),
          base44.entities.SuiviActiviteSemaine.filter({ bureau_id: bureauId, annee }, '-semaine_debut')
        ]);

        setBureau(bureauData);
        setFichesSemaine(toutes.filter(f => f.type_fiche === 'hebdomadaire'));
        setDiligences(toutes.filter(f => f.type_fiche === 'diligence'));
      } catch (error) {
        console.error('Chargement de la fiche de suivi impossible', error);
        setBureau(null);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [bureauId, annee]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!bureau) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Bureau non trouvé</p>
          <Button onClick={() => navigate(createPageUrl('SuiviActivites'))}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
        </div>
      </div>
    );
  }

  // Fusionner et renuméroter uniquement les activités de la semaine courante
  const toutesActivites = [];
  let num = 1;

  // Fiches hebdomadaires de la semaine courante
  fichesSemaine
    .filter(f => f.numero_semaine === numeroSemaine)
    .forEach(fiche => {
      (fiche.activites_planifiees || []).forEach(act => {
        toutesActivites.push({ ...act, numero: num++, section: `Semaine ${numeroSemaine}` });
      });
    });

  // Activités reportées (fiches antérieures non réalisées)
  fichesSemaine
    .filter(f => f.numero_semaine < numeroSemaine)
    .forEach(fiche => {
      (fiche.activites_planifiees || [])
        .filter(act => act.statut !== 'realise' && !act.archive)
        .forEach(act => {
          toutesActivites.push({ ...act, numero: num++, section: `S${fiche.numero_semaine} (reportée)` });
        });
    });

  // Diligences de la semaine courante
  diligences
    .filter(f => f.numero_semaine === numeroSemaine)
    .forEach(fiche => {
      (fiche.activites_planifiees || []).forEach(act => {
        toutesActivites.push({ ...act, numero: num++, section: 'Diligence' });
      });
    });

  // Diligences reportées (antérieures non réalisées)
  diligences
    .filter(f => f.numero_semaine < numeroSemaine)
    .forEach(fiche => {
      (fiche.activites_planifiees || [])
        .filter(act => act.statut !== 'realise' && !act.archive)
        .forEach(act => {
          toutesActivites.push({ ...act, numero: num++, section: `Diligence S${fiche.numero_semaine} (reportée)` });
        });
    });

  const dateGeneration = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Calculer les dates de début (lundi) et fin (dimanche) de la semaine ISO
  const getDateFromISOWeek = (week, year) => {
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
    return monday;
  };
  const semaineDebut = getDateFromISOWeek(numeroSemaine, annee);
  const semaineFin = new Date(semaineDebut);
  semaineFin.setDate(semaineDebut.getDate() + 6);
  const formatSemaineCourte = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const labelSemaine = `${formatSemaineCourte(semaineDebut)} — ${semaineFin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; padding: 0; }
          html { margin: 0; padding: 0; }
          header, footer, nav { display: none !important; }
          .print-container { margin: 0 !important; padding: 0 !important; box-shadow: none !important; max-width: none !important; }
          .page-break { page-break-before: avoid; page-break-after: always; break-after: page; }
          .page-content { page-break-before: auto; page-break-inside: avoid; }
          @page { margin: 10mm; size: A4; }
          .cover-title { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cover-subtitle { color: #cbd5e1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cover-bg { background: #1e293b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cover-box-title { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cover-box-sub { color: #cbd5e1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cover-box { background: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.2) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Barre d'actions */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
          <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800">
            <Printer className="w-4 h-4 mr-2" /> Imprimer / Exporter PDF
          </Button>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-5xl mx-auto p-8 print:p-0 print:max-w-none">
        <div className="print-container bg-white shadow-lg print:shadow-none">

          {/* Page de garde */}
          <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', pageBreakAfter: 'always', breakAfter: 'page' }}>
            <div className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center px-12">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696fe5195586fd61f32bcb08/47c566a2e_images.png"
                alt="CITRAT Logo"
                className="h-20 mx-auto mb-10"
              />
              <h1 className="text-5xl font-bold mb-4 text-center">CITRAT</h1>
              <p className="text-xl text-slate-300 mb-12 text-center">Cabinet de Géomètre-Expert CITRAT</p>
              <div className="w-24 h-1 bg-white/30 mb-12"></div>

              <div className="cover-box px-12 py-8 rounded-2xl mb-12 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <h2 className="cover-box-title text-3xl font-bold mb-2" style={{ color: 'white' }}>Fiche de Suivi d'Activités</h2>
                <p className="cover-box-sub text-xl" style={{ color: '#cbd5e1' }}>{labelSemaine}</p>
              </div>

              <div className="text-center space-y-3">
                <p className="text-2xl font-bold uppercase tracking-wide">{bureau.nom}</p>
                {bureau.responsable_nom && (
                  <p className="text-lg text-slate-300">Responsable : {bureau.responsable_nom}</p>
                )}
              </div>
            </div>
          </div>

          {/* Page contenu : tableau fusionné */}
          <div className="page-content page-break" style={{ padding: '12mm', minHeight: '100vh' }}>
            {/* En-tête */}
            <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-200">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Fiche de Suivi d'Activités</h1>
                <p className="text-slate-600 mt-1">{labelSemaine}</p>
              </div>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696fe5195586fd61f32bcb08/47c566a2e_images.png"
                alt="CITRAT" className="h-12"
              />
            </div>

            {toutesActivites.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-lg">Aucune activité enregistrée pour cette période.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: 'white' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', width: '40px', fontWeight: 700 }}>#</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>Activité</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '100px', fontWeight: 700 }}>Type</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '110px', fontWeight: 700 }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {toutesActivites.map((act, i) => {
                    const cfg = STATUT_CONFIG[act.statut] || STATUT_CONFIG.planifie;
                    const isEven = i % 2 === 0;
                    return (
                      <tr key={i} style={{ background: isEven ? '#f8fafc' : 'white', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#94a3b8', fontWeight: 600 }}>
                          {String(act.numero).padStart(2, '0')}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>{act.description}</div>
                          {act.commentaire_realisation && (
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#6366f1', 
                              marginTop: '4px', 
                              fontStyle: 'italic',
                              paddingLeft: '8px',
                              borderLeft: '2px solid #c7d2fe',
                              lineHeight: '1.4'
                            }}>
                              {act.commentaire_realisation}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: act.section.includes('reportée') ? '#fee2e2' : act.section.startsWith('Diligence') ? '#f5f3ff' : '#eff6ff',
                            color: act.section.includes('reportée') ? '#b91c1c' : act.section.startsWith('Diligence') ? '#7c3aed' : '#1d4ed8',
                            border: `1px solid ${act.section.includes('reportée') ? '#fca5a5' : act.section.startsWith('Diligence') ? '#ddd6fe' : '#bfdbfe'}`,
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}>
                            {act.section}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '11px',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="page-content" style={{ padding: '12mm', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Visa et signature</h2>
              <p className="text-sm text-slate-500">Page dédiée à la validation de la fiche.</p>
            </div>

            <div style={{ flex: 1 }}></div>

            <div style={{ marginTop: '40px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '24px' }}>
                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Visa du Responsable de Bureau</p>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>{bureau.responsable_nom || '____________________'}</p>
                </div>
                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Signature</p>
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>&nbsp;</p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8' }}>Cabinet de Géomètre-Expert CITRAT — CITRAT · Fiche de Suivi d'Activités — Semaine {numeroSemaine}/{annee}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}