import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AppShell from "@/components/cgesn/AppShell";
import { Clock, FileX, Calendar, LayoutDashboard, Users, FileText, Home, Menu, X, LogOut, BarChart3, CheckCircle2, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import MobileNavBar from "@/components/mobile/MobileNavBar";
import SharedHeader from "@/components/mobile/SharedHeader";
import { isOfficeAccount, loadOfficeDirectory } from "@/components/utils/officeUtils";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PortalReturnButton from "@/components/cgesn/PortalReturnButton";
import { canAccessRh } from "@/lib/rhAccess";
import { isExternalUser, RH_PAGES_HIDDEN_FOR_EXTERNALS } from "@/lib/externalAccess";
import { loadWorkflowValidators, resolveUserWorkflowLevel } from "@/lib/workflowValidators";
import useAppTheme from "@/hooks/useAppTheme";
import { getMe, getEmployees } from "@/lib/rhSession";

export default function Layout({ children, currentPageName }) {
  // Thème RH (aussi pour les écrans hors coquille : chargement, Pointage, profil en attente)
  useAppTheme("rhcgesn");
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [workflowValidators, setWorkflowValidators] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffice, setIsOffice] = useState(false);
  const [navSpace, setNavSpace] = useState("personal");

  useEffect(() => {
    if (!currentUser || !employeeProfile || isOffice) return;
    const personalPages = ["DashboardAgent", "AbsencesConges", "Calendrier", "DeclarationActivite", "ProfilReglementation"];
    const adminPages = ["Dashboard", "Validation", "GestionPersonnel", "RapportsPointage", "ReportingSync"];
    if (personalPages.includes(currentPageName)) setNavSpace("personal");
    else if (adminPages.includes(currentPageName)) setNavSpace("admin");
  }, [currentPageName, currentUser, employeeProfile, isOffice]);

  const isPointagePage = currentPageName === "Pointage";

  useEffect(() => {
    loadUser();
  }, []);

  // Comptes bureaux : uniquement le terminal de pointage.
  // Autres comptes : pas d'accès au terminal (réservé aux e-mails des bureaux).
  useEffect(() => {
    if (!currentUser || loading) return;
    if (isOffice && currentPageName !== "Pointage") {
      navigate(createPageUrl("Pointage"), { replace: true });
    } else if (!isOffice && currentPageName === "Pointage") {
      navigate(createPageUrl(canAccessRh(currentUser) ? "Dashboard" : "DashboardAgent"), { replace: true });
    }
  }, [currentUser, isOffice, loading, currentPageName, navigate]);

  // Prestataires et consultants : pas de pages congés, calendrier ni missions, même par lien direct.
  useEffect(() => {
    if (isExternalUser(currentUser) && RH_PAGES_HIDDEN_FOR_EXTERNALS.includes(currentPageName)) {
      navigate(createPageUrl("DashboardAgent"), { replace: true });
    }
  }, [currentUser, currentPageName, navigate]);

  const loadUser = async () => {
    try {
      const user = await getMe();
      // Annuaire des bureaux (Administration → Bureaux) avant de décider de l'affichage
      await loadOfficeDirectory();
      const office = isOfficeAccount(user.email);
      setIsOffice(office);
      setCurrentUser(user);
      if (office) {
        setLoading(false);
        return;
      }

      // Validateurs du workflow (e-mails gérés depuis la page Administration)
      try {
        setWorkflowValidators(await loadWorkflowValidators());
      } catch (validatorError) {
        console.error("Error loading workflow validators:", validatorError);
      }

      // Vérifier si l'utilisateur non-admin a un profil employé
      // IMPORTANT : limite explicite à 500 (le SDK plafonne à 50 par défaut)
      // sinon, au-delà de 50 employés, certains restent bloqués sur l'écran
      // "profil en cours de configuration".
      // Fiche employé chargée pour tous (y compris les administrateurs) : un admin
      // sans fiche (ex. super administrateur) ne voit pas les pages personnelles.
      {
        try {
          const allEmployees = await getEmployees();
          const employeeData = allEmployees.find(emp =>
            emp.email?.toLowerCase() === user.email?.toLowerCase() ||
            (!!user.employee_code && emp.employee_code === user.employee_code)
          ) || null;
          setEmployeeProfile(employeeData);
        } catch (employeeError) {
          console.error("Error loading employee profile:", employeeError);
          setEmployeeProfile(null);
        }
      }
    } catch (error) {
      // Session absente ou expirée (ex. après une déconnexion) : retour à la connexion
      console.error("Error loading user:", error);
      navigate("/connexion", { replace: true });
      return;
    }
    setLoading(false);
  };

  const isHR = canAccessRh(currentUser);

  // Vérifier si l'utilisateur est validateur (e-mails configurés dans l'Administration)
  const isValidator = () => {
    if (!currentUser) return false;
    if (isHR) return true;
    // Validateurs Niveau 1, RH (Niveau 2) et DG (Niveau 3)
    return !!resolveUserWorkflowLevel(workflowValidators, currentUser);
  };

  // Bloquer l'accès si l'utilisateur n'est pas admin et n'a pas de profil employé (sauf comptes bureaux)
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  // Sans utilisateur connecté, rien n'est affiché (redirection vers /connexion)
  if (!currentUser) return null;

  // Comptes bureaux : terminal de pointage plein écran, sans aucun menu
  if (currentUser && isOffice) {
    if (!isPointagePage) return null; // redirection en cours
    return (
      <div className="min-h-screen" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {children}
      </div>
    );
  }

  // Le terminal est réservé aux e-mails des bureaux (redirection en cours)
  if (currentUser && isPointagePage) return null;

  // IMPORTANT: Les admins ont toujours accès complet (pour pouvoir créer les profils employés)
  if (currentUser && !isHR && !isOffice && !employeeProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md shadow-2xl border-blue-200">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Bienvenue !</h2>
            <p className="text-slate-600 mb-6">
              Votre compte a été créé avec succès. Votre profil employé est en cours de configuration par le service RH.
            </p>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-1">Email du compte:</p>
              <p className="text-blue-700 font-mono">{currentUser?.email}</p>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Vous recevrez une notification dès que votre profil sera activé. En attendant, vous pouvez retourner au portail.
            </p>
            <Link
              to="/portail"
              className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              Retour au portail
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navigationItems = [
    {
      title: "Mon tableau de bord",
      short: "Accueil",
      url: createPageUrl("DashboardAgent"),
      icon: Home,
      showForAll: true,
      personal: true,
      requiresAdmin: false,
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Absences & congés",
      short: "Congés",
      url: createPageUrl("AbsencesConges"),
      icon: FileX,
      showForAll: true,
      personal: true,
      color: "from-green-500 to-orange-500"
    },
    {
      title: "Calendrier",
      short: "Calendrier",
      url: createPageUrl("Calendrier"),
      icon: Calendar,
      showForAll: true,
      personal: true,
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Missions & activités",
      short: "Missions",
      url: createPageUrl("DeclarationActivite"),
      icon: FileText,
      showForAll: true,
      personal: true,
      requiresAdmin: false,
      color: "from-cyan-500 to-cyan-600"
    },
    {
      title: "Profil & règlement",
      short: "Profil",
      url: createPageUrl("ProfilReglementation"),
      icon: Users,
      showForAll: true,
      personal: true,
      requiresAdmin: false,
      color: "from-teal-500 to-teal-600"
    },
    {
      title: "Dashboard RH",
      short: "Dashboard",
      url: createPageUrl("Dashboard"),
      icon: LayoutDashboard,
      showForAll: false,
      requiresAdmin: true,
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Validations",
      short: "Validations",
      url: createPageUrl("Validation"),
      icon: CheckCircle2,
      showForAll: false,
      requiresAdmin: false,
      requiresValidator: true,
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Gestion du personnel",
      short: "Personnel",
      url: createPageUrl("GestionPersonnel"),
      icon: Users,
      showForAll: false,
      requiresAdmin: true,
      color: "from-indigo-500 to-indigo-600"
    },
    {
      title: "Rapports de pointage",
      short: "Pointage",
      url: createPageUrl("RapportsPointage"),
      icon: Clock,
      showForAll: false,
      requiresAdmin: true,
      color: "from-cyan-500 to-cyan-600"
    },

    {
      title: "Reporting & synchro",
      short: "Reporting",
      url: createPageUrl("ReportingSync"),
      icon: BarChart3,
      showForAll: false,
      requiresAdmin: true,
      color: "from-violet-500 to-violet-600"
    },
  ];

  // Pages personnelles (tableau de bord, absences & congés, calendrier, missions, profil) :
  // affichées dès que le compte est relié à une fiche employé, super administrateur compris.
  const hidePersonal = !employeeProfile;
  const externalHidden = isExternalUser(currentUser) ? ["AbsencesConges", "Calendrier", "DeclarationActivite"].map((page) => createPageUrl(page)) : [];
  const visibleItems = navigationItems.filter(item =>
    !externalHidden.includes(item.url) &&
    !(hidePersonal && item.personal) &&
    (item.showForAll || (item.requiresAdmin && isHR) || (item.requiresValidator && isValidator()))
  );

  const canSwitchSpace = !!employeeProfile && visibleItems.some(item => !item.personal);
  // Entrées du menu officiel : espace personnel, puis « Espace RH » (pastille RH)
  const menuItems = visibleItems.filter(item => !canSwitchSpace || (navSpace === "personal" ? item.personal : !item.personal)).map((item) => ({
    title: item.title,
    short: item.short,
    url: item.url,
    icon: item.icon,
    badge: (item.requiresAdmin || item.requiresValidator) ? "RH" : undefined,
    section: undefined,
  }));
  // Onglets mobiles : les 3 premières entrées disponibles dans cet ordre de priorité
  const tabPriority = ["DashboardAgent", "AbsencesConges", "Validation", "Calendrier", "Dashboard", "GestionPersonnel", "RapportsPointage"];
  const tabUrls = tabPriority
    .map((page) => createPageUrl(page))
    .filter((url) => menuItems.some((i) => i.url === url))
    .slice(0, 3);

  return (
    <AppShell
      appId="rhcgesn"
      app={{ code: "RH" }}
      items={menuItems}
      navigationSwitch={canSwitchSpace ? { value: navSpace, onChange: (space) => {
        setNavSpace(space);
        const target = visibleItems.find(item => space === "personal" ? item.personal : !item.personal);
        if (target) navigate(target.url);
      }} : undefined}
      tabs={tabUrls}
      user={{ name: employeeProfile ? `${employeeProfile.first_name || ""} ${employeeProfile.last_name || ""}`.trim() : currentUser?.full_name, email: currentUser?.email }}
      actions={currentUser && <NotificationBell userEmail={currentUser.email} buttonClassName="text-white hover:bg-white/10 hover:text-white h-10 w-10" />}
    >
      <motion.div
        key={currentPageName}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AppShell>
  );
}
