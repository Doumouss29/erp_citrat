import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { needsConsent, isConsentFreePath } from '@/lib/consentement';
import { isOfficeAccount } from '@/components/utils/officeUtils';
// RH-CGESN pages
import RequireAppAccess from '@/components/RequireAppAccess';
import RhLayoutRoute from '@/components/RhLayoutRoute';
// CGESN-BOARD pages
// E-CADASTRE pages
// ASSISTANCE (Support SI) pages
// E-GUIDE pages

// CSST pages
// HSE pages
// COPROCIV (gestion de copropriétés, loi 2019-576)
import AccountSuspended from '@/components/AccountSuspended';
import { isAccountBlocked } from '@/lib/externalAccess';
// Add page imports here

// Pages chargées à la demande : chaque module (RH, Board, E-Cadastre…) n'est téléchargé
// que lorsqu'on l'ouvre, au lieu de tout l'ERP au premier chargement.
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Landing = lazy(() => import('@/pages/Landing'));
const Connexion = lazy(() => import('@/pages/Connexion'));
const Inscription = lazy(() => import('@/pages/Inscription'));
const Portail = lazy(() => import('@/pages/Portail'));
const Bienvenue = lazy(() => import('@/pages/Bienvenue'));
const Administration = lazy(() => import('@/pages/Administration'));
const Politique = lazy(() => import('@/pages/Politique'));
const Conditions = lazy(() => import('@/pages/Conditions'));
const Consentement = lazy(() => import('@/pages/Consentement'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const DashboardAgent = lazy(() => import('@/pages/DashboardAgent'));
const Pointage = lazy(() => import('@/pages/Pointage'));
const Conges = lazy(() => import('@/pages/Conges'));
const Absences = lazy(() => import('@/pages/Absences'));
const GestionPersonnel = lazy(() => import('@/pages/GestionPersonnel'));
const Validation = lazy(() => import('@/pages/Validation'));
const Profil = lazy(() => import('@/pages/Profil'));
const DeclarationActivite = lazy(() => import('@/pages/DeclarationActivite'));
const RapportsPointage = lazy(() => import('@/pages/RapportsPointage'));
const ReglementationMenu = lazy(() => import('@/pages/ReglementationMenu'));
const LeavePolicies = lazy(() => import('@/pages/LeavePolicies'));
const MissionsHistory = lazy(() => import('@/pages/MissionsHistory'));
const ReglementInterieur = lazy(() => import('@/pages/ReglementInterieur'));
const Reglementation = lazy(() => import('@/pages/Reglementation'));
const ReportingSync = lazy(() => import('@/pages/ReportingSync'));
const AbsencesConges = lazy(() => import('@/pages/AbsencesConges'));
const Calendrier = lazy(() => import('@/pages/Calendrier'));
const ProfilReglementation = lazy(() => import('@/pages/ProfilReglementation'));
const BoardLayoutRoute = lazy(() => import('@/components/BoardLayoutRoute'));
const BoardAccueil = lazy(() => import('@/pages/board/Accueil'));
const BoardAdministration = lazy(() => import('@/pages/board/Administration'));
const BoardBureauDossiers = lazy(() => import('@/pages/board/BureauDossiers'));
const BoardComptabilite = lazy(() => import('@/pages/board/Comptabilite'));
const BoardComptabiliteJournal = lazy(() => import('@/pages/board/ComptabiliteJournal'));
const BoardComptabiliteRapports = lazy(() => import('@/pages/board/ComptabiliteRapports'));
const BoardMesDossiers = lazy(() => import('@/pages/board/MesDossiers'));
const BoardModulesHome = lazy(() => import('@/pages/board/ModulesHome'));
const BoardProjetDetailPage = lazy(() => import('@/pages/board/ProjetDetailPage'));
const BoardRapportMensuel = lazy(() => import('@/pages/board/RapportMensuel'));
const BoardRapportsAdmin = lazy(() => import('@/pages/board/RapportsAdmin'));
const BoardSuiviActivites = lazy(() => import('@/pages/board/SuiviActivites'));
const BoardSuiviProjets = lazy(() => import('@/pages/board/SuiviProjets'));
const BoardActivitesPDF = lazy(() => import('@/pages/board/ActivitesPDF'));
const BoardRapportPDF = lazy(() => import('@/pages/board/RapportPDF'));
const BoardLotissementsList = lazy(() => import('@/pages/board/LotissementsList'));
const BoardLotissementDetail = lazy(() => import('@/pages/board/LotissementDetail'));
const EcadastreLayoutRoute = lazy(() => import('@/components/EcadastreLayoutRoute'));
const EcadastreAccueil = lazy(() => import('@/pages/ecadastre/Accueil'));
const EcadastreAdminOrganisations = lazy(() => import('@/pages/ecadastre/AdminOrganisations'));
const EcadastreCollecteParCarte = lazy(() => import('@/pages/ecadastre/CollecteParCarte'));
const EcadastreDashboardSuperviseur = lazy(() => import('@/pages/ecadastre/DashboardSuperviseur'));
const EcadastreDetailCollecte = lazy(() => import('@/pages/ecadastre/DetailCollecte'));
const EcadastreEditerCollecte = lazy(() => import('@/pages/ecadastre/EditerCollecte'));
const EcadastreManuelUtilisation = lazy(() => import('@/pages/ecadastre/ManuelUtilisation'));
const EcadastreMesCollectes = lazy(() => import('@/pages/ecadastre/MesCollectes'));
const EcadastreNouvelleCollecte = lazy(() => import('@/pages/ecadastre/NouvelleCollecte'));
const EcadastreRapportCollecte = lazy(() => import('@/pages/ecadastre/RapportCollecte'));
const EcadastreRapportCollecteCompact = lazy(() => import('@/pages/ecadastre/RapportCollecteCompact'));
const EcadastreSyncOffline = lazy(() => import('@/pages/ecadastre/SyncOffline'));
const AssistanceLayoutRoute = lazy(() => import('@/components/AssistanceLayoutRoute'));
const AssistanceDashboard = lazy(() => import('@/pages/assistance/Dashboard'));
const AssistanceTicketsList = lazy(() => import('@/pages/assistance/TicketsList'));
const AssistanceCreateTicket = lazy(() => import('@/pages/assistance/CreateTicket'));
const AssistanceTicketDetail = lazy(() => import('@/pages/assistance/TicketDetail'));
const AssistanceSIWorkspace = lazy(() => import('@/pages/assistance/SIWorkspace'));
const AssistanceUsersPage = lazy(() => import('@/pages/assistance/UsersPage'));
const AssistanceNotifications = lazy(() => import('@/pages/assistance/Notifications'));
const AssistanceStatistics = lazy(() => import('@/pages/assistance/Statistics'));
const AssistancePublicTicketTracker = lazy(() => import('@/pages/assistance/PublicTicketTracker'));
const EguideLayoutRoute = lazy(() => import('@/components/EguideLayoutRoute'));
const EguideAdmin = lazy(() => import('@/pages/eguide/Admin'));
const EguideAttributaires = lazy(() => import('@/pages/eguide/Attributaires'));
const EguideCarte = lazy(() => import('@/pages/eguide/Carte'));
const EguideDashboard = lazy(() => import('@/pages/eguide/Dashboard'));
const EguideGenererGuide = lazy(() => import('@/pages/eguide/GenererGuide'));
const EguideHistorique = lazy(() => import('@/pages/eguide/Historique'));
const EguideImportData = lazy(() => import('@/pages/eguide/ImportData'));
const EguideLotissements = lazy(() => import('@/pages/eguide/Lotissements'));
const EguideParametres = lazy(() => import('@/pages/eguide/Parametres'));
const CsstLayoutRoute = lazy(() => import('@/components/CsstLayoutRoute'));
const CsstSensibilisation = lazy(() => import('@/pages/csst/Sensibilisation'));
const HseLayoutRoute = lazy(() => import('@/components/HseLayoutRoute'));
const HSEDashboard = lazy(() => import('@/pages/hse/HSEDashboard'));
const HSEPhotoGallery = lazy(() => import('@/pages/hse/PhotoGallery'));
const HSEBMObservations = lazy(() => import('@/pages/hse/BMObservations'));
const HSERapports = lazy(() => import('@/pages/hse/RapportsHSE'));
const CoprocivModule = lazy(() => import('@/pages/CoprocivModule'));

// Anciens chemins RH (avant le préfixe /rh) : favoris et liens déjà envoyés
// sont redirigés vers /rh/<page>, en gardant les paramètres (?tab=…).
const LEGACY_RH_PAGES = [
  'DashboardAgent', 'AbsencesConges', 'Calendrier', 'ProfilReglementation', 'Absences', 'Conges',
  'DeclarationActivite', 'Profil', 'ReglementationMenu', 'Dashboard', 'Validation', 'GestionPersonnel',
  'RapportsPointage', 'ReportingSync', 'Pointage', 'LeavePolicies', 'MissionsHistory',
  'ReglementInterieur', 'Reglementation'
];
function LegacyRhRedirect() {
  const location = useLocation();
  return <Navigate to={`/rh${location.pathname}${location.search}${location.hash}`} replace />;
}

// Consentement obligatoire : tant que l'utilisateur connecté n'a pas accepté la notice en vigueur,
// toute page (portail, administration, applications) renvoie vers /consentement.
// Exceptions : pages publiques et légales, comptes bureaux (voir lib/consentement.js).
function ConsentGate({ children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  // Compte suspendu (sortie, fin de mission) : plus aucune page connectée, seules les pages publiques restent ouvertes.
  if (isAuthenticated && isAccountBlocked(user) && !isConsentFreePath(location.pathname)) {
    return <AccountSuspended />;
  }
  // Comptes bureaux (Gmail des terminaux) : uniquement la page de pointage, partout dans le portail
  if (isAuthenticated && user && isOfficeAccount(user.email) && location.pathname !== '/rh/Pointage') {
    return <Navigate to="/rh/Pointage" replace />;
  }
  if (isAuthenticated && needsConsent(user) && !isConsentFreePath(location.pathname)) {
    const back = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/consentement?returnTo=${back}`} replace />;
  }
  return children;
}

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  // Note: le portail CGESN est auto-contenu (sa propre auth localStorage + code admin),
  // il ne dépend pas de l'auth Base44 : on ne redirige donc pas vers le login Base44.
  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Render the main app
  return (
    <ConsentGate>
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Auth routes (boilerplate) */}
      <Route path="/login" element={<Navigate to="/connexion" replace />} />
      <Route path="/register" element={<Navigate to="/inscription" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Portail Digital CGESN */}
      <Route path="/" element={<Landing />} />
      <Route path="/bienvenue" element={<Bienvenue />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/inscription" element={<Inscription />} />
      <Route path="/portail" element={<Portail />} />
      <Route path="/administration" element={<Administration />} />
      <Route path="/politique" element={<Politique />} />
      <Route path="/conditions" element={<Conditions />} />
      <Route path="/consentement" element={<Consentement />} />
      <Route path="/mes-donnees" element={<Consentement mode="gestion" />} />

      {/* RH-CGESN */}
      <Route element={<RequireAppAccess appId="rhcgesn" />}>
        <Route path="/rh" element={<Navigate to="/rh/Dashboard" replace />} />
        <Route element={<RhLayoutRoute />}>
          <Route path="/rh/DashboardAgent" element={<DashboardAgent />} />
          <Route path="/rh/AbsencesConges" element={<AbsencesConges />} />
          <Route path="/rh/Calendrier" element={<Calendrier />} />
          <Route path="/rh/ProfilReglementation" element={<ProfilReglementation />} />
          <Route path="/rh/Absences" element={<Absences />} />
          <Route path="/rh/Conges" element={<Conges />} />
          <Route path="/rh/DeclarationActivite" element={<DeclarationActivite />} />
          <Route path="/rh/Profil" element={<Profil />} />
          <Route path="/rh/ReglementationMenu" element={<ReglementationMenu />} />
          <Route path="/rh/Dashboard" element={<Dashboard />} />
          <Route path="/rh/Validation" element={<Validation />} />
          <Route path="/rh/GestionPersonnel" element={<GestionPersonnel />} />
          <Route path="/rh/RapportsPointage" element={<RapportsPointage />} />
          <Route path="/rh/ReportingSync" element={<ReportingSync />} />
          <Route path="/rh/Pointage" element={<Pointage />} />
          <Route path="/rh/LeavePolicies" element={<LeavePolicies />} />
          <Route path="/rh/MissionsHistory" element={<MissionsHistory />} />
          <Route path="/rh/ReglementInterieur" element={<ReglementInterieur />} />
          <Route path="/rh/Reglementation" element={<Reglementation />} />
        </Route>
      </Route>

      {LEGACY_RH_PAGES.map((p) => (
        <Route key={p} path={`/${p}`} element={<LegacyRhRedirect />} />
      ))}

      {/* CGESN-BOARD */}
      <Route element={<RequireAppAccess appId="cgesnboard" />}>
        <Route element={<BoardLayoutRoute />}>
          <Route path="/board" element={<BoardModulesHome />} />
          <Route path="/board/Accueil" element={<BoardAccueil />} />
          <Route path="/board/Administration" element={<BoardAdministration />} />
          <Route path="/board/BureauDossiers" element={<BoardBureauDossiers />} />
          <Route path="/board/MesDossiers" element={<BoardMesDossiers />} />
          <Route path="/board/ModulesHome" element={<Navigate to="/board" replace />} />
          <Route path="/board/SuiviActivites" element={<BoardSuiviActivites />} />
          <Route path="/board/SuiviProjets" element={<BoardSuiviProjets />} />
          <Route path="/board/ProjetDetailPage" element={<BoardProjetDetailPage />} />
          <Route path="/board/RapportMensuel" element={<BoardRapportMensuel />} />
          <Route path="/board/RapportsAdmin" element={<BoardRapportsAdmin />} />
          <Route path="/board/GestionUtilisateurs" element={<Navigate to="/administration?tab=board" replace />} />
          <Route path="/board/Comptabilite" element={<Navigate to="/board/Comptabilite/operations" replace />} />
          <Route path="/board/Comptabilite/operations" element={<BoardComptabilite />} />
          <Route path="/board/Comptabilite/rapports" element={<BoardComptabiliteRapports />} />
          <Route path="/board/Comptabilite/journal" element={<BoardComptabiliteJournal />} />
          <Route path="/board/Comptabilite/administration" element={<Navigate to="/board/Comptabilite/journal" replace />} />
          <Route path="/board/ActivitesPDF" element={<BoardActivitesPDF />} />
          <Route path="/board/RapportPDF" element={<BoardRapportPDF />} />
          <Route path="/board/LotissementsList" element={<BoardLotissementsList />} />
          <Route path="/board/LotissementDetail" element={<BoardLotissementDetail />} />
        </Route>
      </Route>

      {/* E-CADASTRE */}
      <Route element={<RequireAppAccess appId="ecadastre" />}>
        <Route element={<EcadastreLayoutRoute />}>
          <Route path="/ecadastre" element={<Navigate to="/ecadastre/Accueil" replace />} />
          <Route path="/ecadastre/Accueil" element={<EcadastreAccueil />} />
          {/* Modules retirés (réaffectation des sections, migration des photos) : anciens liens renvoyés vers l'administration */}
          <Route path="/ecadastre/AdminMigrationPhotos" element={<Navigate to="/ecadastre/AdminOrganisations" replace />} />
          <Route path="/ecadastre/AdminOrganisations" element={<EcadastreAdminOrganisations />} />
          <Route path="/ecadastre/AdminReassignSections" element={<Navigate to="/ecadastre/AdminOrganisations" replace />} />
          <Route path="/ecadastre/CollecteParCarte" element={<EcadastreCollecteParCarte />} />
          <Route path="/ecadastre/DashboardSuperviseur" element={<EcadastreDashboardSuperviseur />} />
          <Route path="/ecadastre/DetailCollecte" element={<EcadastreDetailCollecte />} />
          <Route path="/ecadastre/EditerCollecte" element={<EcadastreEditerCollecte />} />
          <Route path="/ecadastre/ManuelUtilisation" element={<EcadastreManuelUtilisation />} />
          <Route path="/ecadastre/MesCollectes" element={<EcadastreMesCollectes />} />
          <Route path="/ecadastre/NouvelleCollecte" element={<EcadastreNouvelleCollecte />} />
          <Route path="/ecadastre/RapportCollecte" element={<EcadastreRapportCollecte />} />
          <Route path="/ecadastre/RapportCollecteCompact" element={<EcadastreRapportCollecteCompact />} />
          <Route path="/ecadastre/Settings" element={<Navigate to="/ecadastre/Accueil" replace />} />
          <Route path="/ecadastre/SyncOffline" element={<EcadastreSyncOffline />} />
        </Route>
      </Route>

      {/* ASSISTANCE (Support SI) */}
      <Route element={<RequireAppAccess appId="assistancenum" />}>
        <Route element={<AssistanceLayoutRoute />}>
          <Route path="/assistance" element={<AssistanceDashboard />} />
          <Route path="/assistance/tickets" element={<AssistanceTicketsList />} />
          <Route path="/assistance/create-ticket" element={<AssistanceCreateTicket />} />
          <Route path="/assistance/ticket/:id" element={<AssistanceTicketDetail />} />
          <Route path="/assistance/si-workspace" element={<AssistanceSIWorkspace />} />
          <Route path="/assistance/users" element={<AssistanceUsersPage />} />
          <Route path="/assistance/notifications" element={<AssistanceNotifications />} />
          <Route path="/assistance/statistics" element={<AssistanceStatistics />} />
        </Route>
      </Route>
      <Route path="/assistance/suivi/:ticketNumber" element={<AssistancePublicTicketTracker />} />

      {/* E-GUIDE */}
      <Route element={<RequireAppAccess appId="lotissement" />}>
        <Route element={<EguideLayoutRoute />}>
          {/* Page principale du module E-GUIDE : le tableau de bord */}
          <Route path="/eguide" element={<Navigate to="/eguide/Dashboard" replace />} />
          <Route path="/eguide/Admin" element={<EguideAdmin />} />
          <Route path="/eguide/Attributaires" element={<EguideAttributaires />} />
          <Route path="/eguide/Carte" element={<EguideCarte />} />
          <Route path="/eguide/Dashboard" element={<EguideDashboard />} />
          <Route path="/eguide/GenererGuide" element={<EguideGenererGuide />} />
          <Route path="/eguide/Historique" element={<EguideHistorique />} />
          <Route path="/eguide/ImportData" element={<EguideImportData />} />
          <Route path="/eguide/Lotissements" element={<EguideLotissements />} />
          <Route path="/eguide/Parametres" element={<EguideParametres />} />
        </Route>
      </Route>

      {/* CSST (Sensibilisation SST) */}
      <Route element={<RequireAppAccess appId="csst" />}>
        <Route element={<CsstLayoutRoute />}>
          <Route path="/csst" element={<CsstSensibilisation />} />
        </Route>
      </Route>

      {/* HSE (Registre HSE PRESFOR) */}
      <Route element={<RequireAppAccess appId="hse" />}>
        <Route element={<HseLayoutRoute />}>
          <Route path="/hse" element={<HSEDashboard />} />
          <Route path="/hse/photos" element={<HSEPhotoGallery />} />
          <Route path="/hse/observations" element={<HSEBMObservations />} />
          <Route path="/hse/rapports" element={<HSERapports />} />
        </Route>
      </Route>

      {/* COPROCIV */}
      <Route element={<RequireAppAccess appId="coprociv" />}>
        <Route path="/coprociv" element={<CoprocivModule />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
    </ConsentGate>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ThemeProvider>
            <ScrollToTop />
            <AuthenticatedApp />
          </ThemeProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App