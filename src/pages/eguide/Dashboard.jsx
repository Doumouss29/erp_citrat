import React, { useState, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

function useAuthRedirect() {
  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (!isAuth) {
        base44.auth.redirectToLogin(window.location.pathname);
      }
    });
  }, []);
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Filter, 
  Map, Building, Grid3X3, MapPin, TrendingUp, Download, CheckCircle2, DollarSign, Calendar as CalendarIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createEguidePageUrl as createPageUrl } from '@/lib/eguidePageUrl';
import { toast } from 'sonner';

export default function Dashboard() {
  useAuthRedirect();
  const [selectedLotissement, setSelectedLotissement] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false); // mobile : filtres repliés

  // User role
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me()
  });

  const exportRef = useRef(null);

  // Date helpers: store ISO (yyyy-MM-dd) but display jj/mm/aaaa
  const toISODate = (d) => format(d, 'yyyy-MM-dd');
  const displayDate = (v) => (v ? format(new Date(v), 'dd/MM/yyyy') : 'jj/mm/aaaa');

  const { data: lotissements = [] } = useQuery({
    queryKey: ['lotissements-eguide'],
    queryFn: () => base44.entities.LotissementEguide.filter({ commune: { $exists: true, $ne: "" } }),
    staleTime: 5 * 60 * 1000
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['all-lots'],
    queryFn: async () => {
      const allLots = [];
      let skip = 0;
      const limit = 1000;
      
      while (true) {
        const batch = await base44.entities.Lot.filter({}, '-created_date', limit, skip);
        if (batch.length === 0) break;
        allLots.push(...batch);
        if (batch.length < limit) break;
        skip += limit;
      }
      
      return allLots;
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: ilots = [] } = useQuery({
    queryKey: ['all-ilots'],
    queryFn: () => base44.entities.Ilot.list(),
    staleTime: 5 * 60 * 1000
  });

  const filteredLots = useMemo(() => {
    let filtered = lots;
    
    if (selectedLotissement) {
      filtered = filtered.filter(l => l.id_lotissement === selectedLotissement);
    }
    
    if (startDate) {
      filtered = filtered.filter(l => new Date(l.created_date) >= new Date(startDate));
    }
    
    if (endDate) {
      filtered = filtered.filter(l => new Date(l.created_date) <= new Date(endDate));
    }
    
    return filtered;
  }, [lots, selectedLotissement, startDate, endDate]);

  const filteredIlots = useMemo(() => {
    if (!selectedLotissement) return ilots;
    return ilots.filter(i => i.id_lotissement === selectedLotissement);
  }, [ilots, selectedLotissement]);

  const STATUT_COLORS = {
    'Lot en vente': { bg: 'bg-red-100', text: 'text-red-700', chart: '#ef4444' },
    'Lot réservé': { bg: 'bg-amber-100', text: 'text-amber-700', chart: '#f59e0b' },
    'Lot vendu': { bg: 'bg-emerald-100', text: 'text-emerald-700', chart: '#10b981' },
    'Lot non cessible': { bg: 'bg-orange-100', text: 'text-orange-700', chart: '#f97316' }
  };
  const ALL_STATUSES = Object.keys(STATUT_COLORS);

  const statutStats = useMemo(() => {
    const stats = {};
    filteredLots.forEach(lot => {
      const rawStatut = lot.statut || 'Lot en vente';
      const statut = rawStatut === 'Lot non à vendre' ? 'Lot non cessible' : rawStatut;
      stats[statut] = (stats[statut] || 0) + 1;
    });
    return stats;
  }, [filteredLots]);

  const statusEntries = useMemo(() => Object.entries(statutStats), [statutStats]);

  const lotsVendus = statutStats['Lot vendu'] || 0;

  const montantVendu = useMemo(() => {
    const soldLots = filteredLots.filter(lot => (lot.statut || '').trim() === 'Lot vendu');
    return soldLots.reduce((sum, lot) => {
      const raw = lot.prix;
      const n = typeof raw === 'number' 
        ? raw 
        : Number(String(raw ?? 0).replace(/\s+/g, '').replace(/,/g, '.'));
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [filteredLots]);

  const handleExportPDF = async () => {
    try {
      toast.info('Préparation du PDF...');
      const node = exportRef.current;
      if (!node) {
        toast.error('Zone à exporter introuvable');
        return;
      }

      const lotLabel = selectedLotissement
        ? (lotissements.find(l => l.id === selectedLotissement)?.nom || 'Lotissement')
        : 'Tous les lotissements';
      const dateLabel = (() => {
        if (startDate && endDate) return `Période: du ${displayDate(startDate)} au ${displayDate(endDate)}`;
        if (startDate) return `Période: depuis le ${displayDate(startDate)}`;
        if (endDate) return `Période: jusqu’au ${displayDate(endDate)}`;
        return 'Période: toutes dates';
      })();

      const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/png');

      const imgW = canvas.width;
      const imgH = canvas.height;
      const orientation = imgW >= imgH ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 32;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Tableau de bord', margin, margin + 4);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Lotissement(s): ${lotLabel}`, margin, margin + 22);
      pdf.text(dateLabel, margin, margin + 38);
      pdf.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy')}`, margin, margin + 54);

      const headerHeight = 70;
      const availW = pageW - margin * 2;
      const availH = pageH - margin - headerHeight;

      const imgRatio = imgW / imgH;
      let renderW = availW;
      let renderH = renderW / imgRatio;
      if (renderH > availH) {
        renderH = availH;
        renderW = renderH * imgRatio;
      }
      const x = margin + (availW - renderW) / 2;
      const y = margin + headerHeight;

      pdf.addImage(imgData, 'PNG', x, y, renderW, renderH, undefined, 'FAST');

      pdf.save(`rapport-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exporté');
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  if (currentUser?.role === 'viewer') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-6 text-center">
          <CardTitle className="mb-2">Accès refusé</CardTitle>
          <p className="text-sm text-slate-500">Le tableau de bord n'est pas disponible pour votre rôle.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Tableau de bord</h1>
              <p className="text-slate-500 mt-1 hidden sm:block">Vue d'ensemble de vos lotissements</p>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
              <Button onClick={handleExportPDF} variant="outline" className="flex-1 sm:flex-none sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                Exporter PDF
              </Button>
              
              <Link to={createPageUrl('Carte')} className="flex-1 sm:flex-none">
                <Button className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800">
                  <Map className="w-4 h-4 mr-2" />
                  Voir la carte
                </Button>
              </Link>

              {/* Mobile : les filtres s'ouvrent avec ce bouton */}
              {(() => {
                const n = (selectedLotissement ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0);
                return (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowFilters(v => !v)}
                    aria-expanded={showFilters}
                    aria-label="Filtres"
                    className={`sm:hidden relative flex-none w-10 px-0 ${showFilters || n ? "border-[#a3009d] text-[#a3009d] bg-fuchsia-50" : ""}`}
                  >
                    <Filter className="w-4 h-4" />
                    {n > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#a3009d] text-white text-xs font-bold flex items-center justify-center">{n}</span>}
                  </Button>
                );
              })()}
            </div>
          </div>

          {/* Filtres (toujours visibles dès la tablette) */}
          <Card className={showFilters ? "" : "hidden sm:block"}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="flex-1">
                  <Select 
                    value={selectedLotissement || 'all'} 
                    onValueChange={(v) => setSelectedLotissement(v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Tous les lotissements" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les lotissements</SelectItem>
                      {lotissements.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-40 justify-between">
                        <span>{displayDate(startDate)}</span>
                        <CalendarIcon className="w-4 h-4 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? new Date(startDate) : undefined}
                        onSelect={(date) => date && setStartDate(toISODate(date))}
                      />
                    </PopoverContent>
                  </Popover>

                  <span className="text-slate-400 hidden sm:inline">-</span>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-40 justify-between">
                        <span>{displayDate(endDate)}</span>
                        <CalendarIcon className="w-4 h-4 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ? new Date(endDate) : undefined}
                        onSelect={(date) => date && setEndDate(toISODate(date))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {(selectedLotissement || startDate || endDate) && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedLotissement(null);
                      setStartDate('');
                      setEndDate('');
                    }}
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards Row 1 */}
        <div ref={exportRef}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-slate-500 font-medium">Lotissements</p>
                <div className="mt-1 flex items-center gap-3">
                  <p className="text-3xl font-bold text-slate-900">
                    {selectedLotissement ? 1 : lotissements.length}
                  </p>
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Building className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-slate-500 font-medium">Îlots</p>
                <div className="mt-1 flex items-center gap-3">
                  <p className="text-3xl font-bold text-slate-900">{filteredIlots.length}</p>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Grid3X3 className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-slate-500 font-medium">Lots</p>
                <div className="mt-1 flex items-center gap-3">
                  <p className="text-3xl font-bold text-slate-900">{filteredLots.length}</p>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-slate-500 font-medium">Lots vendus</p>
                <div className="mt-1 flex items-center gap-3">
                  <p className="text-3xl font-bold text-emerald-700">{lotsVendus}</p>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Montant Vendu */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Montant Total Vendu</p>
                <p className="text-4xl font-bold text-emerald-700 mt-2">
                  {montantVendu.toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-xs text-slate-500 mt-1">{lotsVendus} lot{lotsVendus > 1 ? 's' : ''} vendu{lotsVendus > 1 ? 's' : ''}</p>
              </div>
              <div className="w-16 h-16 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Répartition par statut */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {ALL_STATUSES.map((statut) => {
                const count = statutStats[statut] || 0;
                const colors = STATUT_COLORS[statut] || STATUT_COLORS['Lot en vente'];
                const percentage = filteredLots.length > 0 ? ((count / filteredLots.length) * 100).toFixed(1) : 0;
                
                return (
                  <div key={statut} className="space-y-2">
                    <div className={`p-4 rounded-xl ${colors.bg}`}>
                      <p className={`text-xs font-medium ${colors.text}`}>{statut}</p>
                      <p className={`text-2xl font-bold ${colors.text} mt-1`}>{count}</p>
                      <p className={`text-xs ${colors.text} opacity-75 mt-1`}>{percentage}%</p>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all`}
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: colors.chart
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}