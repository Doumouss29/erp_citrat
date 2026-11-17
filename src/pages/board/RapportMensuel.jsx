import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/board/layout/PageHeader";
import {
  FileText,
  Download,
  Save,
  Calendar,
  Building2,
  TrendingUp,
  FolderOpen,
  CheckCircle2,
  Clock,
  Loader2,
  BarChart3,
  Users
} from 'lucide-react';
import { createBoardPageUrl as createPageUrl } from "@/lib/boardPageUrl";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import ChangePasswordModal from "@/components/board/auth/ChangePasswordModal";
import StatutDonut from "@/components/board/dashboard/StatutDonut";
import StatCard from "@/components/board/dashboard/StatCard";

const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];

const QUILL_MODULES = {
  toolbar: {
    container: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ 'header': [1, 2, 3, false] }],
      ['link', 'image'],
      ['clean']
    ]
  }
};

export default function RapportMensuel() {
  const [user, setUser] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [selectedMois, setSelectedMois] = useState(new Date().getMonth() + 1);
  const [selectedAnnee, setSelectedAnnee] = useState(new Date().getFullYear());
  const [selectedBureau, setSelectedBureau] = useState('');
  const [problemesDossiers, setProblemesDossiers] = useState('');
  const [difficultesRencontrees, setDifficultesRencontrees] = useState('');
  const [perspectivesActions, setPerspectivesActions] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();
  const quillProblemes = useRef(null);
  const quillDifficultes = useRef(null);
  const quillPerspectives = useRef(null);

  const makeImageHandler = useCallback((quillRef) => () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const quill = quillRef.current?.getEditor();
      if (quill) {
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', file_url);
        quill.setSelection(range.index + 1);
      }
    };
    input.click();
  }, []);

  const TOOLBAR_CONTAINER = [
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    [{ header: [1, 2, 3, false] }],
    ['link', 'image'],
    ['clean']
  ];

  const modulesProblemes = useMemo(() => ({
    toolbar: { container: TOOLBAR_CONTAINER, handlers: { image: makeImageHandler(quillProblemes) } }
  }), [makeImageHandler]);

  const modulesDifficultes = useMemo(() => ({
    toolbar: { container: TOOLBAR_CONTAINER, handlers: { image: makeImageHandler(quillDifficultes) } }
  }), [makeImageHandler]);

  const modulesPerspectives = useMemo(() => ({
    toolbar: { container: TOOLBAR_CONTAINER, handlers: { image: makeImageHandler(quillPerspectives) } }
  }), [makeImageHandler]);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser?.must_change_password) {
        setShowChangePassword(true);
      }
    };
    loadUser();
  }, []);

  const { data: bureaux } = useQuery({
    queryKey: ['bureaux'],
    queryFn: () => base44.entities.Bureau.list()
  });

  // Sélectionner le bureau automatiquement quand user + bureaux sont chargés
  useEffect(() => {
    if (!user || user.role === 'admin' || user.fonction === 'admin' || selectedBureau) return;
    if (user.bureau_id) {
      setSelectedBureau(user.bureau_id);
    } else if (bureaux) {
      // Fallback: trouver le bureau par email du responsable
      const bureau = bureaux.find(b => b.responsable_email === user.email);
      if (bureau) setSelectedBureau(bureau.id);
    }
  }, [user, bureaux]);

  const { data: activites } = useQuery({
    queryKey: ['activites'],
    queryFn: () => base44.entities.Activite.list()
  });

  const { data: statuts } = useQuery({
    queryKey: ['statuts'],
    queryFn: () => base44.entities.Statut.list()
  });

  const { data: allDossiersBureau } = useQuery({
    queryKey: ['dossiers-rapport-all', selectedBureau],
    queryFn: async () => {
      if (selectedBureau) {
        return base44.entities.Dossier.filter({ bureau_id: selectedBureau });
      }
      return base44.entities.Dossier.list();
    },
    enabled: !!selectedBureau || user?.role === 'admin' || user?.fonction === 'admin'
  });

  // Filtrage côté client par mois/année de création
  const dossiers = allDossiersBureau?.filter(d => {
    const created = new Date(d.created_date);
    // Utiliser annee/mois si renseignés, sinon se baser sur created_date
    const annee = d.annee || created.getFullYear();
    const mois = d.mois || (created.getMonth() + 1);
    return annee === selectedAnnee && mois === selectedMois;
  });

  const { data: allProjetsBureau } = useQuery({
    queryKey: ['projets-rapport-all', selectedBureau],
    queryFn: async () => {
      if (selectedBureau) {
        return base44.entities.Projet.filter({ bureau_id: selectedBureau });
      }
      return base44.entities.Projet.list();
    },
    enabled: !!selectedBureau || user?.role === 'admin' || user?.fonction === 'admin'
  });

  const projets = allProjetsBureau?.filter(projet => {
    const created = new Date(projet.created_date || projet.date_debut);
    const annee = created.getFullYear();
    const mois = created.getMonth() + 1;
    return annee === selectedAnnee && mois === selectedMois;
  }) || [];

  const { data: existingRapport, refetch: refetchRapport } = useQuery({
    queryKey: ['rapport', selectedBureau, selectedMois, selectedAnnee],
    queryFn: async () => {
      const rapports = await base44.entities.RapportMensuel.filter({
        bureau_id: selectedBureau,
        mois: selectedMois,
        annee: selectedAnnee
      });
      return rapports[0] || null;
    },
    enabled: !!selectedBureau
  });

  useEffect(() => {
    if (existingRapport) {
      setProblemesDossiers(existingRapport.problemes_dossiers || '');
      setDifficultesRencontrees(existingRapport.difficultes_rencontrees || '');
      setPerspectivesActions(existingRapport.perspectives_actions || '');
    } else {
      setProblemesDossiers('');
      setDifficultesRencontrees('');
      setPerspectivesActions('');
    }
  }, [existingRapport]);

  const isAdmin = user?.role === 'admin' || user?.fonction === 'admin';
  const currentBureau = bureaux?.find(b => b.id === selectedBureau);

  // Calcul des KPIs
  const statutFinal = statuts?.find(s => s.est_final);
  const dossiersFinals = dossiers?.filter(d => d.statut_id === statutFinal?.id) || [];
  const dossiersEnCours = dossiers?.filter(d => d.statut_id !== statutFinal?.id) || [];

  const portefeuille = dossiersEnCours.reduce((sum, d) => sum + (d.cout_estime || 0), 0);
  const chiffreRealise = dossiersFinals.reduce((sum, d) => sum + (d.cout_reel || d.cout_estime || 0), 0);
  const tauxRealisation = dossiers?.length ? ((dossiersFinals.length / dossiers.length) * 100).toFixed(1) : 0;
  const clientsUniques = new Set(
    (dossiers || []).map(d => `${d.client_nom || ''}-${d.client_prenom || ''}`).filter(value => value !== '-')
  ).size;

  // Délai moyen
  const delaisMoyens = dossiersFinals
    .filter(d => d.date_livraison && d.created_date)
    .map(d => Math.ceil((new Date(d.date_livraison) - new Date(d.created_date)) / (1000 * 60 * 60 * 24)));
  const delaiMoyen = delaisMoyens.length ? Math.round(delaisMoyens.reduce((a, b) => a + b, 0) / delaisMoyens.length) : 0;

  // Données graphiques
  const dossiersParActivite = activites?.filter(a => a.actif).map(activite => ({
    name: activite.libelle,
    code: activite.code,
    value: dossiers?.filter(d => d.activite_id === activite.id).length || 0
  })).filter(item => item.value > 0) || [];

  const dossiersParStatut = statuts?.filter(s => s.actif).map(statut => ({
    name: statut.libelle,
    value: dossiers?.filter(d => d.statut_id === statut.id).length || 0,
    color: statut.couleur
  })).filter(item => item.value > 0) || [];

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0);
  };

  const handleSave = async () => {
    if (!selectedBureau) return;
    
    setSaving(true);
    try {
      const data = {
        bureau_id: selectedBureau,
        bureau_code: currentBureau?.code,
        mois: selectedMois,
        annee: selectedAnnee,
        total_dossiers: dossiers?.length || 0,
        dossiers_realises: dossiersFinals.length,
        dossiers_en_cours: dossiersEnCours.length,
        portefeuille,
        chiffre_realise: chiffreRealise,
        taux_realisation: parseFloat(tauxRealisation),
        delai_moyen_jours: delaiMoyen,
        problemes_dossiers: problemesDossiers,
        difficultes_rencontrees: difficultesRencontrees,
        perspectives_actions: perspectivesActions,
        genere_par_email: user?.email
      };

      if (existingRapport) {
        await base44.entities.RapportMensuel.update(existingRapport.id, data);
      } else {
        await base44.entities.RapportMensuel.create(data);
      }

      toast.success("Rapport enregistré");
      refetchRapport();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChanged = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setShowChangePassword(false);
  };

  const handleGeneratePDF = () => {
    if (!existingRapport) {
      toast.error("Veuillez d'abord enregistrer le rapport");
      return;
    }

    // Ouvrir la page HTML du rapport dans un nouvel onglet
    const url = createPageUrl('RapportPDF') + '?id=' + existingRapport.id;
    window.open(url, '_blank');
  };

  const moisOptions = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <style>{`
        .ql-container {
          font-size: 16px;
        }
        .ql-editor {
          min-height: 200px;
          padding: 16px;
        }
        .ql-editor img {
          max-width: 45%;
          max-height: 180px;
          width: auto;
          height: auto;
          display: inline-block;
          margin: 6px 8px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          object-fit: contain;
          vertical-align: top;
        }
        .ql-editor p:has(img) {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: flex-start;
        }
        .ql-toolbar {
          padding: 12px 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .ql-toolbar.ql-snow .ql-formats {
          margin-right: 16px;
        }
        .ql-toolbar button {
          width: 36px;
          height: 36px;
        }
        .rich-content ul { list-style: disc; padding-left: 1.5rem; margin: 0.4em 0; }
        .rich-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.4em 0; }
        .rich-content li { margin: 0.2em 0; }
        .rich-content strong { font-weight: 700; }
        .rich-content em { font-style: italic; }
        .rich-content u { text-decoration: underline; }
        .rich-content s { text-decoration: line-through; }
        .rich-content h1 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0; }
        .rich-content h2 { font-size: 1.25em; font-weight: 700; margin: 0.5em 0; }
        .rich-content h3 { font-size: 1.1em; font-weight: 700; margin: 0.4em 0; }
        .rich-content p { margin: 0.3em 0; }
        .rich-content blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; color: #64748b; margin: 0.5em 0; }
        .rich-content img { max-width: 45%; max-height: 180px; width: auto; height: auto; display: inline-block; margin: 6px 8px; border-radius: 6px; border: 1px solid #e2e8f0; object-fit: contain; vertical-align: top; }
        .rich-content .ql-align-center { text-align: center; }
        .rich-content .ql-align-right { text-align: right; }
        .rich-content .ql-align-justify { text-align: justify; }
      `}</style>
      <ChangePasswordModal 
        open={showChangePassword} 
        onSuccess={handlePasswordChanged}
        user={user}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900">Rapport Mensuel</h1>
          <div className="flex items-center gap-2">
            {selectedBureau && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-emerald-600 text-white shadow hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="hidden sm:inline">{saving ? "Enregistrement..." : "Enregistrer"}</span>
              </button>
            )}
            <button
              onClick={handleGeneratePDF}
              className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-slate-900 text-white shadow hover:bg-slate-800 transition-colors ${!existingRapport ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Voir / Imprimer</span>
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-6 bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              Bureau
            </label>
            {isAdmin ? (
              <Select value={selectedBureau} onValueChange={setSelectedBureau}>
                <SelectTrigger className="w-full bg-white border-slate-300 hover:border-blue-500 transition-colors">
                  <SelectValue placeholder="Sélectionner un bureau" />
                </SelectTrigger>
                <SelectContent>
                  {bureaux?.filter(b => b.actif).sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })).map(bureau => (
                    <SelectItem key={bureau.id} value={bureau.id}>
                      {bureau.code} - {bureau.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={selectedBureau || ''} disabled>
                <SelectTrigger className="w-full bg-slate-50 border-slate-300">
                  <SelectValue placeholder={currentBureau ? `${currentBureau.code} - ${currentBureau.nom}` : 'Chargement...'}>
                    {currentBureau ? `${currentBureau.code} - ${currentBureau.nom}` : (selectedBureau ? 'Chargement...' : '')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {currentBureau && (
                    <SelectItem value={currentBureau.id}>
                      {currentBureau.code} - {currentBureau.nom}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Mois
            </label>
            <Select value={selectedMois.toString()} onValueChange={(v) => setSelectedMois(parseInt(v))}>
              <SelectTrigger className="w-full bg-white border-slate-300 hover:border-emerald-500 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {moisOptions.map(m => (
                  <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Année</label>
            <Select value={selectedAnnee.toString()} onValueChange={(v) => setSelectedAnnee(parseInt(v))}>
              <SelectTrigger className="w-full bg-white border-slate-300 hover:border-purple-500 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedBureau && (
          <>
            {/* Info bureau */}
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-5 h-5 text-slate-400" />
              <span className="font-medium">{currentBureau?.nom}</span>
              <Badge variant="outline">
                <Calendar className="w-3 h-3 mr-1" />
                {moisOptions.find(m => m.value === selectedMois)?.label} {selectedAnnee}
              </Badge>
              {existingRapport && (
                <Badge className="bg-emerald-100 text-emerald-700">Rapport existant</Badge>
              )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3 mb-6">
              <StatCard
                title="Total Dossiers"
                value={dossiers?.length || 0}
                icon={FolderOpen}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                borderColor="border-blue-500"
              />
              <StatCard
                title="Réalisés"
                value={dossiersFinals.length}
                icon={CheckCircle2}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                borderColor="border-emerald-500"
              />
              <StatCard
                title="En cours"
                value={dossiersEnCours.length}
                icon={Clock}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
                borderColor="border-amber-500"
              />
              <StatCard
                title="Taux réalisation"
                value={`${tauxRealisation}%`}
                icon={TrendingUp}
                iconBg="bg-purple-50"
                iconColor="text-purple-600"
                borderColor="border-purple-500"
              />

            </div>

            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Par activité</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dossiersParActivite} margin={{ top: 20, right: 5, left: -10, bottom: 5 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="code" tick={{ fill: '#64748B', fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={45} />
                        <YAxis tick={{ fill: '#64748B', fontSize: 12 }} domain={[0, Math.max(...dossiersParActivite.map(d => d.value), 1) + 1]} allowDecimals={false} width={30} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                          formatter={(value, name, props) => [value + ' dossiers', props.payload.name]}
                          labelFormatter={() => ''}
                        />
                        <Bar dataKey="value" name="Activités" fill="#3B82F6" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#1E293B', fontSize: 12, fontWeight: 600 }} />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Par statut</CardTitle>
                </CardHeader>
                <CardContent>
                  <StatutDonut data={dossiersParStatut} />
                </CardContent>
              </Card>
            </div>

            {/* Commentaires du responsable */}
            <div className="grid grid-cols-1 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  Dossiers difficiles ou problématiques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <ReactQuill ref={quillProblemes} value={problemesDossiers} onChange={setProblemesDossiers} modules={modulesProblemes} theme="snow" placeholder="Décrivez les dossiers problématiques..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  Difficultés rencontrées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <ReactQuill ref={quillDifficultes} value={difficultesRencontrees} onChange={setDifficultesRencontrees} modules={modulesDifficultes} theme="snow" placeholder="Listez les difficultés..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  Perspectives / Actions à venir
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <ReactQuill ref={quillPerspectives} value={perspectivesActions} onChange={setPerspectivesActions} modules={modulesPerspectives} theme="snow" placeholder="Décrivez les actions planifiées..." />
                </div>
              </CardContent>
            </Card>
            </div>


          </>
        )}

        {!selectedBureau && isAdmin && (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Sélectionnez un bureau pour générer le rapport</p>
          </div>
        )}
      </div>
    </div>
  );
}