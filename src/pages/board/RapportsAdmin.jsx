import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Calendar, 
  Building2,
  FileText,
  TrendingUp,
  FolderOpen,
  CheckCircle2,
  Clock,
  Wallet,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from "sonner";

export default function RapportsAdmin() {
  const [selectedMois, setSelectedMois] = useState(new Date().getMonth() + 1);
  const [selectedAnnee, setSelectedAnnee] = useState(new Date().getFullYear());
  const [downloadingId, setDownloadingId] = useState(null);

  const { data: bureaux } = useQuery({
    queryKey: ['bureaux'],
    queryFn: () => base44.entities.Bureau.list()
  });

  const { data: rapports, refetch } = useQuery({
    queryKey: ['rapports-admin', selectedMois, selectedAnnee],
    queryFn: async () => {
      return base44.entities.RapportMensuel.filter({
        mois: selectedMois,
        annee: selectedAnnee
      });
    }
  });

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

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0);
  };

  const handleDownloadPDF = async (rapport) => {
    setDownloadingId(rapport.id);
    try {
      const response = await base44.functions.invoke('generateRapportPDF', {
        rapportId: rapport.id
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const bureau = bureaux?.find(b => b.id === rapport.bureau_id);
      a.download = `Rapport_${bureau?.code}_${moisOptions.find(m => m.value === selectedMois)?.label}_${selectedAnnee}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success("Rapport téléchargé");
    } catch (error) {
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  // Stats globales
  const statsGlobales = rapports?.reduce((acc, r) => ({
    total_dossiers: acc.total_dossiers + (r.total_dossiers || 0),
    dossiers_realises: acc.dossiers_realises + (r.dossiers_realises || 0),
    dossiers_en_cours: acc.dossiers_en_cours + (r.dossiers_en_cours || 0),
    portefeuille: acc.portefeuille + (r.portefeuille || 0),
    chiffre_realise: acc.chiffre_realise + (r.chiffre_realise || 0)
  }), { total_dossiers: 0, dossiers_realises: 0, dossiers_en_cours: 0, portefeuille: 0, chiffre_realise: 0 }) || {};

  const tauxRealisationGlobal = statsGlobales.total_dossiers > 0 
    ? ((statsGlobales.dossiers_realises / statsGlobales.total_dossiers) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Rapports Mensuels - Vue Admin</h1>
            <p className="text-slate-500">Consultez et téléchargez les rapports de tous les bureaux</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-6 bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200 shadow-sm">
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

        {/* Stats globales */}
        {rapports && rapports.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <FolderOpen className="w-3 h-3" />
                  Total dossiers
                </div>
                <p className="text-2xl font-bold">{statsGlobales.total_dossiers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-emerald-500 text-xs mb-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Réalisés
                </div>
                <p className="text-2xl font-bold text-emerald-600">{statsGlobales.dossiers_realises}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-amber-500 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  En cours
                </div>
                <p className="text-2xl font-bold text-amber-600">{statsGlobales.dossiers_en_cours}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-purple-500 text-xs mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Taux global
                </div>
                <p className="text-2xl font-bold text-purple-600">{tauxRealisationGlobal}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-rose-500 text-xs mb-1">
                  <Wallet className="w-3 h-3" />
                  Portefeuille
                </div>
                <p className="text-lg font-bold text-rose-600">{formatMoney(statsGlobales.portefeuille)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-teal-500 text-xs mb-1">
                  <Wallet className="w-3 h-3" />
                  CA Total
                </div>
                <p className="text-lg font-bold text-teal-600">{formatMoney(statsGlobales.chiffre_realise)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Liste des rapports par bureau */}
        {rapports && rapports.length > 0 ? (
          <div className="space-y-6">
            {rapports.map(rapport => {
              const bureau = bureaux?.find(b => b.id === rapport.bureau_id);
              return (
                <Card key={rapport.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-3">
                          <Building2 className="w-5 h-5" />
                          {bureau?.nom || rapport.bureau_code}
                        </CardTitle>
                        <p className="text-blue-100 text-sm mt-1">
                          {moisOptions.find(m => m.value === rapport.mois)?.label} {rapport.annee}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDownloadPDF(rapport)}
                        disabled={downloadingId === rapport.id}
                        className="bg-white/20 hover:bg-white/30 border-white/30"
                      >
                        {downloadingId === rapport.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Télécharger PDF
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Statistiques du bureau */}
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="text-xs text-slate-500 mb-1">Total</div>
                        <div className="text-2xl font-bold text-blue-700">{rapport.total_dossiers}</div>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <div className="text-xs text-slate-500 mb-1">Réalisés</div>
                        <div className="text-2xl font-bold text-emerald-700">{rapport.dossiers_realises}</div>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="text-xs text-slate-500 mb-1">En cours</div>
                        <div className="text-2xl font-bold text-amber-700">{rapport.dossiers_en_cours}</div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="text-xs text-slate-500 mb-1">Taux</div>
                        <div className="text-2xl font-bold text-purple-700">{rapport.taux_realisation}%</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                        <div className="text-xs text-slate-500 mb-1">Portefeuille</div>
                        <div className="text-xl font-bold text-rose-700">{formatMoney(rapport.portefeuille)} XOF</div>
                      </div>
                      <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                        <div className="text-xs text-slate-500 mb-1">Chiffre d'affaires réalisé</div>
                        <div className="text-xl font-bold text-teal-700">{formatMoney(rapport.chiffre_realise)} XOF</div>
                      </div>
                    </div>

                    {/* Commentaires */}
                    {rapport.problemes_dossiers && (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Problèmes / Dossiers difficiles
                        </h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{rapport.problemes_dossiers}</p>
                      </div>
                    )}

                    {rapport.difficultes_rencontrees && (
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <h4 className="font-semibold text-amber-900 mb-2">Difficultés rencontrées</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{rapport.difficultes_rencontrees}</p>
                      </div>
                    )}

                    {rapport.perspectives_actions && (
                      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <h4 className="font-semibold text-emerald-900 mb-2">Perspectives / Actions à venir</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{rapport.perspectives_actions}</p>
                      </div>
                    )}

                    {/* Info génération */}
                    <div className="text-xs text-slate-500 flex items-center gap-4 pt-2 border-t">
                      <span>Généré par: {rapport.genere_par_email}</span>
                      <span>•</span>
                      <span>Délai moyen: {rapport.delai_moyen_jours} jours</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Aucun rapport disponible pour cette période</p>
          </div>
        )}
      </div>
    </div>
  );
}