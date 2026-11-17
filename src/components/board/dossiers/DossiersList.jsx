import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Eye, Edit, Trash2, ArrowUpDown, AlertTriangle, FolderOpen, Clock, CheckCircle2, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from "@/lib/utils";

export default function DossiersList({ 
  dossiers, 
  activites, 
  statuts, 
  bureaux,
  onEdit, 
  onDelete, 
  onView,
  loading,
  userRole
}) {
  const [search, setSearch] = useState('');
  const [filterActivite, setFilterActivite] = useState('all');
  const [kpiFilter, setKpiFilter] = useState('all');
  const [sortField, setSortField] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');

  const getPrioriteColor = (priorite) => {
    switch (priorite) {
      case 'express': return 'bg-red-100 text-red-700';
      case 'haute': return 'bg-orange-100 text-orange-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const isRetard = (dossier) => {
    if (!dossier.date_echeance) return false;
    const statut = statuts?.find(s => s.id === dossier.statut_id);
    if (statut?.est_final) return false;
    return new Date(dossier.date_echeance) < new Date();
  };

  const isTermine = (dossier) => !!statuts?.find(s => s.id === dossier.statut_id)?.est_final;
  const isUrgent = (dossier) => dossier.priorite === 'express' || dossier.priorite === 'haute';
  const KPI_TESTS = {
    all: () => true,
    en_cours: (d) => !isTermine(d),
    retard: (d) => isRetard(d),
    termine: (d) => isTermine(d),
    urgent: (d) => isUrgent(d) && !isTermine(d),
  };

  // Les KPI tiennent compte de la recherche et de l'activité choisie
  const baseDossiers = (dossiers || []).filter(d => {
    if (search && !d.reference_auto?.toLowerCase().includes(search.toLowerCase()) &&
        !d.client_nom?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterActivite !== 'all' && d.activite_id !== filterActivite) return false;
    return true;
  });

  const kpis = [
    { key: 'all', label: 'Total dossiers', icon: FolderOpen, color: 'text-slate-900', ring: 'ring-slate-900', iconBg: 'bg-slate-100 text-slate-700' },
    { key: 'en_cours', label: 'En cours', icon: Clock, color: 'text-blue-700', ring: 'ring-blue-600', iconBg: 'bg-blue-50 text-blue-600' },
    { key: 'retard', label: 'En retard', icon: AlertTriangle, color: 'text-red-700', ring: 'ring-red-600', iconBg: 'bg-red-50 text-red-600' },
    { key: 'urgent', label: 'Urgents (haute / express)', icon: Zap, color: 'text-orange-700', ring: 'ring-orange-500', iconBg: 'bg-orange-50 text-orange-600' },
    { key: 'termine', label: 'Terminés', icon: CheckCircle2, color: 'text-emerald-700', ring: 'ring-emerald-600', iconBg: 'bg-emerald-50 text-emerald-600' },
  ].map(k => ({ ...k, count: baseDossiers.filter(KPI_TESTS[k.key]).length }));

  const filteredDossiers = baseDossiers
    .filter(KPI_TESTS[kpiFilter] || KPI_TESTS.all)
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const order = sortOrder === 'asc' ? 1 : -1;
      if (aVal < bVal) return -1 * order;
      if (aVal > bVal) return 1 * order;
      return 0;
    });

  const dossiersParBureau = [{ bureau: null, dossiers: filteredDossiers }];

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI des dossiers (cliquables pour filtrer la liste) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map(k => {
          const Icon = k.icon;
          const active = kpiFilter === k.key;
          return (
            <button
              key={k.key}
              type="button"
              onClick={() => setKpiFilter(active && k.key !== 'all' ? 'all' : k.key)}
              className={cn(
                "rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow",
                active && `ring-2 ${k.ring} border-transparent`
              )}
              title={active && k.key !== 'all' ? 'Cliquer pour tout afficher' : `Afficher : ${k.label}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", k.iconBg)}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className={cn("mt-2 text-2xl font-bold tabular-nums", k.color)}>{k.count}</p>
            </button>
          );
        })}
      </div>

      {/* Recherche + activité */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher par référence ou client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white border-slate-300 focus:border-blue-500 transition-colors h-10"
          />
        </div>
        <Select value={filterActivite} onValueChange={setFilterActivite}>
          <SelectTrigger className="bg-white border-slate-300 h-10 sm:w-[320px]">
            <SelectValue placeholder="Activité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les activités</SelectItem>
            {activites?.filter(a => a.actif).map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.libelle ? <>{a.libelle} <span className="text-slate-400">({a.code})</span></> : a.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vue mobile : cartes (petit écran) */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Chargement...</div>
        ) : filteredDossiers.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Aucun dossier trouvé</div>
        ) : filteredDossiers.map((dossier) => {
          const statut = statuts?.find(s => s.id === dossier.statut_id);
          const activite = activites?.find(a => a.id === dossier.activite_id);
          const retard = isRetard(dossier);
          return (
            <div key={dossier.id} className={cn("bg-white rounded-xl border p-4 space-y-2", retard ? "border-red-200 bg-red-50" : "border-slate-200")}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-bold text-base text-slate-900">{dossier.client_nom} {dossier.client_prenom}</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    {retard && <AlertTriangle className="w-3 h-3 text-red-500" />}
                    {dossier.reference_auto}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView?.(dossier)}><Eye className="w-4 h-4 mr-2" /> Voir</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(dossier)}><Edit className="w-4 h-4 mr-2" /> Modifier</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete?.(dossier)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" /> Supprimer</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-xs">{(activite?.libelle || dossier.activite_code)?.toUpperCase()}</Badge>
                <Badge className="text-xs" style={{ backgroundColor: statut?.couleur + '20', color: statut?.couleur, borderColor: statut?.couleur }}>
                  {statut?.libelle || dossier.statut_libelle}
                </Badge>
                <Badge className={cn("text-xs", getPrioriteColor(dossier.priorite))}>
                  {dossier.priorite?.charAt(0).toUpperCase() + dossier.priorite?.slice(1)}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vue tablette/desktop : tableau */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="cursor-pointer" onClick={() => handleSort('reference_auto')}>
                  <div className="flex items-center gap-1">Référence<ArrowUpDown className="w-3 h-3" /></div>
                </TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Activité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Chargement...</TableCell></TableRow>
              ) : filteredDossiers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Aucun dossier trouvé</TableCell></TableRow>
              ) : filteredDossiers.map((dossier) => {
                const statut = statuts?.find(s => s.id === dossier.statut_id);
                const activite = activites?.find(a => a.id === dossier.activite_id);
                const retard = isRetard(dossier);
                return (
                  <TableRow key={dossier.id} className={cn("hover:bg-slate-50", retard && "bg-red-50 hover:bg-red-100")}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {retard && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        {dossier.reference_auto}
                      </div>
                    </TableCell>
                    <TableCell>{dossier.client_nom}{dossier.client_prenom && ` ${dossier.client_prenom}`}</TableCell>
                    <TableCell><Badge variant="outline">{(activite?.libelle || dossier.activite_code)?.toUpperCase()}</Badge></TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: statut?.couleur + '20', color: statut?.couleur, borderColor: statut?.couleur }}>
                        {statut?.libelle || dossier.statut_libelle}
                      </Badge>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-1">
                         <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50" onClick={() => onView?.(dossier)}>
                           <Eye className="w-4 h-4" />
                         </Button>
                         <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50" onClick={() => onEdit?.(dossier)}>
                           <Edit className="w-4 h-4 mr-1" /> Modifier
                         </Button>
                         <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete?.(dossier)}>
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       </div>
                     </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="text-sm text-slate-500 text-right">
        {filteredDossiers.length} dossier(s) affiché(s)
      </div>
    </div>
  );
}