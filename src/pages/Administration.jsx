import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import BrandHeader from "@/components/cgesn/BrandHeader";
import ColorBar from "@/components/cgesn/ColorBar";
import SiteFooter from "@/components/cgesn/SiteFooter";
import { APP_DEFS, INTERNAL_APP_IDS, isRemovedApp } from "@/lib/cgesnData";
import { base44 } from "@/api/base44Client";
import { UploadFile } from "@/api/integrations";
import { useAuth } from "@/lib/AuthContext";
import { BRAND_LOGO_SLOTS, DEFAULT_BRAND_LOGOS, fetchBrandLogosConfig, saveBrandLogos } from "@/lib/brandLogos";
import { EXTERNAL_GRADES } from "@/lib/externalAccess";
import { fetchProfiles, invalidateProfiles, profileApps, getProfile } from "@/lib/accessProfiles";
import WorkflowValidatorsManager from "@/components/administration/WorkflowValidatorsManager";
import HseAlertRecipientsManager from "@/components/administration/HseAlertRecipientsManager";
import UsersByOrgManager from "@/components/administration/UsersByOrgManager";
import BoardUsersManager from "@/components/administration/BoardUsersManager";
import { OrgTiles, OrgTile } from "@/components/administration/OrgTiles";
import ConsentementsManager from "@/components/administration/ConsentementsManager";
import BureauxManager from "@/components/administration/BureauxManager";
import DepartementsManager from "@/components/administration/DepartementsManager";

// Liens d'applications externes : http(s) uniquement (pas de javascript:/data:).
function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// Applications intégrées en interne dans le portail (clés = app_id de APP_DEFS)

const tabBase = {
  padding: "10px 20px",
  borderRadius: 10,
  border: "1px solid oklch(0.88 0.005 90)",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Poppins',sans-serif"
};
const tabActive = { background: "#0C3D85", color: "#fff", borderColor: "#0C3D85" };
const tabInactive = { background: "#fff", color: "oklch(0.35 0.005 90)" };

// Flèche retour en SVG (remplace le caractère "←", au rendu inconsistant en gras)
function BackArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

// Icône poubelle pour l'action de suppression
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

// Initiales d'un utilisateur pour l'avatar (ex: "Lacina Kone" -> "LK")
function getInitials(u) {
  const source = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.full_name || u.email || "?";
  const parts = source.trim().split(/\s+/);
  const letters = parts.length > 1 ? [parts[0][0], parts[1][0]] : [source[0]];
  return letters.join("").toUpperCase();
}

// Initiales d'une application pour son icône (ex: "CITRAT-BOARD" -> "CB")
function getAppInitials(name) {
  const parts = (name || "?").trim().split(/[\s-]+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0][0], parts[1][0]] : [(name || "?")[0]];
  return letters.join("").toUpperCase();
}

// Icône lien/globe pour l'URL d'une application
function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.6 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// Icône crayon pour l'action de modification
function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

