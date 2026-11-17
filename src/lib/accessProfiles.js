import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Accès aux applications = applis du grade (profil AccessProfile) + accès supplémentaires
// accordés individuellement (User.access).

let cache = null;      // dernière liste connue
let pending = null;    // requête en cours

export function fetchProfiles({ force = false } = {}) {
  if (cache && !force) return Promise.resolve(cache);
  if (!pending) {
    pending = base44.entities.AccessProfile.list("order")
      .then((list) => { cache = list || []; return cache; })
      .catch(() => cache || [])
      .finally(() => { pending = null; });
  }
  return pending;
}

// Deux grades distincts pour les externes. Les applications cochées sur chaque grade sont conservées.
const EXTERNAL_PROFILES = [
  { profile_id: "prestataire", name: "Prestataires", description: "Externes : prestataires", order: 100 },
  { profile_id: "consultant", name: "Consultants", description: "Externes : consultants", order: 101 },
];

export async function ensureExternalProfiles() {
  for (const profile of EXTERNAL_PROFILES) {
    const [existing] = await base44.entities.AccessProfile.filter({ profile_id: profile.profile_id });
    if (!existing) {
      await base44.entities.AccessProfile.create({ ...profile, apps: [] });
    } else if (existing.name !== profile.name || existing.description !== profile.description) {
      await base44.entities.AccessProfile.update(existing.id, { name: profile.name, description: profile.description });
    }
  }
}

export function invalidateProfiles() {
  cache = null;
}

export function getProfile(profiles, gradeId) {
  return (profiles || []).find((p) => p.profile_id === gradeId) || null;
}

export function profileApps(profiles, gradeId) {
  const p = getProfile(profiles, gradeId);
  return p && Array.isArray(p.apps) ? p.apps : [];
}

export function extraApps(user) {
  return user && Array.isArray(user.access) ? user.access : [];
}

export function effectiveAccess(user, profiles) {
  if (!user) return [];
  return Array.from(new Set([...profileApps(profiles, user.grade), ...extraApps(user)]));
}

// Hook : accès effectifs de l'utilisateur donné (profils rechargés à chaque montage)
export function useEffectiveAccess(user) {
  const [profiles, setProfiles] = useState(cache);
  useEffect(() => {
    let alive = true;
    fetchProfiles({ force: true }).then((list) => { if (alive) setProfiles(list); });
    return () => { alive = false; };
  }, []);
  return { access: effectiveAccess(user, profiles || []), loading: profiles === null, profiles: profiles || [] };
}
