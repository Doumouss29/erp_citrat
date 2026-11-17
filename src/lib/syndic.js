// COPROCIV — module Syndic : gestion du syndicat des copropriétaires.
// Loi n° 2019-576 du 26 juin 2019, Livre 2, Titre 1, Sous-titre 1 :
//   art. 380-382 syndicat · 386-389 assemblée générale · 390 droit de consultation
//   392-393 conseil syndical · 394-401 syndic · 397 plafond de 30 % · 402-406 cotisations,
//   recouvrement, compte séparé · 407 arbitrage (45 jours) · 417 extrait pour bail · 513-518 diagnostics.
import { compute, alloc, n0 } from '@/lib/engine';

export const SYNDIC_DEF = () => ({
  syndicat: { dateConstitution: '', banque: '', compte: '', intitule: '' },
  syndic: { nom: '', agrement: '', arrete: '', dateDesignation: '', cabinetRecouvrement: '' },
  conseil: { membres: [], dateDesignation: '', duree: '', pvMinistere: '', pvMairie: '' },
  exercices: {},
  occupants: {},
  appels: [],
  paiements: [],
  relances: [],
  depenses: [],
  ags: [],
  litiges: [],
  diagnostics: [],
  remises: {}
});
export const withDefaults = sy => { const d = SYNDIC_DEF(); return { ...d, ...(sy || {}), syndicat: { ...d.syndicat, ...((sy || {}).syndicat || {}) }, syndic: { ...d.syndic, ...((sy || {}).syndic || {}) }, conseil: { ...d.conseil, ...((sy || {}).conseil || {}) } }; };

// Catégories de postes budgétaires. « remu », « commission » et « appui » entrent dans le plafond de 30 % (art. 397).
export const CATS = [
  ['entretien', 'Entretien et conservation'],
  ['services', 'Services et fournitures'],
  ['travaux', 'Grosses réparations (cotisation spéciale)'],
  ['remu', 'Rémunération du syndic'],
  ['commission', 'Commissions'],
  ['appui', 'Appuis divers']
];
export const PLAFONDES = ['remu', 'commission', 'appui'];
// Postes types issus des missions du syndicat (art. 382).
export const POSTES_TYPES = [
  ['Ravalement et entretien des façades', 'entretien'], ['Assainissement, eau et drainage', 'entretien'], ['Entretien des espaces verts', 'entretien'],
  ['Sécurité et gardiennage', 'services'], ['Ramassage des ordures', 'services'], ['Éclairage des parties communes', 'services'],
  ['Entretien des ascenseurs', 'entretien'], ['Groupe électrogène (carburant, entretien)', 'services'], ['Eau des parties communes', 'services'],
  ['Assurance de l’immeuble', 'services'], ['Hygiène et salubrité', 'services'], ['Rémunération du syndic', 'remu']
];

// Objets de délibération de l'assemblée générale (art. 387) et règle de majorité par défaut.
export const ODJ = [
  ['reglement', 'Adoption ou modification du règlement de copropriété', 'voix'],
  ['classification', 'Modification de la classification parties communes / parties privatives', 'voix'],
  ['destruction', 'Destruction de l’immeuble', 'voix'],
  ['pc', 'Décision relative aux parties communes', 'voix'],
  ['charges', 'Détermination ou modification des charges', 'voix'],
  ['conseil', 'Désignation des membres du conseil syndical', 'voix'],
  ['syndic', 'Désignation du syndic', 'voix'],
  ['revocation', 'Destitution du syndic pour motif légitime (art. 400)', 'membres'],
  ['cotisations', 'Fixation des cotisations mensuelles ordinaires', 'voix'],
  ['speciales', 'Cotisations spéciales pour grosses réparations', 'voix'],
  ['ressources', 'Emploi des ressources du syndicat', 'voix'],
  ['remuneration', 'Fixation de la rémunération du syndic', 'voix'],
  ['budget', 'Approbation du budget', 'voix'],
  ['comptes', 'Approbation des comptes', 'voix'],
  ['recouvrement', 'Désignation d’un cabinet de recouvrement (art. 404)', 'voix'],
  ['accessoires', 'Droits accessoires : surélévation, construction, excavation (art. 385)', 'voix'],
  ['autre', 'Autre question', 'voix']
];
export const odjLabel = k => (ODJ.find(o => o[0] === k) || ['', k])[1];