export default function Administration() {
  const { user, isLoadingAuth, refreshUser } = useAuth();
  // Page réservée au super administrateur (les autres administrateurs n'y ont pas accès).
  const isAdmin = !!user && user.super_admin === true;

  // ?tab=board ouvre directement l'onglet demandé (lien depuis CITRAT-Board).
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get("tab") || "apps");
  // Onglet Profils : grade ouvert ("" = tuiles seules)
  const [profileTile, setProfileTile] = useState("");
  const [apps, setApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [newAppName, setNewAppName] = useState("");
  const [newAppHref, setNewAppHref] = useState("");
  const [newAppIcon, setNewAppIcon] = useState("");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [newUserGrade, setNewUserGrade] = useState("");
  // Profils d'accès (grades) : chaque grade donne automatiquement un ensemble d'applis
  const [profiles, setProfiles] = useState([]);
  const [newProfileName, setNewProfileName] = useState("");
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [userGradeFilter, setUserGradeFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteAppId, setConfirmDeleteAppId] = useState(null);
  const [editingAppId, setEditingAppId] = useState(null);
  const [editHref, setEditHref] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editUploadingIcon, setEditUploadingIcon] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  // Logos du portail (en-tête, connexion)
  const [brandLogos, setBrandLogos] = useState({ header: "", login: "" });
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandUploading, setBrandUploading] = useState(null);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandError, setBrandError] = useState(null);
  const [brandMsg, setBrandMsg] = useState(null);

  const loadBrandLogos = async () => {
    setBrandLoading(true);
    setBrandError(null);
    try {
      const { value } = await fetchBrandLogosConfig();
      setBrandLogos({ header: value.header || "", login: value.login || "" });
    } catch (err) {
      setBrandError((err && err.message) || "Impossible de charger les logos.");
    } finally {
      setBrandLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadBrandLogos();
  }, [isAdmin]);

  const handleBrandUpload = async (slot, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBrandUploading(slot);
    setBrandError(null);
    setBrandMsg(null);
    try {
      const { file_url } = await UploadFile({ file });
      setBrandLogos((prev) => ({ ...prev, [slot]: file_url }));
    } catch (err) {
      setBrandError((err && err.message) || "Échec de l'import du logo.");
    } finally {
      setBrandUploading(null);
      e.target.value = "";
    }
  };

  const submitBrandLogos = async () => {
    setBrandSaving(true);
    setBrandError(null);
    setBrandMsg(null);
    try {
      const saved = await saveBrandLogos(brandLogos);
      setBrandLogos(saved);
      setBrandMsg("Logos enregistrés. Ils sont désormais affichés sur le portail.");
    } catch (err) {
      setBrandError((err && err.message) || "Échec de l'enregistrement des logos.");
    } finally {
      setBrandSaving(false);
    }
  };

  const loadApps = async () => {
    setAppsLoading(true);
    setAppsError(null);
    try {
      const list = await base44.entities.PortalApp.list();
      setApps(list || []);
    } catch (err) {
      setAppsError((err && err.message) || "Impossible de charger les applications.");
    } finally {
      setAppsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadApps();
  }, [isAdmin]);

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const list = await base44.entities.User.list();
      setUsers(list || []);
      return list || [];
    } catch (err) {
      setUsersError((err && err.message) || "Impossible de charger les utilisateurs.");
      return [];
    } finally {
      setUsersLoading(false);
    }
  };

  const loadProfiles = async () => {
    setProfilesLoading(true);
    setProfilesError(null);
    try {
      // Aucune création automatique de profils hérités de CGESN.
      const list = await fetchProfiles({ force: true });
      setProfiles(list || []);
    } catch (err) {
      setProfilesError((err && err.message) || "Impossible de charger les profils.");
    } finally {
      setProfilesLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadProfiles();
  }, [isAdmin]);

  const createAccessProfile = async () => {
    const name = newProfileName.trim();
    if (!name || creatingProfile) return;
    const profile_id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!profile_id || profiles.some(p => p.profile_id === profile_id)) {
      setProfilesError("Ce profil existe déjà ou son nom est invalide.");
      return;
    }
    setCreatingProfile(true);
    setProfilesError(null);
    try {
      await base44.entities.AccessProfile.create({ profile_id, name, description: "", apps: [], order: profiles.length + 1 });
      invalidateProfiles();
      setNewProfileName("");
      await loadProfiles();
    } catch (err) {
      setProfilesError(err?.message || "Création du profil impossible.");
    } finally {
      setCreatingProfile(false);
    }
  };

  // Coche / décoche une appli pour tout un grade
  const toggleProfileApp = async (profile, appId) => {
    const current = Array.isArray(profile.apps) ? profile.apps : [];
    const apps = current.includes(appId) ? current.filter((a) => a !== appId) : [...current, appId];
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, apps } : p)));
    setProfilesError(null);
    try {
      await base44.entities.AccessProfile.update(profile.id, { apps });
      invalidateProfiles();
      if (user && user.grade === profile.profile_id && refreshUser) refreshUser();
    } catch (err) {
      setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, apps: current } : p)));
      setProfilesError((err && err.message) || "Échec de la mise à jour du profil.");
    }
  };

  // Prestataires et consultants : deux grades sur les comptes, une seule carte et les mêmes applications ici.
  const toggleExternalApps = async (appId) => {
    const members = profiles.filter((p) => EXTERNAL_GRADES.includes(p.profile_id));
    const union = members.flatMap((p) => p.apps || []);
    const remove = union.includes(appId);
    const next = new Map(members.map((p) => {
      const others = (p.apps || []).filter((a) => a !== appId);
      return [p.id, Array.from(new Set(remove ? others : [...union.filter((a) => a !== appId), appId]))];
    }));
    const previous = profiles;
    setProfiles((prev) => prev.map((p) => (next.has(p.id) ? { ...p, apps: next.get(p.id) } : p)));
    setProfilesError(null);
    try {
      await Promise.all(members.map((p) => base44.entities.AccessProfile.update(p.id, { apps: next.get(p.id) })));
      invalidateProfiles();
      if (user && EXTERNAL_GRADES.includes(user.grade) && refreshUser) refreshUser();
    } catch (err) {
      setProfiles(previous);
      setProfilesError((err && err.message) || "Échec de la mise à jour du profil.");
      loadProfiles();
    }
  };

  // Attribue un grade : les accès individuels déjà couverts par ce grade sont retirés (doublons)
  const setUserGrade = async (userId, grade) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    const covered = profileApps(profiles, grade);
    const access = (u.access || []).filter((a) => !covered.includes(a));
    setSaving(true);
    setUsersError(null);
    try {
      const res = await base44.functions.invoke("updateUserAccess", { user_id: userId, grade, access });
      // Un compte « en attente » devient « user » dès qu'il reçoit un grade (validation)
      const roleChange = res && res.data && res.data.role_change;
      setUsers((prev) => prev.map((x) => (x.id === userId ? { ...x, grade, access, ...(roleChange ? { role: roleChange } : {}) } : x)));
      if (user && userId === user.id && refreshUser) refreshUser();
    } catch (err) {
      setUsersError((err && err.message) || "Échec de la mise à jour du grade.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  // "app" ici est une ligne de managedApps (APP_DEFS fusionné avec les entités PortalApp) :
  // elle peut ne pas encore avoir d'entité PortalApp (application jamais touchée depuis l'admin,
  // ex: ASSISTANCE, CSST) — dans ce cas on la crée au premier changement de statut.
  const toggleAppStatus = async (app) => {
    setAppsError(null);
    const newStatus = app.status === "ok" ? "off" : "ok";
    if (app.entityId) {
      setApps((prev) => prev.map((a) => (a.id === app.entityId ? { ...a, status: newStatus } : a)));
      try {
        await base44.entities.PortalApp.update(app.entityId, { status: newStatus });
      } catch (err) {
        setApps((prev) => prev.map((a) => (a.id === app.entityId ? { ...a, status: app.status } : a)));
        setAppsError((err && err.message) || "Échec de la mise à jour.");
      }
    } else {
      try {
        const created = await base44.entities.PortalApp.create({ app_id: app.app_id, name: app.name, href: app.href || "", status: newStatus });
        setApps((prev) => [...prev, created]);
      } catch (err) {
        setAppsError((err && err.message) || "Échec de la mise à jour.");
      }
    }
  };

  const removeApp = async (id) => {
    setConfirmDeleteAppId(null);
    const previous = apps;
    setApps((prev) => prev.filter((a) => a.id !== id));
    setAppsError(null);
    try {
      await base44.entities.PortalApp.delete(id);
    } catch (err) {
      setApps(previous);
      setAppsError((err && err.message) || "Échec de la suppression.");
    }
  };

  const startEditApp = (a) => {
    setConfirmDeleteAppId(null);
    setEditingAppId(a.app_id);
    setEditHref(a.href || "");
    // Seul le logo personnalisé est éditable ; vide = logo par défaut de l'application
    setEditIcon(a.customIcon || "");
  };

  const cancelEditApp = () => {
    setEditingAppId(null);
    setEditHref("");
    setEditIcon("");
  };

  const handleEditIconUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setEditUploadingIcon(true);
    setAppsError(null);
    try {
      const { file_url } = await UploadFile({ file });
      setEditIcon(file_url);
    } catch (err) {
      setAppsError((err && err.message) || "Échec de l'import du logo.");
    } finally {
      setEditUploadingIcon(false);
      e.target.value = "";
    }
  };

  // Sauvegarde le lien/logo d'une application : crée l'entité PortalApp si elle n'existait pas
  // encore (cas d'ASSISTANCE, CSST, jamais touchées depuis l'admin), sinon la met à jour.
  const saveAppEdit = async (app) => {
    const href = app.isInternal ? (app.href || "") : editHref.trim();
    const icon = editIcon.trim();
    if (!app.isInternal && href && !isHttpUrl(href)) {
      setAppsError("Le lien doit commencer par https:// (ou http://).");
      return;
    }
    setSavingEdit(true);
    setAppsError(null);
    try {
      // Une appli interne garde son statut actuel (changer son logo ne doit pas la réactiver)
      const newStatus = app.isInternal ? (app.status || "ok") : (href ? "ok" : "off");
      if (app.entityId) {
        await base44.entities.PortalApp.update(app.entityId, { href, icon, status: newStatus });
        setApps((prev) => prev.map((a) => (a.id === app.entityId ? { ...a, href, icon, status: newStatus } : a)));
      } else {
        const created = await base44.entities.PortalApp.create({ app_id: app.app_id, name: app.name, href, icon, status: newStatus });
        setApps((prev) => [...prev, created]);
      }
      setEditingAppId(null);
    } catch (err) {
      setAppsError((err && err.message) || "Échec de la mise à jour.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleIconUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadingIcon(true);
    setAppsError(null);
    try {
      const { file_url } = await UploadFile({ file });
      setNewAppIcon(file_url);
    } catch (err) {
      setAppsError((err && err.message) || "Échec de l'import du logo.");
    } finally {
      setUploadingIcon(false);
      e.target.value = "";
    }
  };

  const addApp = async () => {
    const name = newAppName.trim();
    if (!name) return;
    const app_id = name.toLowerCase().replace(/[^a-z0-9]+/g, "") + Date.now();
    const href = newAppHref.trim();
    const icon = newAppIcon.trim();
    if (href && !isHttpUrl(href)) {
      setAppsError("Le lien doit commencer par https:// (ou http://).");
      return;
    }
    setAppsError(null);
    try {
      const created = await base44.entities.PortalApp.create({ app_id, name, href, icon, status: href ? "ok" : "off" });
      setApps((prev) => [...prev, created]);
      setNewAppName("");
      setNewAppHref("");
      setNewAppIcon("");
    } catch (err) {
      setAppsError((err && err.message) || "Échec de l'ajout.");
    }
  };

  const toggleUserAccess = async (userId, appId) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    const access = (u.access || []).includes(appId)
      ? (u.access || []).filter((a) => a !== appId)
      : [...(u.access || []), appId];
    setSaving(true);
    setUsersError(null);
    try {
      await base44.functions.invoke("updateUserAccess", { user_id: userId, access });
      setUsers((prev) => prev.map((x) => (x.id === userId ? { ...x, access } : x)));
      // Ses propres accès : met à jour la session pour que le portail change tout de suite
      if (user && userId === user.id && refreshUser) refreshUser();
    } catch (err) {
      setUsersError((err && err.message) || "Échec de la mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  const setUserRole = async (userId, role) => {
    setSaving(true);
    setUsersError(null);
    try {
      await base44.entities.User.update(userId, { role });
      setUsers((prev) => prev.map((x) => (x.id === userId ? { ...x, role } : x)));
    } catch (err) {
      setUsersError((err && err.message) || "Échec de la mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (id) => {
    setConfirmDeleteId(null);
    if (id === user.id) {
      setUsersError("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }
    setSaving(true);
    setUsersError(null);
    try {
      await base44.entities.User.delete(id);
      setUsers((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setUsersError((err && err.message) || "Échec de la suppression.");
    } finally {
      setSaving(false);
    }
  };

  const addUser = async () => {
    const email = newUserEmail.trim().toLowerCase();
    if (!email) {
      setUsersError("E-mail requis.");
      return;
    }
    setSaving(true);
    setUsersError(null);
    setInviteMsg(null);
    try {
      await base44.users.inviteUser(email, newUserRole);
      const gradeToSet = newUserGrade;
      setInviteMsg(`Invitation envoyée à ${email}. L'utilisateur recevra un e-mail pour définir son mot de passe et rejoindre le portail.`);
      setNewUserEmail("");
      setNewUserRole("user");
      setNewUserGrade("");
      const list = await loadUsers();
      // Attribue le grade choisi dès l'invitation (si le compte invité apparaît déjà dans la liste)
      if (gradeToSet) {
        const invited = (list || []).find((x) => (x.email || "").toLowerCase() === email);
        if (invited) {
          await base44.functions.invoke("updateUserAccess", { user_id: invited.id, grade: gradeToSet });
          setUsers((prev) => prev.map((x) => (x.id === invited.id ? { ...x, grade: gradeToSet } : x)));
        } else {
          setInviteMsg(`Invitation envoyée à ${email}. Pensez à lui attribuer son grade quand il apparaîtra dans la liste.`);
        }
      }
    } catch (err) {
      setUsersError((err && err.message) || "Échec de l'invitation.");
    } finally {
      setSaving(false);
    }
  };

  // Invitation avec rattachement (bureau / département) et grade
  const inviteUserWithOrg = async ({ email, role, grade, office, department, access }) => {
    if (!email) {
      setUsersError("E-mail requis.");
      return false;
    }
    setSaving(true);
    setUsersError(null);
    setInviteMsg(null);
    try {
      await base44.users.inviteUser(email, role || "user");
      setInviteMsg(`Invitation envoyée à ${email}. L'utilisateur recevra un e-mail pour définir son mot de passe et rejoindre le portail.`);
      const list = await loadUsers();
      const patch = {};
      if (grade) patch.grade = grade;
      if (office) patch.office = office;
      if (department) patch.department = department;
      if (Array.isArray(access) && access.length) patch.access = access;
      if (Object.keys(patch).length) {
        const invited = (list || []).find((x) => (x.email || "").toLowerCase() === email);
        if (invited) {
          await base44.functions.invoke("updateUserAccess", { user_id: invited.id, ...patch });
          setUsers((prev) => prev.map((x) => (x.id === invited.id ? { ...x, ...patch } : x)));
        } else {
          setInviteMsg(`Invitation envoyée à ${email}. Pensez à lui attribuer son bureau, son département et son grade quand il apparaîtra dans la liste.`);
        }
      }
      return true;
    } catch (err) {
      setUsersError((err && err.message) || "Échec de l'invitation.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Applications de APP_DEFS + celles créées ici mais absentes de cgesnData.js :
  // sans ça, impossible d'accorder l'accès à une appli ajoutée via "Ajouter" ci-dessus.
  const externalMembers = profiles.filter((p) => EXTERNAL_GRADES.includes(p.profile_id));
  const adminProfileCards = profiles
    .filter((p) => !EXTERNAL_GRADES.includes(p.profile_id) || p.id === externalMembers[0]?.id)
    .map((p) => (EXTERNAL_GRADES.includes(p.profile_id)
      ? {
          ...p,
          isExternalGroup: true,
          name: "Prestataires et consultants",
          description: "Deux statuts distincts sur les comptes, avec les mêmes applications",
          apps: Array.from(new Set(externalMembers.flatMap((m) => m.apps || []))),
        }
      : p));
  const accessAppDefs = [
    ...APP_DEFS,
    ...apps
      .filter((a) => a.app_id && !isRemovedApp(a.app_id) && !APP_DEFS.some((def) => def.id === a.app_id))
      .map((a) => ({ id: a.app_id, name: a.name }))
  ];

  // Recherche (nom / e-mail) et filtre par grade dans l'onglet Utilisateurs
  const searchTerm = userSearch.trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    if (userGradeFilter === "none" && u.grade && getProfile(profiles, u.grade)) return false;
    if (userGradeFilter !== "all" && userGradeFilter !== "none" && u.grade !== userGradeFilter) return false;
    if (!searchTerm) return true;
    const hay = [u.first_name, u.last_name, u.full_name, u.email].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(searchTerm);
  });

  // Liste gérée par l'onglet Applications : toutes les applis de APP_DEFS (même celles jamais
  // touchées depuis l'admin, comme ASSISTANCE, CSST — sans ça elles n'apparaissaient
  // pas ici et étaient impossibles à activer/lier) + celles créées uniquement depuis l'admin (Google…).
  const managedApps = [
    ...APP_DEFS.map((def) => {
      const entity = apps.find((a) => a.app_id === def.id);
      const isInternal = INTERNAL_APP_IDS.includes(def.id);
      return {
        app_id: def.id,
        name: def.name,
        href: entity ? entity.href : (def.href || ""),
        icon: (entity && entity.icon) || def.icon,
        customIcon: (entity && entity.icon) || "",
        defaultIcon: def.icon,
        iconBg: entity && entity.icon ? null : def.iconBg,
        iconFit: entity && entity.icon ? "contain" : def.iconFit,
        isInternal,
        status: entity ? entity.status : (isInternal ? "ok" : (def.href ? "ok" : "off")),
        entityId: entity ? entity.id : null
      };
    }),
    ...apps
      .filter((a) => a.app_id && !isRemovedApp(a.app_id) && !APP_DEFS.some((def) => def.id === a.app_id))
      .map((a) => ({
        app_id: a.app_id,
        name: a.name,
        href: a.href,
        icon: a.icon,
        customIcon: a.icon || "",
        status: a.status,
        entityId: a.id
      }))
  ];

  const appStatusStyle = (a) => {
    const noLink = !a.isInternal && !a.href;
    const base = { padding: "6px 14px", borderRadius: 100, fontSize: "11.5px", fontWeight: 700, fontFamily: "'Poppins',sans-serif" };
    if (a.status === "ok") {
      return { ...base, border: "1px solid oklch(0.7 0.16 145)", background: "oklch(0.94 0.06 145)", color: "oklch(0.35 0.1 145)", cursor: "pointer" };
    }
    if (noLink) {
      return { ...base, border: "1px solid oklch(0.88 0.005 90)", background: "oklch(0.94 0.003 90)", color: "oklch(0.6 0.005 90)", cursor: "not-allowed" };
    }
    return { ...base, border: "1px solid oklch(0.75 0.15 75)", background: "oklch(0.94 0.06 75)", color: "oklch(0.35 0.08 60)", cursor: "pointer" };
  };

  const inputStyle = {
    flex: 1,
    minWidth: 160,
    boxSizing: "border-box",
    height: 40,
    padding: "0 14px",
    borderRadius: 10,
    border: "1px solid oklch(0.88 0.005 90)",
    fontSize: "13.5px",
    fontFamily: "'Poppins',sans-serif",
    outline: "none"
  };
  const addBtnStyle = {
    height: 40,
    padding: "0 20px",
    border: "none",
    borderRadius: 10,
    background: "#0C3D85",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Poppins',sans-serif"
  };

  return (
    <>
      <style>{`
        .cgesn-back-btn:hover{background:rgba(255,255,255,0.2) !important}
        .cgesn-admin-btn:hover{background:#0d4b43 !important}
        .cgesn-remove:hover{color:oklch(0.45 0.18 25) !important;background:oklch(0.96 0.04 25) !important;border-color:oklch(0.85 0.1 25) !important}
        .cgesn-admin-apps-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
        @media (max-width:1023px){.cgesn-admin-apps-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media (max-width:767px){.cgesn-admin-apps-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px !important}}
        @media (max-width:767px){
          .cgesn-back-hide{display:none !important}
          .cgesn-back-text{display:none !important}
          .cgesn-back-btn{padding:10px 14px !important}
          .cgesn-user-head{flex-direction:column !important;align-items:flex-start !important;gap:10px !important}
          .cgesn-user-name{width:100% !important;flex:none !important;min-width:0 !important}
          .cgesn-user-actions{width:100% !important;display:flex !important;justify-content:space-between !important;align-items:center !important;gap:8px !important}
          .cgesn-access-tags{gap:6px !important}
          .cgesn-access-tags button{padding:5px 11px !important;font-size:10.5px !important}
          .cgesn-invite-row{flex-direction:column !important;align-items:stretch !important}
          .cgesn-invite-row>input,.cgesn-invite-row>select{width:100% !important;flex:none !important;min-width:0 !important}
          .cgesn-invite-row>button,.cgesn-invite-row>label{width:100% !important;justify-content:center !important}
          .cgesn-invite-row>span{text-align:center !important}
          .cgesn-admin-app-card{padding:12px !important}
          .cgesn-admin-app-actions>button:first-child{padding:5px 10px !important;font-size:10.5px !important}
          .cgesn-tabs{gap:8px !important;flex-wrap:wrap !important}
          .cgesn-tabs button{flex:1 1 auto !important;padding:9px 12px !important;font-size:12px !important;white-space:nowrap !important}
        }
      `}</style>
      <div style={{ minHeight: "100vh", background: "oklch(0.965 0.004 90)", fontFamily: "'Poppins',Helvetica,Arial,sans-serif", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
        <BrandHeader subtitle="ADMINISTRATION" wrap>
          <Link to="/portail" className="cgesn-back-btn" style={{ textDecoration: "none", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 16px", borderRadius: 100, letterSpacing: "0.02em", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <BackArrow />
            <span className="cgesn-back-text">RETOUR</span><span className="cgesn-back-hide">AU PORTAIL</span>
          </Link>
        </BrandHeader>
        <ColorBar />

        <div style={{ flex: 1, maxWidth: 1180, margin: "0 auto", width: "100%", boxSizing: "border-box", padding: "clamp(24px,4vw,40px) clamp(20px,4vw,32px) 60px" }}>
          {isLoadingAuth ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : isAdmin ? (
            <>
              <div className="cgesn-tabs" style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                <button onClick={() => setTab("apps")} style={{ ...tabBase, ...(tab === "apps" ? tabActive : tabInactive) }}>
                  Applications
                </button>
                <button onClick={() => setTab("profiles")} style={{ ...tabBase, ...(tab === "profiles" ? tabActive : tabInactive) }}>
                  Profils
                </button>
                <button onClick={() => setTab("users")} style={{ ...tabBase, ...(tab === "users" ? tabActive : tabInactive) }}>
                  Utilisateurs
                </button>
                <button onClick={() => setTab("board")} style={{ ...tabBase, ...(tab === "board" ? tabActive : tabInactive) }}>
                  CITRAT-Board
                </button>
                <button onClick={() => setTab("bureaux")} style={{ ...tabBase, ...(tab === "bureaux" ? tabActive : tabInactive) }}>
                  Bureaux
                </button>
                <button onClick={() => setTab("departments")} style={{ ...tabBase, ...(tab === "departments" ? tabActive : tabInactive) }}>
                  Départements
                </button>
                <button onClick={() => setTab("validators")} style={{ ...tabBase, ...(tab === "validators" ? tabActive : tabInactive) }}>
                  Validateur RH
                </button>
                <button onClick={() => setTab("hseAlerts")} style={{ ...tabBase, ...(tab === "hseAlerts" ? tabActive : tabInactive) }}>
                  Alertes HSE
                </button>
                <button onClick={() => setTab("consents")} style={{ ...tabBase, ...(tab === "consents" ? tabActive : tabInactive) }}>
                  Consentements
                </button>
              </div>

              {tab === "apps" && (
                <div style={{ background: "#fff", border: "1px solid oklch(0.92 0.005 90)", borderRadius: 16, padding: "clamp(20px,3vw,28px)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "oklch(0.4 0.1 165)" }}>
                      APPLICATIONS DU PORTAIL
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.55 0.005 90)" }}>
                      {managedApps.length} application{managedApps.length > 1 ? "s" : ""}
                    </div>
                  </div>

                  {appsError && (
                    <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "oklch(0.96 0.03 25)", border: "1px solid oklch(0.85 0.1 25)", fontSize: "12.5px", fontWeight: 600, color: "oklch(0.42 0.16 25)" }}>
                      {appsError}
                    </div>
                  )}

                  {appsLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                    </div>
                  ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 22, marginBottom: 20 }}>
                  {[
                    ["internes", "Applications internes", "Développées et hébergées par CITRAT", managedApps.filter((x) => x.isInternal)],
                    ["externes", "Applications externes", "Services tiers ouverts par lien", managedApps.filter((x) => !x.isInternal)]
                  ].filter((grp) => grp[3].length > 0).map(([gKey, gTitle, gHint, gApps]) => (
                  <section key={gKey}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "oklch(0.28 0.01 90)" }}>{gTitle}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#0C3D85", background: "oklch(0.94 0.06 165)", padding: "1px 8px", borderRadius: 100 }}>{gApps.length}</span>
                      <span style={{ fontSize: 11.5, color: "oklch(0.58 0.005 90)" }}>{gHint}</span>
                    </div>
                  <div className="cgesn-admin-apps-grid" style={{ display: "grid", gap: 12 }}>
                    {gApps.map((a) => {
                      const noLink = !a.isInternal && !a.href;
                      const iconSrc = a.icon;
                      const iconBg = a.iconBg;
                      const iconFit = a.iconFit || "contain";
                      const isEditing = editingAppId === a.app_id;
                      return (
                        <div key={a.app_id} className="cgesn-admin-app-card" style={{ border: "1px solid oklch(0.91 0.005 90)", borderRadius: 12, padding: "14px", minWidth: 0, gridColumn: isEditing ? "1 / -1" : undefined }}>
                          <div className="cgesn-app-row" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: iconSrc ? (iconBg || "#fff") : (a.status === "ok" ? "linear-gradient(135deg,#0C3D85,#14806f)" : "oklch(0.92 0.005 90)"), border: iconSrc && !iconBg ? "1px solid oklch(0.91 0.005 90)" : "none", color: a.status === "ok" ? "#fff" : "oklch(0.6 0.005 90)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                              {iconSrc ? (
                                <img src={iconSrc} alt={a.name} style={{ width: "100%", height: "100%", objectFit: iconFit, display: "block" }} />
                              ) : (
                                getAppInitials(a.name)
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "oklch(0.25 0.01 90)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3 }} title={a.name}>{a.name}</div>
                              {!a.isInternal && (
                                <div title={a.href || undefined} style={{ fontSize: "11.5px", color: noLink ? "oklch(0.65 0.005 90)" : "oklch(0.5 0.005 90)", fontStyle: noLink ? "italic" : "normal", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {!noLink && <LinkIcon />}
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{a.href ? a.href.replace(/^https?:\/\//, "") : "Aucun lien"}</span>
                                </div>
                              )}
                            </div>
                            </div>
                            <div className="cgesn-admin-app-actions" style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                            {confirmDeleteAppId === a.app_id ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                <span style={{ fontSize: "11.5px", fontWeight: 600, color: "oklch(0.55 0.18 25)", whiteSpace: "nowrap" }}>Supprimer ?</span>
                                <button
                                  onClick={() => removeApp(a.entityId)}
                                  style={{ height: 28, padding: "0 10px", border: "none", borderRadius: 7, background: "oklch(0.55 0.18 25)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif" }}
                                >
                                  Oui
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteAppId(null)}
                                  style={{ height: 28, padding: "0 10px", border: "none", borderRadius: 7, background: "oklch(0.94 0.003 90)", color: "oklch(0.4 0.005 90)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif" }}
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => (noLink ? undefined : toggleAppStatus(a))} style={{ ...appStatusStyle(a), marginRight: "auto" }}>
                                  {a.status === "ok" ? "Disponible" : "Indisponible"}
                                </button>
                                {(
                                  <button
                                    onClick={() => (isEditing ? cancelEditApp() : startEditApp(a))}
                                    title={a.isInternal ? "Modifier le logo" : "Modifier"}
                                    aria-label="Modifier l'application"
                                    className="cgesn-remove"
                                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid transparent", background: isEditing ? "oklch(0.94 0.003 90)" : "none", color: isEditing ? "#0C3D85" : "oklch(0.55 0.01 90)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                                  >
                                    <PencilIcon />
                                  </button>
                                )}
                                {!a.isInternal && a.entityId && (
                                  <button
                                    onClick={() => setConfirmDeleteAppId(a.app_id)}
                                    title="Supprimer"
                                    aria-label="Supprimer l'application"
                                    className="cgesn-remove"
                                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid transparent", background: "none", color: "oklch(0.55 0.01 90)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                                  >
                                    <TrashIcon />
                                  </button>
                                )}
                              </>
                            )}
                            </div>
                          </div>

                          {isEditing && (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid oklch(0.92 0.005 90)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                              {editIcon && (
                                <img src={editIcon} alt="Aperçu du logo" style={{ width: 36, height: 36, borderRadius: 9, objectFit: "contain", border: "1px solid oklch(0.88 0.005 90)", background: "#fff", flexShrink: 0 }} />
                              )}
                              {!a.isInternal && (
                                <input
                                  type="text"
                                  value={editHref}
                                  onChange={(e) => setEditHref(e.target.value)}
                                  placeholder="https://…"
                                  style={{ ...inputStyle, minWidth: 180 }}
                                />
                              )}
                              <input
                                type="text"
                                value={editIcon}
                                onChange={(e) => setEditIcon(e.target.value)}
                                placeholder="URL du logo (optionnel)"
                                style={{ ...inputStyle, minWidth: 180 }}
                              />
                              <span style={{ fontSize: 12, color: "oklch(0.55 0.005 90)" }}>ou</span>
                              <label
                                style={{
                                  height: 40,
                                  padding: "0 14px",
                                  borderRadius: 10,
                                  border: "1px solid oklch(0.88 0.005 90)",
                                  background: "#fff",
                                  color: "oklch(0.35 0.005 90)",
                                  fontSize: 12.5,
                                  fontWeight: 700,
                                  cursor: editUploadingIcon ? "wait" : "pointer",
                                  fontFamily: "'Poppins',sans-serif",
                                  display: "flex",
                                  alignItems: "center",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {editUploadingIcon ? "Import…" : "Importer un logo"}
                                <input type="file" accept="image/*" onChange={handleEditIconUpload} disabled={editUploadingIcon} style={{ display: "none" }} />
                              </label>
                              {editIcon && (
                                <button
                                  onClick={() => setEditIcon("")}
                                  title={a.defaultIcon ? "Revenir au logo d'origine" : "Retirer le logo"}
                                  style={{ height: 40, padding: "0 14px", border: "1px solid oklch(0.88 0.005 90)", borderRadius: 10, background: "#fff", color: "oklch(0.45 0.005 90)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif", whiteSpace: "nowrap" }}
                                >
                                  {a.defaultIcon ? "Logo d'origine" : "Retirer"}
                                </button>
                              )}
                              <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                                <button
                                  onClick={() => saveAppEdit(a)}
                                  disabled={savingEdit}
                                  className="cgesn-admin-btn"
                                  style={{ height: 40, padding: "0 18px", border: "none", borderRadius: 10, background: "#0C3D85", color: "#fff", fontSize: 13, fontWeight: 700, cursor: savingEdit ? "wait" : "pointer", fontFamily: "'Poppins',sans-serif" }}
                                >
                                  {savingEdit ? "…" : "Enregistrer"}
                                </button>
                                <button
                                  onClick={cancelEditApp}
                                  style={{ height: 40, padding: "0 16px", border: "1px solid oklch(0.88 0.005 90)", borderRadius: 10, background: "#fff", color: "oklch(0.4 0.005 90)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif" }}
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  </section>
                  ))}
                  </div>
                  )}

                  <div style={{ fontSize: 12, fontWeight: 700, color: "oklch(0.3 0.01 90)", marginBottom: 10, paddingTop: 16, borderTop: "1px solid oklch(0.92 0.005 90)" }}>
                    Ajouter une application
                  </div>
                  <div className="cgesn-invite-row" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <input type="text" value={newAppName} onChange={(e) => setNewAppName(e.target.value)} placeholder="Nom de l'application" style={inputStyle} />
                    <input type="text" value={newAppHref} onChange={(e) => setNewAppHref(e.target.value)} placeholder="https://…" style={inputStyle} />
                  </div>
                  <div className="cgesn-invite-row" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                    {newAppIcon && (
                      <img src={newAppIcon} alt="Aperçu du logo" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "contain", border: "1px solid oklch(0.88 0.005 90)", background: "#fff", flexShrink: 0 }} />
                    )}
                    <input type="text" value={newAppIcon} onChange={(e) => setNewAppIcon(e.target.value)} placeholder="URL du logo (optionnel)" style={inputStyle} />
                    <span style={{ fontSize: 12, color: "oklch(0.55 0.005 90)" }}>ou</span>
                    <label
                      style={{
                        height: 40,
                        padding: "0 16px",
                        borderRadius: 10,
                        border: "1px solid oklch(0.88 0.005 90)",
                        background: "#fff",
                        color: "oklch(0.35 0.005 90)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: uploadingIcon ? "wait" : "pointer",
                        fontFamily: "'Poppins',sans-serif",
                        display: "flex",
                        alignItems: "center",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {uploadingIcon ? "Import…" : "Importer un logo"}
                      <input type="file" accept="image/*" onChange={handleIconUpload} disabled={uploadingIcon} style={{ display: "none" }} />
                    </label>
                    <button onClick={addApp} className="cgesn-admin-btn" style={addBtnStyle}>
                      Ajouter
                    </button>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11.5, color: "oklch(0.5 0.005 90)" }}>
                    Sans logo, l'application affiche ses initiales par défaut.
                  </div>
                </div>
              )}

              {tab === "apps" && (
                <div style={{ background: "#fff", border: "1px solid oklch(0.92 0.005 90)", borderRadius: 16, padding: "clamp(20px,3vw,28px)", marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "oklch(0.4 0.1 165)", marginBottom: 6 }}>
                    LOGOS DU PORTAIL
                  </div>
                  <div style={{ fontSize: 12, color: "oklch(0.5 0.005 90)", marginBottom: 18, lineHeight: 1.5 }}>
                    Les logos des applications se modifient ci-dessus (icône crayon).
                  </div>

                  {brandError && (
                    <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "oklch(0.96 0.03 25)", border: "1px solid oklch(0.85 0.1 25)", fontSize: "12.5px", fontWeight: 600, color: "oklch(0.42 0.16 25)" }}>
                      {brandError}
                    </div>
                  )}
                  {brandMsg && (
                    <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "oklch(0.95 0.06 145)", border: "1px solid oklch(0.8 0.12 145)", fontSize: "12.5px", fontWeight: 600, color: "oklch(0.35 0.1 145)" }}>
                      {brandMsg}
                    </div>
                  )}

                  {brandLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {BRAND_LOGO_SLOTS.map((slot) => {
                        const value = brandLogos[slot.key] || "";
                        const preview = value || DEFAULT_BRAND_LOGOS[slot.key];
                        const onGreen = slot.key === "header";
                        return (
                          <div key={slot.key} style={{ border: "1px solid oklch(0.91 0.005 90)", borderRadius: 12, padding: "14px 16px" }}>
                            <div className="cgesn-app-row" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                              <div style={{ width: 72, height: 72, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxSizing: "border-box", background: onGreen ? "linear-gradient(120deg,#081F69 0%,#0C3D85 60%,#081F69 100%)" : "#fff", border: onGreen ? "none" : "1px solid oklch(0.88 0.005 90)" }}>
                                <img src={preview} alt={slot.label} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 160 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "oklch(0.25 0.01 90)" }}>{slot.label}</div>
                                  {!value && (
                                    <span style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "oklch(0.5 0.005 90)", background: "oklch(0.94 0.003 90)", padding: "2px 8px", borderRadius: 100 }}>Par défaut</span>
                                  )}
                                </div>
                                <div style={{ fontSize: "12.5px", color: "oklch(0.5 0.005 90)" }}>{slot.hint}</div>
                              </div>
                            </div>
                            <div className="cgesn-invite-row" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid oklch(0.92 0.005 90)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => { const v = e.target.value; setBrandLogos((prev) => ({ ...prev, [slot.key]: v })); }}
                                placeholder="URL du logo (vide = logo par défaut)"
                                style={{ ...inputStyle, minWidth: 180 }}
                              />
                              <span style={{ fontSize: 12, color: "oklch(0.55 0.005 90)" }}>ou</span>
                              <label style={{ height: 40, padding: "0 14px", borderRadius: 10, border: "1px solid oklch(0.88 0.005 90)", background: "#fff", color: "oklch(0.35 0.005 90)", fontSize: 12.5, fontWeight: 700, cursor: brandUploading === slot.key ? "wait" : "pointer", fontFamily: "'Poppins',sans-serif", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
                                {brandUploading === slot.key ? "Import…" : "Importer un logo"}
                                <input type="file" accept="image/*" onChange={(e) => handleBrandUpload(slot.key, e)} disabled={!!brandUploading} style={{ display: "none" }} />
                              </label>
                              {value && (
                                <button
                                  onClick={() => setBrandLogos((prev) => ({ ...prev, [slot.key]: "" }))}
                                  style={{ height: 40, padding: "0 14px", border: "1px solid oklch(0.88 0.005 90)", borderRadius: 10, background: "#fff", color: "oklch(0.45 0.005 90)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif", whiteSpace: "nowrap" }}
                                >
                                  Logo d'origine
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                        <button onClick={loadBrandLogos} disabled={brandSaving} style={{ height: 40, padding: "0 16px", border: "1px solid oklch(0.88 0.005 90)", borderRadius: 10, background: "#fff", color: "oklch(0.4 0.005 90)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Poppins',sans-serif" }}>
                          Annuler
                        </button>
                        <button onClick={submitBrandLogos} disabled={brandSaving || !!brandUploading} className="cgesn-admin-btn" style={{ ...addBtnStyle, cursor: brandSaving ? "wait" : "pointer" }}>
                          {brandSaving ? "…" : "Enregistrer les logos"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "bureaux" && (
                <BureauxManager />
              )}

              {tab === "departments" && (
                <DepartementsManager />
              )}

              {tab === "validators" && (
                <WorkflowValidatorsManager />
              )}

              {tab === "hseAlerts" && (
                <HseAlertRecipientsManager users={users} profiles={profiles} />
              )}

              {tab === "consents" && (
                <ConsentementsManager />
              )}

              {tab === "profiles" && (
                <div style={{ background: "#fff", border: "1px solid oklch(0.92 0.005 90)", borderRadius: 16, padding: "clamp(20px,3vw,28px)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "oklch(0.4 0.1 165)", marginBottom: 6 }}>
                    PROFILS D'ACCÈS PAR GRADE
                  </div>
                  <div style={{ fontSize: "12.5px", color: "oklch(0.5 0.005 90)", marginBottom: 18, lineHeight: 1.5 }}>
                    Cochez les applications de chaque grade. Tous les utilisateurs de ce grade y ont accès automatiquement, et un changement ici s'applique à tous en une fois.
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 18 }}>
                    <input
                      type="text"
                      aria-label="Nom du nouveau profil"
                      placeholder="Nouveau profil (ex. Géomètre expert)"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") createAccessProfile(); }}
                      style={{ padding: "10px 12px", border: "1px solid #d6dce5", borderRadius: 10, flex: "1 1 220px", minWidth: 0 }}
                    />
                    <button type="button" onClick={createAccessProfile} disabled={creatingProfile || !newProfileName.trim()}
                      style={{ padding: "10px 16px", color: "#fff", border: 0, background: "#0C3D85", borderRadius: 10, cursor: "pointer", opacity: creatingProfile ? 0.6 : 1 }}>
                      {creatingProfile ? "Création…" : "+ Créer un profil"}
                    </button>
                  </div>
                  {!profilesLoading && profiles.length === 0 && (
                    <div style={{ background: "#F3F8FC", color: "#23416b", padding: 16, borderRadius: 10, marginBottom: 16 }}>
                      Aucun profil configuré pour ce client. Créez votre premier profil ci-dessus.
                    </div>
                  )}

                  {profilesError && (
                    <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "oklch(0.96 0.03 25)", border: "1px solid oklch(0.85 0.1 25)", fontSize: "12.5px", fontWeight: 600, color: "oklch(0.42 0.16 25)" }}>
                      {profilesError}
                    </div>
                  )}

                  {profilesLoading && profiles.length === 0 ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <OrgTiles label="Grades">
                        {adminProfileCards.map((p) => {
                          const pApps = Array.isArray(p.apps) ? p.apps : [];
                          const nApps = pApps.filter((id) => accessAppDefs.some((a) => a.id === id)).length;
                          const count = users.filter((u) => (p.isExternalGroup ? EXTERNAL_GRADES.includes(u.grade) : u.grade === p.profile_id)).length;
                          const on = profileTile === p.id;
                          const isAdmin = p.profile_id === "administration";
                          return (
                            <OrgTile
                              key={p.id}
                              label={p.name}
                              sub={p.description}
                              icon={isAdmin ? "shield" : p.isExternalGroup ? "users" : "user"}
                              variant={isAdmin ? "admin" : undefined}
                              value={count}
                              unit={`utilisateur${count > 1 ? "s" : ""}`}
                              progress={accessAppDefs.length ? (nApps / accessAppDefs.length) * 100 : 0}
                              progressLabel="Applications accordées"
                              stats={[{ label: "Applications", value: `${nApps} / ${accessAppDefs.length}` }]}
                              active={on}
                              muted={!count && !isAdmin}
                              onClick={() => setProfileTile(on ? "" : p.id)}
                            />
                          );
                        })}
                      </OrgTiles>
                      {adminProfileCards.filter((p) => p.id === profileTile).map((p) => {
                        const pApps = Array.isArray(p.apps) ? p.apps : [];
                        const members = users.filter((u) => (p.isExternalGroup ? EXTERNAL_GRADES.includes(u.grade) : u.grade === p.profile_id));
                        const count = members.length;
                        return (
                          <div key={p.id} style={{ border: "1px solid oklch(0.91 0.005 90)", borderRadius: 14, padding: "16px 18px" }}>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                              <div>
                                <div style={{ fontSize: "14px", fontWeight: 700, color: "oklch(0.25 0.01 90)" }}>{p.name}</div>
                                {p.description && <div style={{ fontSize: 12, color: "oklch(0.55 0.005 90)" }}>{p.description}</div>}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: "11.5px", fontWeight: 600, color: "oklch(0.5 0.005 90)", whiteSpace: "nowrap" }}>
                                  {count} utilisateur{count > 1 ? "s" : ""} • {pApps.filter((id) => accessAppDefs.some((a) => a.id === id)).length}/{accessAppDefs.length} applis
                                </span>
                                <button type="button" onClick={() => setProfileTile("")} style={{ height: 30, padding: "0 12px", borderRadius: 10, border: "1px solid oklch(0.88 0.005 90)", background: "#fff", color: "oklch(0.45 0.005 90)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins',sans-serif" }}>Fermer</button>
                              </div>
                            </div>
                            <div className="cgesn-access-tags" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {accessAppDefs.map((a) => {
                                const has = pApps.includes(a.id);
                                return (
                                  <button
                                    key={a.id}
                                    onClick={() => (p.isExternalGroup ? toggleExternalApps(a.id) : toggleProfileApp(p, a.id))}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: 100,
                                      border: `1px solid ${has ? "#0C3D85" : "oklch(0.88 0.005 90)"}`,
                                      background: has ? "#0C3D85" : "#fff",
                                      color: has ? "#fff" : "oklch(0.4 0.005 90)",
                                      fontSize: "11.5px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      fontFamily: "'Poppins',sans-serif"
                                    }}
                                  >
                                    {a.name}
                                  </button>
                                );
                              })}
                            </div>
                            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid oklch(0.95 0.003 90)" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "oklch(0.55 0.005 90)", marginBottom: 8 }}>Utilisateurs de ce grade</div>
                              {members.length ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {members.map((u) => (
                                    <span key={u.id} title={u.email} style={{ padding: "4px 10px", borderRadius: 100, background: "oklch(0.975 0.003 90)", border: "1px solid oklch(0.92 0.004 90)", fontSize: 12, color: "oklch(0.3 0.01 90)" }}>
                                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.full_name || u.email}
                                    </span>
                                  ))}
                                </div>
                              ) : <div style={{ fontSize: 12, color: "oklch(0.55 0.005 90)" }}>Aucun utilisateur pour l'instant.</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {tab === "board" && (
                <BoardUsersManager users={users} setUsers={setUsers} currentUser={user} refreshUser={refreshUser} />
              )}

              {tab === "users" && (
                <UsersByOrgManager
                  users={users}
                  setUsers={setUsers}
                  profiles={profiles}
                  accessAppDefs={accessAppDefs}
                  loading={usersLoading}
                  saving={saving}
                  setSaving={setSaving}
                  error={usersError}
                  setError={setUsersError}
                  inviteMsg={inviteMsg}
                  currentUser={user}
                  refreshUser={refreshUser}
                  onSetGrade={setUserGrade}
                  onSetRole={setUserRole}
                  onToggleAccess={toggleUserAccess}
                  onRemove={removeUser}
                  onInvite={inviteUserWithOrg}
                />
              )}
            </>
          ) : (
            <div style={{ maxWidth: 420, margin: "60px auto 0", background: "#fff", border: "1px solid oklch(0.92 0.005 90)", borderRadius: 16, padding: "clamp(28px,4vw,36px)", textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "oklch(0.25 0.01 90)", marginBottom: 8 }}>Accès réservé au super administrateur</div>
              <div style={{ fontSize: 13, color: "oklch(0.5 0.005 90)", marginBottom: 20, lineHeight: 1.5 }}>
                Votre compte ne dispose pas des droits de super administrateur pour gérer les applications et les utilisateurs.
              </div>
              <Link
                to="/portail"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                  height: 40,
                  padding: "0 20px",
                  borderRadius: 10,
                  background: "#0C3D85",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Poppins',sans-serif"
                }}>
                <BackArrow />
                RETOUR AU PORTAIL
              </Link>
            </div>
          )}
        </div>

        <SiteFooter />
      </div>
    </>
  );
}