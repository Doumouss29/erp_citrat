import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

// Progression CSST (scores, certificats, nom du participant) enregistrée en base sur le compte
// de l'utilisateur (entité CsstProgress) : elle survit aux actualisations, aux changements de
// navigateur ou d'appareil. Une copie locale sert seulement à l'affichage immédiat.

const EMPTY = { terrain: null, route: null, ergonomie: null, isole: null };
const LS = { scores: "csst_scores", certificates: "csst_certificates", name: "csst_participant_name" };

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* mode privé */ }
}

// Fusion prudente : on garde le meilleur score et tout certificat déjà obtenu.
function mergeScores(a = {}, b = {}) {
  const out = { ...EMPTY };
  Object.keys(EMPTY).forEach((k) => {
    const x = a[k], y = b[k];
    out[k] = x == null ? (y ?? null) : y == null ? x : Math.max(x, y);
  });
  return out;
}
function mergeCerts(server = {}, local = {}) {
  const out = { ...EMPTY };
  Object.keys(EMPTY).forEach((k) => { out[k] = server[k] || local[k] || null; });
  return out;
}

// Nom du compte au format du certificat : « NOM PRÉNOM » en majuscules
export function accountDisplayName(u) {
  if (!u) return "";
  const parts = [u.last_name, u.first_name].map((x) => (x || "").trim()).filter(Boolean);
  const name = parts.length ? parts.join(" ") : (u.full_name || "").trim();
  return name.toUpperCase();
}

export function useCsstProgress() {
  const [scores, setScores] = useState(() => mergeScores(readLocal(LS.scores, EMPTY), {}));
  const [certificates, setCertificates] = useState(() => mergeCerts({}, readLocal(LS.certificates, EMPTY)));
  const [participantName, setParticipantName] = useState(() => readLocal(LS.name, ""));
  const [loaded, setLoaded] = useState(false);

  const recordId = useRef(null);
  const email = useRef(null);
  const saveTimer = useRef(null);

  // Chargement depuis la base (et migration des résultats déjà présents dans ce navigateur)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!me || !me.email) return;
        email.current = me.email.toLowerCase();
        const accountName = accountDisplayName(me);
        const list = await base44.entities.CsstProgress.filter({ user_email: email.current });
        const rec = list && list[0];
        const localScores = readLocal(LS.scores, EMPTY);
        const localCerts = readLocal(LS.certificates, EMPTY);
        const localName = readLocal(LS.name, "");
        if (!alive) return;
        if (rec) {
          recordId.current = rec.id;
          setScores(mergeScores(rec.scores || {}, localScores));
          setCertificates(mergeCerts(rec.certificates || {}, localCerts));
          setParticipantName(rec.participant_name || accountName || localName || "");
        } else {
          const created = await base44.entities.CsstProgress.create({
            user_email: email.current,
            scores: mergeScores(localScores, {}),
            certificates: mergeCerts({}, localCerts),
            participant_name: accountName || localName || "",
          });
          recordId.current = created && created.id;
          setParticipantName(accountName || localName || "");
        }
      } catch (e) {
        // Hors connexion ou erreur : on reste sur la copie locale
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Copie locale immédiate + enregistrement en base (regroupé, 600 ms après le dernier changement)
  useEffect(() => {
    writeLocal(LS.scores, scores);
    writeLocal(LS.certificates, certificates);
    writeLocal(LS.name, participantName);
    if (!loaded || !email.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const data = { user_email: email.current, scores, certificates, participant_name: participantName || "" };
      try {
        if (recordId.current) {
          await base44.entities.CsstProgress.update(recordId.current, data);
        } else {
          const created = await base44.entities.CsstProgress.create(data);
          recordId.current = created && created.id;
        }
      } catch (e) { /* nouvel essai au prochain changement */ }
    }, 600);
    // Pas d'annulation au démontage : le dernier changement est enregistré même si on quitte la page aussitôt
  }, [scores, certificates, participantName, loaded]);

  return { scores, setScores, certificates, setCertificates, participantName, setParticipantName, loaded };
}
