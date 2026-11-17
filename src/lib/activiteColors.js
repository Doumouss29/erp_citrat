// Couleurs par catégorie de type d'activité (pas de blanc)
const CATEGORY_COLORS = [
  { keywords: ['lotissement', 'morcellement', 'bornage', 'délimitation', 'certificat foncier', 'titre foncier'], classes: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  { keywords: ['viabilisation', 'vrd', 'voirie', 'aménagement urbain', 'plan de masse'], classes: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  { keywords: ['topographique', 'levé', 'implantation', 'faisabilité', 'étude'], classes: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500', bar: 'bg-blue-500' },
  { keywords: ['bâtiment', 'chantier', 'récolement', 'construction'], classes: 'bg-violet-100 text-violet-800 border-violet-200', dot: 'bg-violet-500', bar: 'bg-violet-500' },
  { keywords: ['régularisation', 'constat', 'expertise', 'acd', 'autorisation', 'juridique', 'administratif'], classes: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500', bar: 'bg-rose-500' }
];
const DEFAULT_COLOR = { classes: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400', bar: 'bg-slate-400' };

export function getActiviteColor(type) {
  if (!type) return DEFAULT_COLOR;
  const t = type.toLowerCase();
  for (const c of CATEGORY_COLORS) {
    if (c.keywords.some(k => t.includes(k))) return c;
  }
  return DEFAULT_COLOR;
}