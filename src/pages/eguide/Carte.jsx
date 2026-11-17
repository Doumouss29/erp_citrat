import React, { useState, useEffect, useMemo } from 'react';
import { MenuButton, MenuDrawer, MenuItem, MenuPortalLink } from "@/components/cgesn/PortalMenu";
import { Link } from 'react-router-dom';
import { createEguidePageUrl as createPageUrl } from '@/lib/eguidePageUrl';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PortalReturnButton from '@/components/cgesn/PortalReturnButton';
import { AppLogo, useAppBrand, appBarStyle } from '@/components/cgesn/AppShell';

function useAuthRedirect() {
  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (!isAuth) {
        base44.auth.redirectToLogin(window.location.pathname);
      }
    });
  }, []);
}
import LotissementMap from '@/components/eguide/map/MapContainer';
import LotDetailModal from '@/components/eguide/map/LotDetailModal';
import LotissementSidebar from '@/components/eguide/sidebar/LotissementSidebar';
import ImportLotissementModal from '@/components/eguide/import/ImportLotissementModal';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Loader2, Map, LayoutDashboard, Building, Users, History,
  Upload, Settings, LogOut, ChevronDown, Menu, X, Plus, FileText, Filter, ArrowLeft
} from 'lucide-react';
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, path: 'Dashboard' },
  { name: 'Carte', icon: Map, path: 'Carte' },
  { name: 'Lotissements', icon: Building, path: 'Lotissements' },
  { name: 'Attributaires', icon: Users, path: 'Attributaires' },
  { name: 'Historique', icon: History, path: 'Historique' },
  { name: 'Guide', icon: FileText, path: 'GenererGuide' },
  { name: 'Administration', icon: Settings, path: 'Admin', adminOnly: true }
];