const pad = n => String(n).padStart(2, '0');
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const fmtDate = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR') : '—';
export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const periodeLabel = p => { const [y, m] = String(p).split('-'); return MOIS[+m - 1] + ' ' + y; };
export const uid = p => (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------- Cotisations ----------
// Pour chaque poste : montant annuel / 12, réparti au plus fort reste selon sa clé
// (tantièmes généraux, ou quotes-parts d'une grille de charges spéciales).
export function cotisations(s, sy, annee, c) {
  c = c || compute(s);
  const ex = (sy.exercices || {})[annee] || { postes: [] };
  const lots = c.rows.map(r => r.id);
  const parLot = Object.fromEntries(lots.map(id => [id, { total: 0, detail: [] }]));
  let totalMensuel = 0, plafonne = 0, annuel = 0;
  (ex.postes || []).forEach(p => {
    const mensuel = Math.round(n0(p.montant) / 12);
    annuel += n0(p.montant);
    totalMensuel += mensuel;
    if (PLAFONDES.includes(p.cat)) plafonne += n0(p.montant);
    let w;
    if (!p.cle || p.cle === 'gen') w = c.rows.map(r => r.tg);
    else { const G = c.g[p.cle] || { shares: {} }; w = c.rows.map(r => G.shares[r.id] || 0); }
    const a = alloc(w, mensuel);
    c.rows.forEach((r, i) => { if (a[i]) { parLot[r.id].total += a[i]; parLot[r.id].detail.push({ poste: p.lib, montant: a[i] }); } });
  });
  const taux = annuel ? plafonne / annuel : 0;
  return { parLot, totalMensuel, annuel, plafonne, taux, plafondOk: taux <= 0.30 + 1e-9 };
}

// ---------- Comptes des lots ----------
export function comptes(s, sy, at) {
  at = at || today();
  const c = compute(s);
  const out = {};
  c.rows.forEach(r => { out[r.id] = { du: 0, appele: 0, paye: 0, solde: 0, enRetard: false, dernierAppel: null }; });
  (sy.appels || []).forEach(a => { const o = out[a.lotId]; if (!o) return; o.appele += n0(a.montant); if (a.echeance <= at) o.du += n0(a.montant); if (!o.dernierAppel || a.periode > o.dernierAppel) o.dernierAppel = a.periode; });
  (sy.paiements || []).forEach(p => { const o = out[p.lotId]; if (o) o.paye += n0(p.montant); });
  Object.values(out).forEach(o => { o.solde = o.du - o.paye; o.enRetard = o.solde > 0; });
  return out;
}
// Copropriétaire à jour : tous ses lots sans arriéré échu.
export const ownerAJour = (s, cpt, ownerId) => (s.lots || []).filter(l => l.owner === ownerId).every(l => !(cpt[l.id] || {}).enRetard);

// ---------- Votes ----------
// Poids d'un copropriétaire : tantièmes généraux de ses lots, ou quotes-parts de la grille (charges spéciales).
export function poids(s, c, ownerId, cle) {
  const lots = c.rows.filter(r => r.owner === ownerId);
  if (!cle || cle === 'gen') return lots.reduce((a, r) => a + r.tg, 0);
  const G = c.g[cle] || { shares: {} };
  return lots.reduce((a, r) => a + (G.shares[r.id] || 0), 0);
}
export function quorumAG(s, c, ag) {
  const owners = (s.owners || []).filter(o => c.rows.some(r => r.owner === o.id));
  const pres = owners.filter(o => ['present', 'represente'].includes((ag.presences || {})[o.id]));
  const voix = pres.reduce((a, o) => a + poids(s, c, o.id, 'gen'), 0);
  const total = owners.reduce((a, o) => a + poids(s, c, o.id, 'gen'), 0);
  const seuil = n0(ag.quorum ?? 50) / 100;
  return { voix, total, ratio: total ? voix / total : 0, atteint: total ? voix / total >= seuil - 1e-9 : false, presents: pres.length, inscrits: owners.length };
}
export function resultat(s, c, ag, res) {
  const owners = (s.owners || []).filter(o => c.rows.some(r => r.owner === o.id));
  const pres = owners.filter(o => ['present', 'represente'].includes((ag.presences || {})[o.id]));
  const v = res.votes || {};
  if (res.regle === 'membres') {
    // Majorité des membres présents (art. 400) : plus de la moitié des copropriétaires présents votent pour.
    const presents = owners.filter(o => (ag.presences || {})[o.id] === 'present');
    const pour = presents.filter(o => v[o.id] === 'pour').length;
    const contre = presents.filter(o => v[o.id] === 'contre').length;
    const abst = presents.length - pour - contre;
    return { regle: 'majorité des membres présents', pour, contre, abst, unite: 'membres', base: presents.length, adoptee: presents.length > 0 && pour > presents.length / 2 };
  }
  const concernes = pres.filter(o => poids(s, c, o.id, res.cle) > 0);
  const sum = k => concernes.filter(o => v[o.id] === k).reduce((a, o) => a + poids(s, c, o.id, res.cle), 0);
  const pour = sum('pour'), contre = sum('contre');
  const abst = concernes.reduce((a, o) => a + poids(s, c, o.id, res.cle), 0) - pour - contre;
  return { regle: 'majorité des voix exprimées des présents et représentés', pour, contre, abst, unite: 'tantièmes', base: pour + contre, adoptee: pour > contre };
}

// ---------- Contrôles de conformité ----------
export function controles(s, sy) {
  const c = compute(s);
  const cpt = comptes(s, sy);
  const an = String(new Date().getFullYear());
  const cot = cotisations(s, sy, an, c);
  const cs = sy.conseil || {};
  const membresAJour = (cs.membres || []).filter(id => ownerAJour(s, cpt, id));
  const litRetard = (sy.litiges || []).filter(l => l.statut !== 'clos' && l.dateSaisine && addDays(l.dateSaisine, 45) < today());
  return [
    { ok: !!((sy.syndicat || {}).compte || '').trim(), t: 'Compte bancaire séparé du syndicat renseigné', ref: 'art. 406' },
    { ok: !!((sy.syndic || {}).agrement || '').trim(), t: 'Syndic agréé (n° d’agrément)', ref: 'art. 396' },
    { ok: !!((sy.syndic || {}).arrete || '').trim(), t: 'Arrêté ministériel entérinant la désignation du syndic', ref: 'art. 396' },
    { ok: (cs.membres || []).length >= 3, t: `Conseil syndical d’au moins 3 copropriétaires (${(cs.membres || []).length})`, ref: 'art. 392' },
    { ok: membresAJour.length === (cs.membres || []).length, t: 'Membres du conseil à jour de leurs cotisations', ref: 'art. 392' },
    { ok: !!(cs.pvMinistere && cs.pvMairie), t: 'PV de désignation du conseil transmis au ministère et à la mairie', ref: 'art. 392' },
    { ok: !cot.annuel || cot.plafondOk, t: `Rémunération du syndic, commissions et appuis ≤ 30 % des cotisations ${an} (${Math.round(cot.taux * 1000) / 10} %)`, ref: 'art. 397' },
    { ok: !!cot.annuel, t: `Budget ${an} établi`, ref: 'art. 395' },
    { ok: !litRetard.length, t: litRetard.length ? `${litRetard.length} litige(s) au-delà du délai d’arbitrage de 45 jours` : 'Litiges dans le délai d’arbitrage', ref: 'art. 407' }
  ];
}
