import { FormSelect } from "@/components/ui/form-select";
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, MapPin, Calendar, Pencil, Trash2, ArrowRight, LayoutGrid, TrendingUp, CheckCircle2, AlertCircle, Building2, Maximize, Users } from "lucide-react";
import PageHeader from "@/components/board/layout/PageHeader";
import LotissementFormDialog from "@/components/board/lotissements/LotissementFormDialog";
import { createBoardPageUrl } from "@/lib/boardPageUrl";
import { LOTISSEMENT_TOTAL, computeProgress, formatDateFR, isLate, displayStatut, statutBadgeClass, statusColor } from "@/lib/lotissementPhases";
import { toast } from "sonner";

const STATUT_FILTERS = ["Tous", "En cours", "Terminé", "Suspendu"];
const BUREAUX = ["ABIDJAN", "DALOA", "YAMOUSSOUKRO", "BOUAFLE", "SINFRA", "ISSIA"];

// Couleur dédiée à chaque bureau (bande supérieure des cartes)
const BUREAU_COLORS = {
  ABIDJAN: "#2563eb",       // bleu
  DALOA: "#16a34a",         // vert
  YAMOUSSOUKRO: "#ea580c",  // orange
  BOUAFLE: "#9333ea",       // violet
  SINFRA: "#0891b2",        // cyan
  ISSIA: "#db2777",         // rose
};
const bureauColor = (lot) => BUREAU_COLORS[(lot?.bureau || "").toUpperCase()] || "#64748b";

// Renvoie le nom du partenaire : priorité au champ dédié, sinon extraction depuis les notes
const extractPartenaire = (lot) => {
  if (lot?.partenaire) return lot.partenaire.trim();
  if (!lot?.notes) return null;
  const match = lot.notes.match(/en\s+partenariat\s+avec\s+([^\n,]+)/i);
  return match ? match[1].trim() : null;
};

