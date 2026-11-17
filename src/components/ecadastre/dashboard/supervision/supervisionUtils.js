import { format, subDays, startOfWeek, parseISO, differenceInCalendarDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PHOTO_FIELDS } from '@/utils/ecadastre/collectePhotos';

// Champs légers chargés pour le tableau de bord (≈ 0,3 Ko par fiche au lieu de 200-400 Ko)
export const DASH_FIELDS = [
  'id', 'commune', 'section', 'parcelle', 'lot', 'ilot', 'statut',
  'date_collecte', 'created_date', 'created_by', 'created_by_id', 'signature_agent',
];

export const CONVOC_FIELDS = ['id', 'commune', 'section', 'parcelle', 'lot', 'ilot', 'statut', 'created_date', 'created_by_id'];

// Champs pour l'export CSV / GeoJSON : tout sauf les photos et signatures dessinées
const ALL_COLLECTE_FIELDS = [
  'id', 'organisation_id', 'reference_dgi', 'statut', 'commune', 'section', 'parcelle', 'code_exemption', 'annee_acq',
  'nature', 'surface_imposable', 'valeur_venale', 'code_vv', 'quartier', 'code_quartier', 'lot', 'ilot', 'tf',
  'num_appartement', 'niveau_appartement', 'longitude', 'latitude', 'type_proprietaire', 'prop_nom', 'prop_prenoms',
  'prop_date_naissance', 'prop_lieu_naissance', 'prop_sous_prefecture', 'prop_pays', 'prop_carte_identite',
  'prop_nationalite', 'prop_autre_piece', 'prop_autre_piece_numero', 'prop_compte_contribuable', 'prop_nom_pere',
  'prop_nom_mere', 'prop_adresse_postale', 'prop_bp', 'prop_ville', 'prop_quartier_residence', 'prop_tel',
  'prop_adresse_tf', 'prop_infos_complementaires', 'prop_signature_date', 'situation_familiale', 'nombre_enfants',
  'prof_profession', 'prof_service_employeur', 'prof_adresse_postale', 'prof_bp', 'prof_ville', 'prof_quartier',
  'prof_tel', 'societe_raison_sociale', 'societe_registre_commerce', 'societe_compte_contribuable',
  'societe_adresse_postale', 'societe_bp', 'societe_ville', 'societe_quartier', 'societe_tel', 'societe_ilot',
  'societe_lot', 'societe_tf', 'societe_signature_date', 'bien_nature_local', 'bien_equipe_eau',
  'bien_equipe_electricite', 'bien_nombre_niveaux', 'bien_nombre_batiments', 'bien_annee_achevement',
  'bien_nature_occupation', 'bien_valeur_locative_mensuelle', 'bien_nombre_pieces', 'tableau_synthese',
  'gestion_par_agence', 'agence_raison_sociale', 'agence_compte_contribuable', 'agence_adresse_postale', 'agence_bp',
  'agence_ville', 'agence_quartier', 'agence_tel', 'date_collecte', 'signature_agent', 'created_date', 'created_by',
  'created_by_id',
];
export const EXPORT_FIELDS = ALL_COLLECTE_FIELDS.filter((f) => !PHOTO_FIELDS.includes(f));

export const norm = (v) =>
  String(v == null ? '' : v).trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

export const todayStr = () => format(new Date(), 'yyyy-MM-dd');

// Date de référence d'une fiche : date_collecte, sinon date de création
export const ficheDate = (c) => (c.date_collecte || c.created_date || '').slice(0, 10);

export const PERIODS = [
  { id: 'today', label: "Aujourd'hui" },
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: 'all', label: 'Tout' },
  { id: 'custom', label: 'Dates…' },
];

export function periodRange(period, custom) {
  const t = new Date();
  const f = (d) => format(d, 'yyyy-MM-dd');
  switch (period) {
    case 'today': return [f(t), f(t)];
    case '7d': return [f(subDays(t, 6)), f(t)];
    case '30d': return [f(subDays(t, 29)), f(t)];
    case 'custom': return [custom.from || '0000-01-01', custom.to || '9999-12-31'];
    default: return null;
  }
}

export const inRange = (d, range) => !range || (d && d >= range[0] && d <= range[1]);

// Clé unique d'une parcelle (section + parcelle, sinon lot + îlot)
export function parcelKey(c) {
  const sec = norm(c.section);
  if (c.parcelle) return `${norm(c.commune)}|${sec}|P${norm(c.parcelle)}`;
  if (c.lot || c.ilot) return `${norm(c.commune)}|${sec}|L${norm(c.lot)}-${norm(c.ilot)}`;
  return null;
}

export function agentLabel(c, usersById) {
  const u = usersById[c.created_by_id];
  return (u && (u.full_name || u.email)) || c.signature_agent || c.created_by || 'Non renseigné';
}

// Série temporelle : par jour si la période est courte, sinon par semaine
export function buildTimeSeries(fiches, range, convocs = []) {
  const convDate = (c) => (c.created_date || '').slice(0, 10);
  const dates = [...fiches.map(ficheDate), ...convocs.map(convDate)].filter(Boolean).sort();
  if (!dates.length) return { data: [], unit: 'jour' };
  const start = range && range[0] !== '0000-01-01' ? range[0] : dates[0];
  const end = range && range[1] !== '9999-12-31' ? range[1] : dates[dates.length - 1];
  const span = differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
  const weekly = span > 62;

  const buckets = new Map();
  const keyOf = (d) => (weekly ? format(startOfWeek(parseISO(d), { weekStartsOn: 1 }), 'yyyy-MM-dd') : d);

  // Pré-remplir chaque jour / semaine (les jours sans activité apparaissent à 0)
  for (let i = 0; i < span; i++) {
    const k = keyOf(format(new Date(parseISO(start).getTime() + i * 86400000), 'yyyy-MM-dd'));
    if (!buckets.has(k)) buckets.set(k, { key: k, validee: 0, convocations: 0 });
  }
  fiches.forEach((c) => {
    const d = ficheDate(c);
    if (!d) return;
    const b = buckets.get(keyOf(d));
    if (!b) return;
    if (c.statut === 'validee') b.validee++;
  });
  convocs.forEach((c) => {
    const d = convDate(c);
    if (!d) return;
    const b = buckets.get(keyOf(d));
    if (b) b.convocations++;
  });
  const data = [...buckets.values()].map((b) => ({
    ...b,
    label: weekly
      ? `S${format(parseISO(b.key), 'w', { locale: fr })} · ${format(parseISO(b.key), 'd MMM', { locale: fr })}`
      : format(parseISO(b.key), 'EEE d MMM', { locale: fr }),
    short: weekly ? format(parseISO(b.key), 'd/MM') : format(parseISO(b.key), 'd/MM'),
  }));
  return { data, unit: weekly ? 'semaine' : 'jour' };
}

export const fmtDate = (d) => (d ? format(parseISO(d), 'd MMM yyyy', { locale: fr }) : '—');
export const daysAgo = (d) => (d ? differenceInCalendarDays(new Date(), parseISO(d)) : Infinity);