export default function Carte() {
  useAuthRedirect();
  const [selectedLotissement, setSelectedLotissement] = useState(() => {
    const saved = localStorage.getItem('selectedLotissementId');
    return saved;
  });
  const [selectedIlot, setSelectedIlot] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [selectedLotIlot, setSelectedLotIlot] = useState(null);
  const [showLots, setShowLots] = useState(true);
  const [showIlots, setShowIlots] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me()
  });

  const { data: themeConfigs = [] } = useQuery({
    queryKey: ['config-theme'],
    queryFn: () => base44.entities.ConfigurationApp.filter({ cle: 'theme' })
  });

  const theme = useMemo(() => {
    const defaultTheme = {
      primaryColor: '#a3009d',
      primaryTextColor: '#a3009d',
      navbarBgColor: '#ffffff',
      appNameColor: '#0f172a',
      appSubtitleColor: '#64748b',
      navLinkColor: '#475569',
      navLinkHoverBgColor: '#f1f5f9',
      importButtonBgColor: '#1e293b',
      importButtonTextColor: '#ffffff',
      fontSize: 'base',
      appName: 'e-Guide'
    };
    return themeConfigs.length > 0 && themeConfigs[0].valeur
      ? { ...defaultTheme, ...themeConfigs[0].valeur }
      : defaultTheme;
  }, [themeConfigs]);

  const { data: lotissements = [], isLoading: loadingLotissements, refetch: refetchLotissements } = useQuery({
    queryKey: ['lotissements-eguide'],
    queryFn: () => base44.entities.LotissementEguide.filter({ commune: { $exists: true, $ne: "" } })
  });

  const { data: ilots = [], isLoading: loadingIlots } = useQuery({
    queryKey: ['ilots', selectedLotissement?.id],
    queryFn: () => selectedLotissement 
      ? base44.entities.Ilot.filter({ id_lotissement: selectedLotissement.id })
      : Promise.resolve([]),
    enabled: !!selectedLotissement,
    staleTime: 5 * 60 * 1000
  });

  const { data: lots = [], isLoading: loadingLots, refetch: refetchLots } = useQuery({
    queryKey: ['lots', selectedLotissement?.id],
    queryFn: () => selectedLotissement
      ? base44.entities.Lot.filter({ id_lotissement: selectedLotissement.id })
      : Promise.resolve([]),
    enabled: !!selectedLotissement,
    staleTime: 5 * 60 * 1000
  });

  const { data: allAttributaires = [], refetch: refetchAttributaires } = useQuery({
    queryKey: ['attributaires', selectedLotissement?.id],
    queryFn: () => selectedLotissement
      ? base44.entities.Attributaire.filter({ actif: true })
      : Promise.resolve([]),
    enabled: !!selectedLotissement
  });

  // Filtrer les lots selon le statut et l'attribution
  const filteredLots = useMemo(() => {
    if (statusFilter === 'non-attribue') {
      const lotsAvecAttributaires = new Set(allAttributaires.map(a => a.id_lot));
      return lots.filter(lot => !lotsAvecAttributaires.has(lot.id));
    }
    return lots;
  }, [lots, statusFilter, allAttributaires]);

  // Sélectionner le lotissement sauvegardé ou le seul lotissement disponible
  useEffect(() => {
    if (lotissements.length > 0) {
      if (typeof selectedLotissement === 'string') {
        // On a un ID sauvegardé, chercher le lotissement correspondant
        const found = lotissements.find(l => l.id === selectedLotissement);
        if (found) {
          setSelectedLotissement(found);
        } else {
          // L'ID sauvegardé n'existe plus, ne rien sélectionner si plusieurs lotissements
          if (lotissements.length === 1) {
            setSelectedLotissement(lotissements[0]);
            localStorage.setItem('selectedLotissementId', lotissements[0].id);
          } else {
            setSelectedLotissement(null);
            localStorage.removeItem('selectedLotissementId');
          }
        }
      } else if (!selectedLotissement && lotissements.length === 1) {
        // Un seul lotissement disponible, le sélectionner automatiquement
        setSelectedLotissement(lotissements[0]);
        localStorage.setItem('selectedLotissementId', lotissements[0].id);
      }
    }
  }, [lotissements]);

  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(null);

  const handleLotClick = (lot, ilot) => {
    setSelectedLot(lot);
    setSelectedLotIlot(ilot);
    
    // Zoom sur le lot
    if (lot.geometrie?.coordinates?.[0]) {
      const coords = lot.geometrie.coordinates[0];
      let sumLat = 0, sumLng = 0;
      coords.forEach(coord => {
        sumLng += coord[0];
        sumLat += coord[1];
      });
      const centerLat = sumLat / coords.length;
      const centerLng = sumLng / coords.length;
      setMapCenter([centerLat, centerLng]);
      setMapZoom(18);
    }
    
    setIsModalOpen(true);
  };

  const handleIlotClick = (ilot) => {
    setSelectedIlot(ilot);
    
    // Zoom sur l'îlot
    if (ilot?.geometrie?.coordinates?.[0]) {
      const coords = ilot.geometrie.coordinates[0];
      let sumLat = 0, sumLng = 0;
      coords.forEach(coord => {
        sumLng += coord[0];
        sumLat += coord[1];
      });
      const centerLat = sumLat / coords.length;
      const centerLng = sumLng / coords.length;
      setMapCenter([centerLat, centerLng]);
      setMapZoom(17);
    }
  };

  const handleLotUpdated = () => {
    refetchLots();
    refetchAttributaires();
  };

  const handleImportSuccess = (newLotissement) => {
    refetchLotissements();
    setSelectedLotissement(newLotissement);
  };

  const handleAddressSelect = (location) => {
    setMapCenter([location.lat, location.lng]);
    setMapZoom(16);
  };

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (user?.role === 'viewer' && !['Dashboard', 'Carte'].includes(item.path)) return false;
    return true;
  });

  const brand = useAppBrand('lotissement');

  const isLoading = loadingLotissements || (selectedLotissement && (loadingIlots || loadingLots));

  return (
    <div className="flex flex-col h-screen supports-[height:100dvh]:h-dvh bg-slate-50 overflow-x-hidden">
      {/* Header */}
      <header 
        className="h-14 md:h-16 flex-shrink-0 relative z-[2147483647] text-white"
        style={appBarStyle(brand.color)}
      >
        <div className="h-full w-full px-4 md:px-5 flex items-center justify-between gap-3 overflow-x-hidden">
          {/* Identité de l'application (même barre que les autres pages du portail) */}
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2.5 min-w-0 flex-shrink-0 no-underline text-white">
            <AppLogo src={brand.logo} code="eG" color={brand.color} bg={brand.def.iconBg} fit={brand.def.iconFit} />
            <span className="font-semibold text-[15px] md:text-[17px] truncate" style={{ fontFamily: "'Poppins', sans-serif" }}>{brand.name}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 relative z-[100]" style={{ '--eg': brand.color }}>
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === 'Carte';
              
              return (
                <Link
                  key={item.path}
                  to={createPageUrl(item.path)}
                  className={cn(
                    "flex items-center gap-2 px-3 xl:px-4 py-2 rounded-lg font-medium transition-colors no-underline",
                    isActive ? "bg-white text-[color:var(--eg)]" : "text-white/90 hover:text-white"
                  )}
                  style={{ fontSize: '0.875rem' }}
                  onMouseEnter={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')}
                  onMouseLeave={(e) => !isActive && (e.currentTarget.style.backgroundColor = isActive ? '' : 'transparent')}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Actions & User Menu */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {user?.role !== 'viewer' && (
              <Button 
                onClick={() => setIsImportModalOpen(true)}
                className="hidden sm:flex bg-white hover:bg-white"
                style={{ color: brand.color }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Importer un lotissement
              </Button>
            )}

            {/* Bouton menu officiel Portail Digital */}
            <MenuButton onDark className="lg:hidden" open={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
          </div>
        </div>

        {/* Menu mobile officiel Portail Digital */}
        <MenuDrawer
          open={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          className="lg:hidden"
          footer={<MenuPortalLink onClick={() => setIsMobileMenuOpen(false)} />}
        >
          {user?.role !== 'viewer' && (
            <MenuItem
              icon={Plus}
              onClick={() => {
                setIsImportModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
            >
              Importer un lotissement
            </MenuItem>
          )}
          {filteredNavItems.map((item) => (
            <MenuItem
              key={item.path}
              to={createPageUrl(item.path)}
              icon={item.icon}
              active={item.path === 'Carte'}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.name}
            </MenuItem>
          ))}
        </MenuDrawer>
      </header>

      {/* Mobile Fullscreen Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-[2147483647] bg-white">
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
            <div className="font-semibold">Filtres</div>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileSidebarOpen(false)} aria-label="Fermer">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="h-[calc(100vh-4rem)] overflow-y-auto">
            <LotissementSidebar
              lotissements={lotissements}
              ilots={ilots}
              lots={filteredLots}
              attributaires={allAttributaires}
              selectedLotissement={selectedLotissement}
              selectedIlot={selectedIlot}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onLotissementChange={(l) => {
                setSelectedLotissement(l);
                setSelectedIlot(null);
                localStorage.setItem('selectedLotissementId', l.id);
                if (l?.coordonnees_centre?.lat && l?.coordonnees_centre?.lng) {
                  setMapCenter([l.coordonnees_centre.lat, l.coordonnees_centre.lng]);
                  setMapZoom(l.zoom_defaut || 15);
                } else {
                  setMapCenter(null);
                  setMapZoom(null);
                }
                setIsMobileSidebarOpen(false);
              }}
              onIlotChange={handleIlotClick}
              showLots={showLots}
              onToggleLots={() => setShowLots(!showLots)}
              showIlots={showIlots}
              onToggleIlots={() => setShowIlots(!showIlots)}
              onLotClick={handleLotClick}
              onAddressSelect={handleAddressSelect}
            />
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="flex flex-1 overflow-hidden">
      <div className="hidden lg:block">
        <LotissementSidebar
          lotissements={lotissements}
          ilots={ilots}
          lots={filteredLots}
          attributaires={allAttributaires}
          selectedLotissement={selectedLotissement}
          selectedIlot={selectedIlot}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onLotissementChange={(l) => {
            setSelectedLotissement(l);
            setSelectedIlot(null);
            localStorage.setItem('selectedLotissementId', l.id);
            // Zoomer sur le lotissement sélectionné s'il a des coordonnées
            if (l?.coordonnees_centre?.lat && l?.coordonnees_centre?.lng) {
              setMapCenter([l.coordonnees_centre.lat, l.coordonnees_centre.lng]);
              setMapZoom(l.zoom_defaut || 15);
            } else {
              setMapCenter(null);
              setMapZoom(null);
            }
          }}
          onIlotChange={handleIlotClick}
          showLots={showLots}
          onToggleLots={() => setShowLots(!showLots)}
          showIlots={showIlots}
          onToggleIlots={() => setShowIlots(!showIlots)}
          onLotClick={handleLotClick}
          onAddressSelect={handleAddressSelect}
        />
      </div>

      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-slate-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Chargement de la carte...</p>
            </div>
          </div>
        ) : (
          <LotissementMap
            lots={filteredLots}
            ilots={ilots}
            selectedLotissement={selectedLotissement}
            selectedIlot={selectedIlot}
            onLotClick={handleLotClick}
            showLots={showLots}
            showIlots={showIlots}
            statusFilter={statusFilter}
            customCenter={mapCenter}
            customZoom={mapZoom}
            attributaires={allAttributaires}
          />
        )}
      </div>

      <LotDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lot={selectedLot}
        ilot={selectedLotIlot}
        lotissement={selectedLotissement}
        onLotUpdated={handleLotUpdated}
      />

      <ImportLotissementModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
    </div>
  );
}