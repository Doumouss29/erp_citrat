import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, Download, ArrowLeft } from 'lucide-react';
import { createBoardPageUrl as createPageUrl } from "@/lib/boardPageUrl";
import { useNavigate } from 'react-router-dom';
import { sanitizeRichHtml } from '@/lib/htmlUtils';

export default function RapportPDF() {
  const location = useLocation();
  const navigate = useNavigate();
  const [rapport, setRapport] = useState(null);
  const [bureau, setBureau] = useState(null);
  const [dossiers, setDossiers] = useState([]);
  const [projets, setProjets] = useState([]);
  const [activites, setActivites] = useState([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  // Récupérer l'ID du rapport depuis l'URL
  const params = new URLSearchParams(location.search);
  const rapportId = params.get('id');

  useEffect(() => {
    const loadData = async () => {
      if (!rapportId) return;

      try {
        const [rapportData, activitesData] = await Promise.all([
          base44.entities.RapportMensuel.get(rapportId),
          base44.entities.Activite.list()
        ]);

        setRapport(rapportData);
        setActivites(activitesData);

        if (rapportData.bureau_id) {
          const bureauData = await base44.entities.Bureau.get(rapportData.bureau_id);
          setBureau(bureauData);

          const dossiersData = await base44.entities.Dossier.filter({
            bureau_id: rapportData.bureau_id,
            mois: rapportData.mois,
            annee: rapportData.annee
          });
          setDossiers(dossiersData);

          const projetsData = await base44.entities.Projet.filter({
            bureau_id: rapportData.bureau_id
          });
          const projetsFiltres = projetsData.filter(projet => {
            const created = new Date(projet.created_date || projet.date_debut);
            return created.getMonth() + 1 === rapportData.mois && created.getFullYear() === rapportData.annee;
          });
          setProjets(projetsFiltres);
        }

        setLoading(false);
      } catch (error) {
        console.error('Erreur chargement rapport:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [rapportId]);

  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0);
  };

  const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  // Calculer la répartition par activité
  const dossiersParActivite = {};
  dossiers.forEach(d => {
    const activite = activites.find(a => a.id === d.activite_id);
    const libelle = activite?.libelle || d.activite_code;
    if (!dossiersParActivite[libelle]) {
      dossiersParActivite[libelle] = { count: 0, code: activite?.code };
    }
    dossiersParActivite[libelle].count += 1;
  });

  const clientsUniques = new Set(
    dossiers.map(d => `${d.client_nom || ''}-${d.client_prenom || ''}`).filter(value => value !== '-')
  ).size;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (!rapport || !bureau) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Rapport non trouvé</p>
          <Button onClick={() => navigate(createPageUrl('RapportMensuel'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        /* Contraindre les images dans le contenu riche */
        .rich-content img {
          max-width: 45%;
          max-height: 180px;
          width: auto;
          height: auto;
          display: inline-block;
          margin: 6px 8px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          object-fit: contain;
          vertical-align: top;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        /* Regrouper les images côte à côte */
        .rich-content p:has(img) {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: flex-start;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        /* Éviter les coupures au milieu des blocs */
        .rich-content p { margin: 0.4em 0; page-break-inside: avoid; break-inside: avoid; }
        .rich-content ul { list-style: disc; padding-left: 1.5rem; margin: 0.4em 0; page-break-inside: avoid; break-inside: avoid; }
        .rich-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.4em 0; page-break-inside: avoid; break-inside: avoid; }
        .rich-content li { margin: 0.2em 0; page-break-inside: avoid; break-inside: avoid; }
        .rich-content strong { font-weight: 700; }
        .rich-content em { font-style: italic; }
        .rich-content h1, .rich-content h2, .rich-content h3 { page-break-after: avoid; break-after: avoid; }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          header, footer, nav {
            display: none !important;
          }
          .print-page {
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            max-width: none !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          @page {
            margin: 0;
            size: A4;
          }
          .rich-content img {
            max-width: 45% !important;
            max-height: 180px !important;
            width: auto !important;
            height: auto !important;
            page-break-inside: avoid;
            break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .rich-content p:has(img) {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .rich-content p, .rich-content li, .rich-content ul, .rich-content ol {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .cover-box {
            background: rgba(255,255,255,0.1) !important;
            border: 1px solid rgba(255,255,255,0.2) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .cover-box h2, .cover-box p {
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Actions Bar - Cachée à l'impression */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-end gap-3">
          <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800">
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
        </div>
      </div>

      {/* Contenu du rapport */}
      <div className="max-w-5xl mx-auto p-8 print:p-0 print:max-w-none">
        <div ref={printRef} className="bg-white shadow-lg print:shadow-none">
          {/* PAGE 1: PAGE DE GARDE */}
          <div className="page-break" style={{ minHeight: '297mm', display: 'flex', flexDirection: 'column' }}>
            <div className="flex-1 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white flex flex-col items-center px-12" style={{ paddingTop: '80px' }}>
              <div className="mb-16">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696fe5195586fd61f32bcb08/47c566a2e_images.png" 
                  alt="CITRAT Logo" 
                  className="h-24 mx-auto"
                />
              </div>
              <h1 className="text-5xl font-bold mb-6 text-center">CITRAT</h1>
              <p className="text-2xl mb-4 text-blue-100">Cabinet de Géomètre-Expert CITRAT</p>
              <div className="w-24 h-1 bg-white/30 mb-16"></div>
              
              <div className="cover-box px-12 py-8 rounded-2xl mb-16 mx-auto" style={{ maxWidth: '500px', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <h2 className="text-3xl font-bold mb-2 text-center" style={{ color: 'white' }}>Rapport Mensuel</h2>
                <p className="text-2xl text-center" style={{ color: '#bfdbfe' }}>{moisNoms[rapport.mois - 1]} {rapport.annee}</p>
              </div>

              <div className="text-center space-y-3">
                <p className="text-2xl font-bold text-white uppercase tracking-wide mb-4">{bureau.nom}</p>
                <div>
                  <p className="text-sm text-blue-200 mb-1">Responsable de Bureau</p>
                  <p className="text-xl font-semibold text-white">{bureau.responsable_nom || 'Non renseigné'}</p>
                </div>
              </div>

              {/* Signature en pied de page de garde */}
              <div className="mt-auto pt-12 pb-8 text-center w-full">
                <div className="border-t border-white/20 pt-6">
                  <p className="text-white font-medium mb-1">
                    Rapport généré le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-blue-200 text-sm">Cabinet de Géomètre-Expert CITRAT - CITRAT</p>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 2: RESPONSABLE & STATISTIQUES */}
          <div className="page-break p-12" style={{ minHeight: '297mm' }}>
            {/* En-tête de page */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-blue-900 mb-2">Rapport Mensuel</h1>
            </div>

            {/* Statistiques */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-blue-600 rounded"></div>
                STATISTIQUES DU BUREAU
              </h2>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-100 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-600 mb-1">Total dossiers</div>
                  <div className="text-3xl font-bold text-slate-900">{rapport.total_dossiers}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                  <div className="text-sm text-green-700 mb-1">Réalisés</div>
                  <div className="text-3xl font-bold text-green-900">{rapport.dossiers_realises}</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center border border-amber-200">
                  <div className="text-sm text-amber-700 mb-1">En cours</div>
                  <div className="text-3xl font-bold text-amber-900">{rapport.dossiers_en_cours}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
                  <div className="text-sm text-purple-700 mb-1">Taux réalisation</div>
                  <div className="text-3xl font-bold text-purple-900">{rapport.taux_realisation}%</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center border border-indigo-200">
                  <div className="text-sm text-indigo-700 mb-1">Projets</div>
                  <div className="text-3xl font-bold text-indigo-900">{projets.length}</div>
                </div>
                <div className="bg-rose-50 rounded-lg p-4 text-center border border-rose-200">
                  <div className="text-sm text-rose-700 mb-1">Clients</div>
                  <div className="text-3xl font-bold text-rose-900">{clientsUniques}</div>
                </div>
              </div>

              {/* Répartition par activité */}
              <div className="bg-blue-50 rounded-lg p-5 border-2 border-blue-200">
                <h3 className="font-bold text-blue-900 mb-4 text-lg">Par activité</h3>
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(dossiersParActivite).map(([libelle, data]) => (
                    <div key={libelle} className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        <span className="font-medium text-slate-700">{data.code}: {libelle}</span>
                      </div>
                      <span className="font-bold text-blue-900 text-lg">{data.count} dossier(s)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 3: PROBLÈMES / DOSSIERS DIFFICILES */}
          {rapport.problemes_dossiers && (
            <div className="page-break p-12 flex flex-col" style={{ minHeight: '297mm' }}>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-red-900 mb-2">Dossiers difficiles ou problématiques</h1>
              </div>

              <div className="flex-1 bg-red-50 border-l-4 border-red-500 rounded-lg p-8">
                <div className="rich-content bg-white rounded-lg p-8 border border-red-100 overflow-hidden text-slate-800 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(rapport.problemes_dossiers) }}
                />
              </div>

            </div>
          )}

          {/* PAGE 4: DIFFICULTÉS RENCONTRÉES */}
          {rapport.difficultes_rencontrees && (
            <div className="page-break p-12 flex flex-col" style={{ minHeight: '297mm' }}>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-amber-900 mb-2">Difficultés rencontrées</h1>
              </div>

              <div className="flex-1 bg-amber-50 border-l-4 border-amber-500 rounded-lg p-8">
                <div className="rich-content bg-white rounded-lg p-8 border border-amber-100 overflow-hidden text-slate-800 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(rapport.difficultes_rencontrees) }}
                />
              </div>

            </div>
          )}

          {/* PAGE 5: PERSPECTIVES / ACTIONS À VENIR */}
          {rapport.perspectives_actions && (
            <div className="p-12 flex flex-col" style={{ minHeight: '297mm' }}>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-green-900 mb-2">Perspectives / Actions à venir</h1>
              </div>

              <div className="flex-1 bg-green-50 border-l-4 border-green-500 rounded-lg p-8">
                <div className="rich-content bg-white rounded-lg p-8 border border-green-100 overflow-hidden text-slate-800 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(rapport.perspectives_actions) }}
                />
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}