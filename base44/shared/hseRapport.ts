// Rapports trimestriels HSE-PRESFOR : règles communes (droits, période, fiches et photos du trimestre).

export const ZONES = ["Worodougou", "Cavally"];
export const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const MAX_PHOTOS = 60;

const norm = (v: unknown) => String(v || "").trim().toLowerCase();

/** Droits d'un utilisateur selon son profil HSE (entité ResponsableHSE). */
export async function hsePerms(client: any, user: any) {
  if (!user) return { canPrepare: false, canValidate: false, canView: false, profil: null };
  const admin = user.role === "admin";
  let profil: string | null = null;
  try {
    const rows = await client.asServiceRole.entities.ResponsableHSE.list("nom", 500);
    profil = (rows || []).find((r: any) => norm(r.email) === norm(user.email))?.profil || null;
  } catch { /* liste indisponible : seuls les administrateurs passent */ }
  const canPrepare = admin || profil === "Référent HSE";
  const canValidate = admin || profil === "Coordinateur HSE" || profil === "Chef de projet HSE";
  return { canPrepare, canValidate, canView: canPrepare || canValidate, profil, admin };
}

/** Bornes du trimestre civil (dates ISO incluses). */
export function quarterBounds(annee: number, trimestre: number) {
  const m1 = (trimestre - 1) * 3; // 0, 3, 6, 9
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(annee, m1 + 3, 0)).getUTCDate();
  return {
    start: `${annee}-${pad(m1 + 1)}-01`,
    end: `${annee}-${pad(m1 + 3)}-${pad(lastDay)}`,
    label: `${trimestre === 1 ? "1er" : trimestre + "e"} trimestre ${annee} (${MOIS[m1]} - ${MOIS[m1 + 2]})`,
    short: `T${trimestre} ${annee}`,
  };
}

export function nextQuarter(annee: number, trimestre: number) {
  return trimestre === 4 ? { annee: annee + 1, trimestre: 1 } : { annee, trimestre: trimestre + 1 };
}
export function previousQuarter(annee: number, trimestre: number) {
  return trimestre === 1 ? { annee: annee - 1, trimestre: 4 } : { annee, trimestre: trimestre - 1 };
}

/** Date de rattachement d'une fiche : date de l'événement, à défaut date de déclaration. */
export const eventDate = (e: any) => String(e.date_event || e.declaration_date || "").slice(0, 10);

/** Fiches du trimestre pour les zones choisies. Une fiche sans zone n'entre que si toutes les zones sont retenues. */
export function filterEvents(events: any[], rapport: any) {
  const { start, end } = quarterBounds(rapport.annee, rapport.trimestre);
  const zones = rapport.zones?.length ? rapport.zones : ZONES;
  const allZones = ZONES.every((z) => zones.includes(z));
  return (events || []).filter((e) => {
    const d = eventDate(e);
    if (!d || d < start || d > end) return false;
    return e.zone ? zones.includes(e.zone) : allZones;
  });
}

const fmt = (iso: string) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "");

/**
 * Photos candidates pour l'annexe : photos jointes aux fiches du trimestre, puis photos de la galerie
 * datées du trimestre (et de la zone si elle est renseignée). Chaque photo a une clé stable.
 */
export async function photoCandidates(client: any, rapport: any, events: any[]) {
  const list: any[] = [];
  const sorted = [...events].sort((a, b) => (a.fiche_number || 0) - (b.fiche_number || 0));
  for (const e of sorted) {
    (e.photos || []).forEach((url: string, i: number) => {
      if (!url) return;
      list.push({
        key: url, url, source: "fiche", fiche_number: e.fiche_number,
        legende: `Fiche N°${e.fiche_number}${e.reference ? " (" + e.reference + ")" : ""} - ${e.event_type || ""} du ${fmt(eventDate(e))}${e.location ? " - " + e.location : ""}${(e.photos || []).length > 1 ? " - photo " + (i + 1) : ""}`,
        groupe: `Fiche N°${e.fiche_number}`,
      });
    });
  }
  const { start, end } = quarterBounds(rapport.annee, rapport.trimestre);
  const zones = rapport.zones?.length ? rapport.zones : ZONES;
  try {
    const gallery = await client.asServiceRole.entities.Photo.list("date_photo", 1000);
    const core = client.asServiceRole.integrations.Core;
    const inPeriod = (gallery || []).filter((p: any) => {
      const d = String(p.date_photo || "").slice(0, 10);
      return d && d >= start && d <= end && (!p.zone || zones.includes(p.zone));
    });
    for (const p of inPeriod) {
      let url = p.image_url;
      if (p.hse_private_uri) {
        try { url = (await core.CreateFileSignedUrl({ file_uri: p.hse_private_uri, expires_in: 3600 })).signed_url; }
        catch { continue; }
      }
      if (!url || !/^https:/.test(url)) continue;
      list.push({
        key: "photo:" + p.id, url, source: "galerie",
        legende: `${p.title || "Photo"} - ${p.incident_type || ""}${p.category ? " / " + p.category : ""} - ${fmt(String(p.date_photo).slice(0, 10))}`,
        groupe: "Galerie photos",
      });
    }
  } catch { /* galerie indisponible : photos des fiches seulement */ }
  return list;
}

/** Contenu par défaut d'un nouveau rapport (repris du rapport validé du trimestre précédent s'il existe). */
export function defaultContent(annee: number, trimestre: number, previous: any | null) {
  const nq = nextQuarter(annee, trimestre);
  const nb = quarterBounds(nq.annee, nq.trimestre);
  const prevRecs = previous?.recommandations?.length
    ? previous.recommandations
    : [
      "Fourniture immédiate d'EPI à tous les agents terrain",
      "Renforcement des contrôles techniques des motos et véhicules",
      "Signalisation temporaire des zones dangereuses (Worodougou et Cavally)",
      "Coordination formalisée avec les services de voirie et mairies",
      "Formation spécifique à la conduite sur terrains boueux et routes dégradées",
    ];
  return {
    zones: previous?.zones?.length ? previous.zones : [...ZONES],
    statut: "Brouillon",
    deces_invalidite: false,
    recommandations_precedentes: prevRecs.map((texte: string) => ({ texte, etat: "En cours" })),
    progres: previous?.progres ?? [
      "Déclaration systématique des incidents par les agents de terrain",
      "Prise de conscience collective des enjeux sécurité dans les deux zones",
      "Mise en place progressive d'une culture de reporting HSE",
    ].join("\n"),
    risques: previous?.risques ?? [
      "État dégradé des infrastructures routières (zones Worodougou et Cavally)",
      "Comportements à risque des tiers (usagers de la route, ouvriers)",
      "Conditions météorologiques défavorables en saison des pluies",
      "Défaillances mécaniques des véhicules et motos",
    ].join("\n"),
    recommandations: [...prevRecs],
    pae_ppsps: [],
    pae_synthese: "",
    planification: [{ activite: "", periode: nb.short, responsable: "", budget: "" }],
    inclure_fiches: true,
    inclure_photos: true,
    photos_par_page: 4,
    photos_exclues: [],
    modifie_apres_pdf: false,
  };
}
