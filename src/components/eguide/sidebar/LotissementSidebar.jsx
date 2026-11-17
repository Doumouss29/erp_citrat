import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SearchAddress from '@/components/eguide/map/SearchAddress';
import { 
  Search, Map, Layers, Filter, ChevronDown, ChevronRight,
  MapPin, Building, Grid3X3, Eye, EyeOff
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { formatLotSurface } from '@/utils/eguideFormatLotSurface';

const STATUT_COLORS = {
  'Lot en vente': 'bg-red-400',
  'Lot vendu': 'bg-emerald-400',
  'Lot réservé': 'bg-amber-400',
  'Lot non à vendre': 'bg-orange-400'
};

export default function LotissementSidebar({
  lotissements = [],
  ilots = [],
  lots = [],
  attributaires = [],
  selectedLotissement,
  selectedIlot,
  statusFilter = 'all',
  onStatusFilterChange,
  onLotissementChange,
  onIlotChange,
  showLots,
  onToggleLots,
  showIlots,
  onToggleIlots,
  onLotClick,
  onAddressSelect
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIlots, setExpandedIlots] = useState({});
  const [displayedIlotsCount, setDisplayedIlotsCount] = useState(50);
  const [openLotissement, setOpenLotissement] = useState(true);
  const [openFiltres, setOpenFiltres] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setOpenLotissement(false);
      setOpenFiltres(false);
    }
  }, []);

  const toggleIlot = (ilotId) => {
    setExpandedIlots(prev => ({
      ...prev,
      [ilotId]: !prev[ilotId]
    }));
  };

  const filteredLotissements = lotissements.filter(l => 
    l.nom?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredIlots = ilots
    .filter(i => i.id_lotissement === selectedLotissement?.id)
    .filter(ilot => {
      // Filtrer par recherche (numéro d'îlot ou lots)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const ilotMatch = ilot.numero_ilot?.toLowerCase().includes(searchLower);
        const lotsInIlot = lots.filter(lot => lot.id_ilot === ilot.id);
        const lotMatch = lotsInIlot.some(lot => 
          lot.numero_lot?.toLowerCase().includes(searchLower)
        );
        if (!ilotMatch && !lotMatch) return false;
      }
      
      // Si un filtre de statut est actif, ne montrer que les îlots qui ont des lots correspondants
      if (statusFilter !== 'all' && statusFilter !== 'non-attribue') {
        const lotsInIlot = lots.filter(lot => lot.id_ilot === ilot.id);
        return lotsInIlot.some(lot => lot.statut === statusFilter);
      }
      
      // Pour "non-attribue", vérifier qu'il y a des lots non attribués dans cet îlot
      if (statusFilter === 'non-attribue') {
        const lotsInIlot = lots.filter(lot => lot.id_ilot === ilot.id);
        return lotsInIlot.length > 0;
      }
      
      return true;
    })
    .sort((a, b) => {
      const numA = parseInt(a.numero_ilot) || 0;
      const numB = parseInt(b.numero_ilot) || 0;
      return numA - numB;
    });

  const getLotsForIlot = (ilotId) => {
    return lots
      .filter(lot => lot.id_ilot === ilotId)
      .filter(lot => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'non-attribue') return true; // Le filtre est déjà appliqué dans pages/Carte
        return lot.statut === statusFilter;
      })
      .filter(lot => {
        if (!searchTerm) return true;
        return lot.numero_lot?.toLowerCase().includes(searchTerm.toLowerCase());
      });
  };

  const getStatsForLotissement = (lotissementId) => {
    const lotsForLotissement = lots.filter(l => l.id_lotissement === lotissementId);
    return {
      total: lotsForLotissement.length,
      enVente: lotsForLotissement.filter(l => l.statut === 'Lot en vente').length,
      vendu: lotsForLotissement.filter(l => l.statut === 'Lot vendu').length,
      reserve: lotsForLotissement.filter(l => l.statut === 'Lot réservé').length,
      nonVendre: lotsForLotissement.filter(l => l.statut === 'Lot non à vendre').length
    };
  };

  return (
    <div className="w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-slate-100 space-y-2">
        {/* Address Search */}
        <div className="[&_input]:h-9 [&_input]:text-sm">
          <SearchAddress 
            onSelect={(location) => {
              if (onAddressSelect) {
                onAddressSelect(location);
              }
            }}
          />
        </div>

        {/* Lot/Ilot Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher un îlot ou lot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 text-sm pl-9 bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Lotissement Selector */}
      <div className="border-b border-slate-100">
        <button
          className="w-full flex items-center justify-between px-4 py-3"
          onClick={() => setOpenLotissement(!openLotissement)}
        >
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Lotissement</span>
          {openLotissement ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </button>
        {openLotissement && (
          <div className="px-4 pb-4">
            <Select 
              value={selectedLotissement?.id || ''} 
              onValueChange={(id) => {
                const lot = lotissements.find(l => l.id === id);
                onLotissementChange(lot);
              }}
            >
              <SelectTrigger className="bg-slate-50">
                <SelectValue placeholder="Sélectionner un lotissement" />
              </SelectTrigger>
              <SelectContent>
                {filteredLotissements.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-400" />
                      {l.nom}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedLotissement && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>Statistiques</span>
                  <span>{getStatsForLotissement(selectedLotissement.id).total} lots</span>
                </div>
                <div className="flex gap-1">
                  {Object.entries(STATUT_COLORS).map(([statut, color]) => {
                    const stats = getStatsForLotissement(selectedLotissement.id);
                    const count = statut === 'Lot en vente' ? stats.enVente :
                                 statut === 'Lot vendu' ? stats.vendu :
                                 statut === 'Lot réservé' ? stats.reserve : stats.nonVendre;
                    const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    return (
                      <div 
                        key={statut}
                        className={cn("h-2 rounded-full transition-all", color)}
                        style={{ width: `${percent}%` }}
                        title={`${statut}: ${count}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="border-b border-slate-100">
        <button
          className="w-full flex items-center justify-between px-4 py-3"
          onClick={() => setOpenFiltres(!openFiltres)}
        >
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Filtres</span>
          {openFiltres ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </button>
        {openFiltres && (
          <div className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="sr-only">Visibilité</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleLots}
                  className={cn("h-7 px-2", showLots && "bg-slate-100")}
                >
                  {showLots ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span className="ml-1 text-xs">Lots</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleIlots}
                  className={cn("h-7 px-2", showIlots && "bg-slate-100")}
                >
                  {showIlots ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span className="ml-1 text-xs">Îlots</span>
                </Button>
              </div>
            </div>

            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="bg-slate-50">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="non-attribue">Lots non attribués</SelectItem>
                <SelectItem value="Lot en vente">Lot en vente</SelectItem>
                <SelectItem value="Lot réservé">Lot réservé</SelectItem>
                <SelectItem value="Lot vendu">Lot vendu</SelectItem>
                <SelectItem value="Lot non à vendre">Lot non à vendre</SelectItem>
              </SelectContent>
            </Select>

            {selectedIlot && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => onIlotChange(null)}
              >
                Afficher tous les îlots
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Ilots & Lots List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {selectedLotissement ? (
            <div className="space-y-2">
              {filteredIlots.slice(0, displayedIlotsCount).map(ilot => {
                const lotsForIlot = getLotsForIlot(ilot.id);
                const isExpanded = expandedIlots[ilot.id];
                
                return (
                  <div key={ilot.id} className="rounded-lg border border-slate-200 overflow-hidden">
                    <button
                      className={cn(
                        "w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors",
                        selectedIlot?.id === ilot.id && "bg-slate-100"
                      )}
                      onClick={() => {
                        toggleIlot(ilot.id);
                        onIlotChange(ilot);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: ilot.couleur || '#1e293b' }}
                        >
                          <Grid3X3 className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm">Îlot {ilot.numero_ilot}</p>
                          <p className="text-xs text-slate-500">{lotsForIlot.length} lots</p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {isExpanded && lotsForIlot.length > 0 && (
                      <div className="border-t border-slate-100 bg-slate-50 p-2 space-y-1">
                        {lotsForIlot.map(lot => (
                          <button
                            key={lot.id}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors text-left"
                            onClick={() => onLotClick(lot, ilot)}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="text-sm">Lot {lot.numero_lot}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {formatLotSurface(lot.surface) && (
                                <span className="text-xs text-slate-400">{formatLotSurface(lot.surface)}</span>
                              )}
                              <div 
                                className={cn("w-2 h-2 rounded-full", STATUT_COLORS[lot.statut])}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {displayedIlotsCount < filteredIlots.length && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setDisplayedIlotsCount(prev => prev + 50)}
                >
                  Charger plus ({filteredIlots.length - displayedIlotsCount} restants)
                </Button>
              )}

              {filteredIlots.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun îlot trouvé</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Map className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Sélectionnez un lotissement</p>
              <p className="text-xs mt-1">pour afficher les îlots et lots</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}