export default function LotissementsList() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editLot, setEditLot] = useState(null);
  const [deleteLot, setDeleteLot] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [filterLocalite, setFilterLocalite] = useState("Toutes");
  const [filterBureau, setFilterBureau] = useState("Tous");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: lotissements = [], isLoading: isLoadingLots } = useQuery({
    queryKey: ["lotissements"],
    queryFn: () => base44.entities.Lotissement.list("-created_date"),
  });

  const { data: suivi = [], isLoading: isLoadingSuivi } = useQuery({
    queryKey: ["lotissement-suivi-all"],
    queryFn: () => base44.entities.LotissementSuivi.list(),
  });

  const isAdmin = user?.role === "admin" || user?.fonction === "admin";
  // Tout utilisateur connecté (hors lecture seule) peut ajouter un lotissement ; il peut modifier ceux qu'il a créés
  const canCreate = !!user && user.role !== "viewer";
  const canEdit = (lot) => isAdmin || (!!user && lot?.created_by_id === user.id);

  // Map suivi par lotissement puis par élément
  const suiviByLot = useMemo(() => {
    const map = {};
    (suivi || []).forEach((s) => {
      if (!map[s.lotissement_id]) map[s.lotissement_id] = {};
      map[s.lotissement_id][s.element_id] = s;
    });
    return map;
  }, [suivi]);

  // Lotissements avec progression calculée
  // NB : les lotissements E-GUIDE possèdent un champ "commune" renseigné ;
  // on les exclut ici pour n'afficher que les lotissements du BOARD.
  const withComputed = useMemo(() => {
    return (lotissements || [])
      .filter((lot) => !lot.commune)
      .map((lot) => {
        const { done, pct } = computeProgress(suiviByLot[lot.id] || {});
        return { ...lot, progressDone: done, progressPct: pct, isLate: isLate(lot) };
      });
  }, [lotissements, suiviByLot]);

  const localites = useMemo(() => {
    const set = new Set((lotissements || []).map((l) => l.localite).filter(Boolean));
    return Array.from(set).sort();
  }, [lotissements]);

  const filtered = useMemo(() => {
    return withComputed.filter((lot) => {
      if (filterStatut !== "Tous" && lot.statut !== filterStatut) return false;
      if (filterLocalite !== "Toutes" && lot.localite !== filterLocalite) return false;
      if (filterBureau !== "Tous" && (lot.bureau || "").toUpperCase() !== filterBureau) return false;
      if (search && lot.nom.toLowerCase().indexOf(search.toLowerCase()) === -1) return false;
      return true;
    });
  }, [withComputed, filterStatut, filterLocalite, filterBureau, search]);

  const stats = useMemo(() => {
    const enCours = withComputed.filter((l) => l.statut === "En cours").length;
    const termines = withComputed.filter((l) => l.statut === "Terminé").length;
    const enRetard = withComputed.filter((l) => l.isLate).length;
    const avgPct = withComputed.length ? Math.round(withComputed.reduce((a, l) => a + l.progressPct, 0) / withComputed.length) : 0;
    return { enCours, termines, enRetard, avgPct };
  }, [withComputed]);

  const handleDelete = async () => {
    if (!deleteLot) return;
    try {
      // Supprimer le suivi associé puis le lotissement
      const lotSuivi = (suivi || []).filter((s) => s.lotissement_id === deleteLot.id);
      if (lotSuivi.length) {
        await base44.entities.LotissementSuivi.deleteMany({ lotissement_id: deleteLot.id });
      }
      await base44.entities.Lotissement.delete(deleteLot.id);
      toast.success("Lotissement supprimé");
      queryClient.invalidateQueries({ queryKey: ["lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["lotissement-suivi-all"] });
      setDeleteLot(null);
    } catch (err) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["lotissements"] });
    setEditLot(null);
  };

  if (!user || isLoadingLots || isLoadingSuivi) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  const statCards = [
    { label: "Projets en cours", value: stats.enCours, icon: LayoutGrid, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Avancement moyen", value: stats.avgPct + "%", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Projets terminés", value: stats.termines, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "En retard", value: stats.enRetard, icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Suivi des lotissements"
          action={canCreate ? {
            icon: Plus,
            label: "Nouveau lotissement",
            tooltip: "Créer un nouveau projet",
            onClick: () => { setEditLot(null); setShowForm(true); },
          } : null}
        />

        {/* Stats */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-4 mb-6">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg} ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </span>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-none">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4 mb-6 flex flex-col gap-2.5 sm:flex-wrap sm:flex-row sm:items-center sm:gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par nom"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            {STATUT_FILTERS.map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatut(st)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                  filterStatut === st
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
            <FormSelect
              value={filterLocalite}
              onChange={(e) => setFilterLocalite(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 w-full sm:w-auto sm:max-w-[180px]"
            >
              <option value="Toutes">Toutes les communes</option>
              {localites.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </FormSelect>
            <FormSelect
              value={filterBureau}
              onChange={(e) => setFilterBureau(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 w-full sm:w-auto sm:max-w-[160px]"
            >
              <option value="Tous">Tous les bureaux</option>
              {BUREAUX.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </FormSelect>
          </div>
        </div>

        {/* Grille des lotissements */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
            {lotissements.length === 0 ? "Aucun lotissement pour l'instant." : "Aucun lotissement ne correspond à ces filtres."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((lot) => (
              <div
                key={lot.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="h-1.5" style={{ background: bureauColor(lot) }} />
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight leading-tight">{lot.nom}</h3>
                    <Badge variant="outline" className={`flex-shrink-0 ${statutBadgeClass(lot)}`}>
                      {displayStatut(lot)}
                    </Badge>
                  </div>
                  {(() => {
                    const partenaire = extractPartenaire(lot);
                    if (!partenaire) return null;
                    return (
                      <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-700">
                        <Users className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate max-w-[220px]">Partenariat avec {partenaire}</span>
                      </div>
                    );
                  })()}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {lot.bureau && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {(lot.bureau || "").toUpperCase()}
                      </span>
                    )}
                    {lot.localite && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {lot.localite}
                      </span>
                    )}
                    {lot.superficie_ha != null && (
                      <span className="flex items-center gap-1.5">
                        <Maximize className="w-3.5 h-3.5" />
                        {lot.superficie_ha} ha
                      </span>
                    )}
                    {lot.annee && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Année {lot.annee}
                      </span>
                    )}
                  </div>
                  {lot.avancement && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{lot.avancement}</p>
                  )}
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>{lot.progressDone} / {LOTISSEMENT_TOTAL} pièces</span>
                      <span className="font-semibold text-slate-700">{lot.progressPct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: lot.progressPct + "%", background: statusColor(lot) }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <Link to={createBoardPageUrl("LotissementDetail") + `?id=${lot.id}`} className="flex-1">
                      <Button variant="default" className="w-full bg-slate-900 hover:bg-slate-800">
                        Voir le détail
                      </Button>
                    </Link>
                    {canEdit(lot) && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => { setEditLot(lot); setShowForm(true); }}
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteLot(lot)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <LotissementFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        lotissement={editLot}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!deleteLot} onOpenChange={(o) => !o && setDeleteLot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce lotissement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer le projet <strong>{deleteLot?.nom}</strong> et tout son suivi. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}