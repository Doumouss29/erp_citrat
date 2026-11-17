// COPROCIV — documents imprimables (PDF via l'impression du navigateur) : EDD, règlement, modificatif, attestations.
// Gabarit commun : page de garde, sommaire, sections numérotées, pied de page paginé, filigrane « PROJET ».
import { compute, addrOf, esc, fm, f, levelsLabel, natureOf, pcLoc, TYPES, BATL, USAGE, DOC_CSS, docTheme, TYPE_COPRO, typeCoproOf, hasParcelle, METHODS, fcfa, jpOf, descOf, compareAvant, hspOf, kHsp, n0, LVS, MESURE_DEF, contentHash } from '@/lib/engine';
import { CHARTE_LAYERS, CARTOUCHE_ATTS, niveauCode } from '@/lib/dxfCharte';

export const baseLabel = b => (+b === 1000 ? 'millièmes' : +b === 10000 ? 'dix-millièmes' : +b === 100 ? 'centièmes' : b + 'èmes');
const LOI = 'loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l’Habitat';
const dateFr = t => new Date(t || Date.now()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

export function fillText(x, s) {
  const bats = (s.bats || []).map(b => b.name).join(', ');
  const batTxt = (bats || 'un bâtiment') + (s.hasSS ? ', ainsi qu’un sous-sol' : '');
  const i = s.info || {};
  const cad = [i.section && 'section ' + i.section, i.parcelle && 'parcelle ' + i.parcelle, i.ilot].filter(Boolean).join(', ') || 'références cadastrales à compléter';
  return String(x || '')
    .replace(/\[\[TF\]\]/g, i.tf || '…')
    .replace(/\[\[ACD\]\]/g, i.acd || 'néant')
    .replace(/\[\[CONTENANCE\]\]/g, i.contenance || '…')
    .replace(/\[\[CADASTRE\]\]/g, cad)
    .replace(/\[\[ADRESSE\]\]/g, addrOf(s.info || {}) || '…')
    .replace(/\[\[BATIMENTS\]\]/g, batTxt)
    .replace(/\[\[NB_LOTS\]\]/g, String((s.lots || []).length))
    .replace(/\[\[BASE\]\]/g, baseLabel(s.baseGen))
    .replace(/\[\[TOTAL\]\]/g, String(s.baseGen));
}

const ownerName = (s, id) => ((s.owners || []).find(o => o.id === id) || {}).nom || '—';
const plural = (n, a, b) => n + ' ' + (n > 1 ? b : a);

// Données communes à la page de garde (PDF et Word).
export function dossierInfo(s, c) {
  c = c || compute(s);
  const i = s.info || {};
  const meta = s.meta || {};
  const types = {};
  c.rows.forEach(r => { const l = (TYPES[r.type] || {}).l || r.type; types[l] = (types[l] || 0) + 1; });
  const composition = Object.entries(types).map(([l, n]) => n + ' ' + (n > 1 && l === 'Lot de terrain' ? 'lots de terrain' : l.toLowerCase() + (n > 1 && !/s$/.test(l) ? 's' : ''))).join(', ');
  const bats = (s.bats || []).map(b => b.villas ? `Ensemble de villas${b.etages ? ' (RDC à R+' + b.etages + ')' : ' (plain-pied)'}` : `${b.name} — R+${b.etages}${b.lift ? ', avec ascenseur' : ''}`).concat(s.hasSS ? ['Sous-sol'] : []);
  const cad = [i.section && 'Section ' + i.section, i.parcelle && 'parcelle ' + i.parcelle].filter(Boolean).join(', ') || '—';
  const status = s.validated ? { ok: true, t: 'Validé par le notaire le ' + dateFr((meta.valid || {}).le) }
    : s.certified ? { ok: false, t: 'Certifié par le géomètre-expert le ' + dateFr((meta.certif || {}).le) + ' — projet en attente de validation' }
      : { ok: false, t: 'Projet — document non validé par le notaire' };
  const empreinte = String((meta.certif || {}).empreinte || contentHash(s)).slice(0, 12);
  return {
    i, c, bats, composition, status, empreinte, edition: dateFr(),
    immeuble: [['Adresse', addrOf(i) || '—'], ['Titre foncier', i.tf || '—'], ['ACD', i.acd || '—'], ['Cadastre', cad], ['Îlot / lot', i.ilot || '—'], ['Contenance', i.contenance || '—'], ['Usage', USAGE[i.usage] || '—']],
    compo: [['Type', TYPE_COPRO[typeCoproOf(s)]], ['Bâtiments', bats.join(' ; ') || '—'], ['Lots', plural(c.rows.length, 'lot', 'lots') + (composition ? ' (' + composition + ')' : '')], ['Quotes-parts', s.baseGen + ' ' + baseLabel(s.baseGen)], ['Parties communes', plural((s.communs || []).length, 'élément', 'éléments')], ['Charges spéciales', plural((s.grids || []).length, 'grille', 'grilles')]],
    acteurs: [['Géomètre-expert', i.geometre || '—'], ['Notaire', i.notaire || '—'], ['Référence', i.ref || '—']]
  };
}

const kv = rows => `<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`;

// Bandeau de marque COPROCIV (couleurs du thème de l'application).
export const brand = (tag, sm) => `<div class="brand${sm ? ' sm' : ''}"><div class="wm"><i></i>COPROCIV</div><div class="tag">${tag}</div></div>`;
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">';
export const docHead = (s, title, extra = '') => { const t = docTheme(s); return `<meta charset="utf-8"><title>${title}</title>${FONTS}<style>${DOC_CSS}:root{--p:${t.p};--pt:${t.pt};--g:${t.g};--gl:${t.gl}}${extra}</style>`; };

// Page de garde.
function cover(s, D, { kind, title, law }) {
  const i = D.i;
  return `<section class="cover">
${brand('Copropriété · Côte d’Ivoire')}
<div class="mid"><div class="kind">${esc(kind)}</div><h1>${esc(title)}</h1><div class="law">${esc(law)}</div><div class="rule"></div><div class="res">${esc(i.nom || 'Copropriété')}</div><div class="addr">${esc(addrOf(i) || '')}</div></div>
<div class="boxes"><div class="box"><h4>L’immeuble</h4>${kv(D.immeuble)}</div><div class="box"><h4>Composition</h4>${kv(D.compo)}</div><div class="box full"><h4>Intervenants</h4>${kv(D.acteurs)}</div></div>
<div class="status${D.status.ok ? ' ok' : ''}">${esc(D.status.t)}</div>
<div class="foot"><span>Dossier ${esc(i.ref || '—')} · édité le ${esc(D.edition)}</span><span>Empreinte du contenu ${esc(D.empreinte)}</span></div>
</section>`;
}

const toc = items => `<section class="toc"><h2>Sommaire</h2><ol>${items.map((t, k) => `<li><span class="n">${k + 1}.</span><span>${esc(t[0])}</span>${t[1] ? `<span class="r">${esc(t[1])}</span>` : ''}</li>`).join('')}</ol></section>`;
const sec = (n, t, ref) => `<h2 class="sec">${ref ? `<span class="ref">${esc(ref)}</span>` : ''}<span class="num">${n}.</span>${esc(t)}</h2>`;

export function eddTable(s, c) {
  c = c || compute(s);
  const jpTxt = r => { const j = jpOf(s, r.id); return j.length ? `<br><i style="font-size:8pt">avec jouissance privative de : ${esc(j.map(x => x.nom || 'partie commune').join(', '))}</i>` : ''; };
  // Copropriété horizontale ou mixte : colonne de la parcelle privative.
  const hp = c.rows.some(r => hasParcelle(r));
  const totP = c.rows.reduce((a, r) => a + (hasParcelle(r) ? n0(r.parcelle) : 0), 0);
  const rows = c.rows.map(r => `<tr><td><b>${esc(r.id)}</b></td><td>${esc(BATL(r.bat))}</td><td>${esc(levelsLabel(r))}</td><td>${esc(TYPES[r.type] ? TYPES[r.type].l : r.type)}</td><td>${esc(r.des || '')}${jpTxt(r)}</td><td class="n">${r.type === 'terrain' ? '—' : fm(r.surfTot)}</td>${hp ? `<td class="n">${hasParcelle(r) && n0(r.parcelle) ? fm(r.parcelle) : '—'}</td>` : ''}<td class="n">${r.tg} / ${s.baseGen}</td><td>${esc(ownerName(s, r.owner))}</td></tr>`).join('');
  return `<table><thead><tr><th>Lot</th><th>Bâtiment</th><th>Niveau</th><th>Nature</th><th>Désignation</th><th class="n">Surface (m²)</th>${hp ? '<th class="n">Parcelle (m²)</th>' : ''}<th class="n">Quote-part</th><th>Propriétaire</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th colspan="5">Total · ${plural(c.rows.length, 'lot', 'lots')}</th><th class="n">${fm(c.totalSu)}</th>${hp ? `<th class="n">${fm(totP)}</th>` : ''}<th class="n">${c.sumTg} / ${s.baseGen}</th><th></th></tr></tfoot></table>`;
}

export function communsHtml(s) {
  const cs = s.communs || [];
  const grid = id => ((s.grids || []).find(g => g.id === id) || {}).name || 'grille à préciser';
  const jp = c => c.jp ? `<br><i style="font-size:8pt">jouissance privative du lot ${esc(c.jp)}</i>` : '';
  const tbl = (list, pcs) => list.length ? `<table><thead><tr><th>Désignation</th><th>Bâtiment</th><th>Niveau / emplacement</th>${pcs ? '<th>Affectée à</th>' : ''}<th class="n">Surface (m²)</th></tr></thead><tbody>${list.map(c => `<tr><td>${esc(c.nom || '—')}${jp(c)}</td><td>${esc(BATL(c.bat))}</td><td>${esc(pcLoc(c))}</td>${pcs ? `<td>${esc(grid(c.cle))}</td>` : ''}<td class="n">${c.surface !== '' && c.surface != null ? fm(c.surface) : '—'}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="${pcs ? 4 : 3}">Total</th><th class="n">${fm(list.reduce((a, c) => a + (+c.surface || 0), 0))}</th></tr></tfoot></table>` : '<p class="note">Néant.</p>';
  return `<h3>Parties communes générales</h3><p>Elles appartiennent indivisément à l’ensemble des copropriétaires, en proportion de leurs quotes-parts de parties communes générales.</p>${tbl(cs.filter(c => natureOf(c) === 'pcg'), false)}`
    + `<h3>Parties communes spéciales</h3><p>Elles appartiennent aux seuls copropriétaires des lots de la grille à laquelle elles sont affectées.</p>${tbl(cs.filter(c => natureOf(c) === 'pcs'), true)}`;
}

export function gridsHtml(s, c) {
  c = c || compute(s);
  const des = id => ((c.rows.find(r => r.id === id) || {}).des || '');
  return (s.grids || []).map((g, k) => {
    const G = c.g[g.id] || { shares: {} };
    const meth = (METHODS.find(m => m[0] === g.method) || ['', g.method])[1];
    const B = G.base != null ? G.base : g.base;
    const rows = Object.entries(G.shares).map(([id, sh]) => `<tr><td><b>${esc(id)}</b></td><td>${esc(des(id))}</td><td class="n">${sh} / ${B}</td>${g.budget ? `<td class="n">${fcfa(B ? g.budget * sh / B : 0)}</td>` : ''}</tr>`).join('');
    const ex = g.excl || {};
    const exTxt = [ex.annexes && 'annexes exclues', ex.niveauxSup && 'niveaux supplémentaires exclus'].filter(Boolean).join(', ');
    return `<h3>${k + 1}. ${esc(g.name)}${g.scope ? ' — ' + esc(g.scope) : ''}</h3><p class="note">Clé de répartition : ${esc(meth)}${g.prog && g.method !== 'lot' ? `, majoration de ${g.prog} % par étage` : ''}${exTxt ? ' (' + esc(exTxt) + ')' : ''}. Base : ${B}${g.budget ? ' · budget annuel : ' + fcfa(g.budget) : ''}.</p><table><thead><tr><th>Lot</th><th>Désignation</th><th class="n">Quote-part</th>${g.budget ? '<th class="n">Montant annuel</th>' : ''}</tr></thead><tbody>${rows}</tbody></table>`;
  }).join('') || '<p class="note">Aucune charge spéciale : toutes les charges sont réparties selon les quotes-parts générales.</p>';
}

// Désignation détaillée : un bloc par lot, regroupés par bâtiment.
export function descriptifsHtml(s, c) {
  c = c || compute(s);
  const groups = [];
  c.rows.forEach(r => { let g = groups.find(x => x.bat === r.bat); if (!g) groups.push(g = { bat: r.bat, rows: [] }); g.rows.push(r); });
  return groups.map(g => `<h3>${esc(BATL(g.bat))}</h3>` + g.rows.map(r => `<div class="lot"><div class="h">Lot n° ${esc(r.id)} — ${esc(r.des || (TYPES[r.type] || {}).l || '')}</div><div class="m">${esc((TYPES[r.type] || {}).l || r.type)} · ${esc(levelsLabel(r))} · ${fm(r.surfTot)} m²</div><div>${esc(descOf(s, r, c))}</div><div class="q">Quote-part des parties communes générales : <b>${r.tg} / ${s.baseGen}</b></div></div>`).join('')).join('');
}

function immeubleHtml(s, D) {
  const i = D.i;
  const lift = b => b.lift ? 'oui' : 'non';
  const nb = id => D.c.rows.filter(r => r.bat === id).length;
  return `<p>${typeCoproOf(s) === 'horizontale' ? 'L’ensemble immobilier' : 'L’immeuble'} sis ${esc(addrOf(i) || '…')}, objet du titre foncier ${esc(i.tf || '…')}${i.acd ? ', ACD ' + esc(i.acd) : ''}, cadastré ${esc(D.immeuble[3][1])}${i.contenance ? ', d’une contenance de ' + esc(i.contenance) : ''}, est divisé en ${plural(D.c.rows.length, 'lot', 'lots')} numérotés de ${esc(D.c.rows[0] ? D.c.rows[0].id : '1')} à ${esc(D.c.rows.length ? D.c.rows[D.c.rows.length - 1].id : '…')}.</p>`
    + `<table><thead><tr><th>Bâtiment</th><th>Niveaux</th><th>Ascenseur</th><th class="n">Lots</th></tr></thead><tbody>${(s.bats || []).map(b => `<tr><td>${b.villas ? 'Ensemble de villas' : esc(b.name)}</td><td>${b.villas && !b.etages ? 'RDC' : 'RDC à R+' + esc(b.etages)}</td><td>${b.villas ? 'sans objet' : lift(b)}</td><td class="n">${nb(b.id)}</td></tr>`).join('')}${s.hasSS ? `<tr><td>Sous-sol</td><td>—</td><td>—</td><td class="n">${nb('SS')}</td></tr>` : ''}</tbody></table>`
    + `<p class="note"><b>Méthode de mesurage :</b> ${esc(s.mesure || MESURE_DEF)}</p>`;
}

const stampTxt = (lab, m) => m ? `<small>${lab} le ${esc(dateFr(m.le))} par ${esc(m.nom || m.par || '')}<br>Empreinte ${esc(String(m.empreinte || '').slice(0, 12))}</small>` : '';
const signatures = s => `<div class="sig"><div><b>Le géomètre-expert</b><br>${esc((s.info || {}).geometre || '')}${s.certified ? stampTxt('Certifié', (s.meta || {}).certif) : '<small>Certification : en attente</small>'}</div><div><b>Le notaire</b><br>${esc((s.info || {}).notaire || '')}${s.validated ? stampTxt('Validé', (s.meta || {}).valid) : '<small>Validation : en attente</small>'}</div></div>`;

// Enveloppe : titre, pied de page paginé, filigrane tant que le document n'est pas validé.
const wrap = (s, title, body, mark = true) => {
  const i = (s && s.info) || {};
  const foot = (title + ' · ' + (i.nom || '') + (i.ref ? ' · Dossier ' + i.ref : '')).replace(/"/g, '\'');
  const page = `@page{@bottom-left{content:"${foot}";font:7.5pt Manrope,Arial,sans-serif;color:#777}@bottom-right{content:"Page " counter(page) " / " counter(pages);font:7.5pt Manrope,Arial,sans-serif;color:#777}}@page:first{@bottom-left{content:none}@bottom-right{content:none}}`;
  return `<!doctype html><html lang="fr"><head>${docHead(s, esc(title) + (i.nom ? ' — ' + esc(i.nom) : ''), page)}</head><body>${mark && s && !s.validated ? '<div class="draftmark">PROJET</div>' : ''}<div class="doc">${body}</div></body></html>`;
};

export function eddHtml(s) {
  const c = compute(s);
  const D = dossierInfo(s, c);
  const parts = [['Désignation générale de l’immeuble', 'art. 379'], ['Tableau récapitulatif des lots'], ['Désignation détaillée des lots'], ['Parties communes'], ['Répartition des charges spéciales'], ['Certification et validation']];
  return wrap(s, 'État descriptif de division',
    cover(s, D, { kind: 'Acte de copropriété', title: 'État descriptif de division', law: 'Établi en application de l’article 379 de la ' + LOI + '.' })
    + toc(parts)
    + sec(1, parts[0][0], 'CCH art. 379') + immeubleHtml(s, D)
    + sec(2, parts[1][0]) + `<p class="note">Quotes-parts des parties communes générales exprimées en ${baseLabel(s.baseGen)}.</p>` + eddTable(s, c)
    + sec(3, parts[2][0]) + descriptifsHtml(s, c)
    + sec(4, parts[3][0]) + communsHtml(s)
    + sec(5, parts[4][0]) + gridsHtml(s, c)
    + sec(6, parts[5][0]) + signatures(s));
}

export function reglementHtml(s) {
  const c = compute(s);
  const D = dossierInfo(s, c);
  const arts = s.articles || [];
  const body = arts.map((a, k) => {
    let b = fillText(a.x, s).split(/\n\s*\n|\n/).filter(t => t.trim()).map(t => `<p>${esc(t)}</p>`).join('');
    if (a.k === 'edd') b += `<h3>Tableau récapitulatif des lots</h3>` + eddTable(s, c) + communsHtml(s);
    if (a.k === 'grilles') b += gridsHtml(s, c);
    return `<h2 class="sec">${a.ref ? `<span class="ref">CCH ${esc(a.ref)}</span>` : ''}<span class="num">Article ${k + 1}</span>${esc(a.t)}</h2>${b}`;
  }).join('');
  return wrap(s, 'Règlement de copropriété',
    cover(s, D, { kind: 'Acte de copropriété', title: 'Règlement de copropriété', law: 'Établi conformément aux articles 379 à 407 de la ' + LOI + '.' })
    + `<section class="toc"><h2>Sommaire</h2><ol>${arts.map((a, k) => `<li><span class="n">${k + 1}.</span><span>${esc(a.t)}</span>${a.ref ? `<span class="r">CCH ${esc(a.ref)}</span>` : ''}</li>`).join('')}<li><span class="n">—</span><span>Signatures</span></li></ol></section>`
    + body + `<h2 class="sec"><span class="num">—</span>Signatures</h2>` + signatures(s));
}

export function avantApresHtml(s, c) {
  const cmp = compareAvant(s, c);
  if (!cmp) return '<p class="note">Aucun état d’origine enregistré : figez l’EDD en vigueur ou importez-le pour établir le tableau avant / après.</p>';
  const A = s.avant;
  const rows = cmp.rows.filter(x => x.statut !== 'Inchangé').map(x => `<tr><td><b>${esc(x.statut)}</b></td><td>${esc(x.avant ? x.avant.id : '—')}</td><td>${esc(x.avant ? x.avant.des : '')}</td><td class="n">${esc(x.avant ? x.avant.qp : '')}</td><td>${esc(x.apres ? x.apres.id : '—')}</td><td>${esc(x.apres ? x.apres.des : '')}</td><td class="n">${esc(x.apres ? x.apres.qp : '')}</td><td>${esc(x.note || '')}</td></tr>`).join('');
  return `<p>État d’origine : ${esc(A.source || '')}${A.le ? ' (' + esc(dateFr(A.le)) + ')' : ''} — ${A.lots.length} lots, base ${A.base}.</p>`
    + `<table><thead><tr><th>Inchangés</th><th>Modifiés</th><th>Créés</th><th>Supprimés ou divisés</th></tr></thead><tbody><tr><td class="n">${cmp.stats.inchange}</td><td class="n">${cmp.stats.modifie}</td><td class="n">${cmp.stats.cree}</td><td class="n">${cmp.stats.supprime}</td></tr></tbody></table>`
    + `<table><thead><tr><th>Statut</th><th>Lot avant</th><th>Désignation avant</th><th class="n">Q.-p. avant</th><th>Lot après</th><th>Désignation après</th><th class="n">Q.-p. après</th><th>Observation</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Aucun changement par rapport à l’état d’origine.</td></tr>'}</tbody></table>`;
}

export function modificatifHtml(s, journal) {
  const c = compute(s);
  const D = dossierInfo(s, c);
  const rows = (journal || []).map(e => `<tr><td style="white-space:nowrap">${esc(new Date(e.t).toLocaleString('fr-FR'))}</td><td>${esc(e.who || '')}</td><td>${esc(e.txt || '')}</td><td>${esc(e.before || '')}</td><td>${esc(e.after || '')}</td></tr>`).join('');
  const parts = [['Objet du modificatif'], ['Tableau avant / après'], ['Nouvel état descriptif'], ['Historique détaillé des modifications'], ['Certification et validation']];
  return wrap(s, 'Modificatif',
    cover(s, D, { kind: 'Acte de copropriété', title: 'Modificatif à l’état descriptif de division', law: 'Établi en application de l’article 379 de la ' + LOI + '.' })
    + toc(parts)
    + sec(1, parts[0][0]) + `<p>Le présent modificatif constate les changements apportés à l’état descriptif de division de la copropriété ${esc(D.i.nom || '')} et fixe le nouvel état des lots et de leurs quotes-parts.</p>`
    + sec(2, parts[1][0]) + avantApresHtml(s, c)
    + sec(3, parts[2][0]) + eddTable(s, c)
    + sec(4, parts[3][0]) + `<table><thead><tr><th>Date</th><th>Auteur</th><th>Modification</th><th>Avant</th><th>Après</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Aucune modification.</td></tr>'}</tbody></table>`
    + sec(5, parts[4][0]) + signatures(s));
}

// Attestation de superficie : une page par lot, avec bandeau d'en-tête.
export function attestationHtml(s, ids) {
  const c = compute(s);
  const H = hspOf(s);
  const i = s.info || {};
  const pages = c.rows.filter(r => !ids || ids.includes(r.id)).map(r => {
    const pcs = r.parts.flatMap(p => (p.pieces || []).map(x => ({ ...x, niv: (p.lib || '').trim() || LVS(+p.niveau) })));
    let tbl, total;
    if (pcs.length) {
      total = r.superficie || 0;
      tbl = `<table><thead><tr><th>Pièce</th><th>Niveau</th><th class="n">Surface (m²)</th><th class="n">Hauteur s/plafond (m)</th><th>Retenue</th></tr></thead><tbody>${pcs.map(x => { const ok = !x.exclu && kHsp(x.hsp, H) === 1; return `<tr><td>${esc(x.lib || 'Pièce')}</td><td>${esc(x.niv)}</td><td class="n">${fm(x.surface)}</td><td class="n">${x.hsp ? f(x.hsp) : '—'}</td><td>${ok ? 'oui' : 'non' + (x.exclu ? ' (exclue)' : ' (hauteur < ' + f(H.seuil) + ' m)')}</td></tr>`; }).join('')}</tbody><tfoot><tr><th colspan="2">Superficie retenue</th><th class="n">${fm(Math.round(total * 100) / 100)}</th><th colspan="2"></th></tr></tfoot></table>`;
    } else {
      total = r.parts.reduce((a, p) => a + n0(p.surface), 0);
      tbl = `<table><thead><tr><th>Partie</th><th>Niveau</th><th class="n">Surface (m²)</th></tr></thead><tbody>${r.parts.map(p => `<tr><td>${p.main ? 'Partie principale' : esc((p.lib || '').trim() || 'Partie')}</td><td>${esc(LVS(+p.niveau))}</td><td class="n">${fm(p.surface)}</td></tr>`).join('')}</tbody></table>`;
    }
    const ann = r.parts.filter(p => p.annexe && p.annexe !== 'aucune' && n0(p.sa) > 0);
    return `<section class="cert">${brand(esc(i.nom || '') + '<br>Dossier <b>' + esc(i.ref || '—') + '</b>', true)}`
      + `<h1>Attestation de superficie</h1><p class="sub">Lot n° ${esc(r.id)} — ${esc(r.des || '')}</p>`
      + `<div class="boxes"><div class="box"><h4>L’immeuble</h4>${kv([['Adresse', addrOf(i) || '—'], ['Titre foncier', i.tf || '—'], ['Cadastre', [i.section, i.parcelle].filter(Boolean).join(' / ') || '—']])}</div><div class="box"><h4>Le lot</h4>${kv([['Lot n°', r.id], ['Nature', (TYPES[r.type] || {}).l || r.type], ['Situation', BATL(r.bat) + ' — ' + levelsLabel(r)]])}</div></div>`
      + `<h3>Détail du mesurage</h3>` + tbl
      + `<div class="big">Superficie : ${fm(Math.round(total * 100) / 100)} m²</div>`
      + (ann.length ? `<p>Surfaces annexes non comprises : ${ann.map(p => esc(p.annexe) + ' ' + fm(p.sa) + ' m²').join(', ')}.</p>` : '')
      + `<p class="note"><b>Méthode de mesurage déclarée :</b> ${esc(s.mesure || MESURE_DEF)} Seuil de hauteur retenu : ${f(H.seuil)} m.</p>`
      + `<div class="sig"><div>Fait le ${esc(dateFr())}</div><div><b>Le géomètre-expert</b><br>${esc(i.geometre || '')}</div></div></section>`;
  }).join('');
  return wrap(s, 'Attestations de superficie', pages || '<p>Aucun lot.</p>', false);
}

// Charte DXF : format imposé des plans de niveau, à remettre au dessinateur.
export function charteDxfHtml(s) {
  const i = (s && s.info) || {};
  const ex = (((s && s.bats) || [])[0] || {}).id || 'A';
  const li = arr => `<ul>${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;
  const tbl = (head, rows) => `<table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const body = brand('Charte DXF · plans de niveau', true)
    + `<h1 class="simple">Charte DXF COPROCIV</h1><p class="sub">Format imposé des plans de niveau${i.ref ? ' — dossier ' + esc(i.ref) + (i.nom ? ' · ' + esc(i.nom) : '') : ''}</p>`
    + `<div class="status">Un plan qui ne respecte pas cette charte est refusé à l’import : on corrige le dessin, puis on réimporte.</div>`
    + sec(1, 'Le fichier') + li(['Format <b>DXF</b> (AutoCAD 2000 ou plus récent, ou R12), dessin à l’échelle <b>1:1</b>.', 'Unité : <b>le mètre</b> (commande UNITES ; variable $INSUNITS = 6). Une autre unité est refusée.', '<b>Un fichier par niveau et par bâtiment.</b> Nom conseillé : ' + esc((i.ref || 'REF') + '_' + ex + '_R+1.dxf') + '.', 'Partir du <b>gabarit</b> téléchargé dans COPROCIV (Lots &amp; surfaces › Importer un plan DXF) : calques et cartouche y sont déjà créés.'])
    + sec(2, 'Le cartouche') + `<p>Un seul bloc <b>CP_CARTOUCHE</b> par fichier, avec trois attributs :</p>` + tbl(['Attribut', 'Contenu', 'Exemple'], CARTOUCHE_ATTS.map(([t, d, e]) => [`<b>${t}</b>`, esc(d), esc(t === 'DOSSIER' && i.ref ? i.ref : e)]))
    + `<p class="note">Le dossier doit être celui ouvert dans COPROCIV ; le bâtiment et le niveau doivent exister dans le dossier (${esc(((s && s.bats) || []).map(b => b.id + ' : RDC à R+' + b.etages).join(' · ') || '—')}${s && s.hasSS ? ' · SS : sous-sol' : ''}). Niveaux : ${['SS', niveauCode(0), niveauCode(1), niveauCode(2)].join(', ')}…</p>`
    + sec(3, 'Les calques') + tbl(['Calque', 'Contenu', 'Texte à écrire dans le contour'], CHARTE_LAYERS.map(([l, d, t]) => [`<b>${l}</b>`, esc(d), esc(t)]))
    + `<p class="note">Tout autre calque (murs, cloisons, cotes, mobilier, hachures décoratives…) est ignoré. Un calque commençant par CP_ et absent de cette liste est refusé.</p>`
    + sec(4, 'Règles de dessin') + li(['Chaque local est une <b>polyligne fermée</b> (arcs admis). Jamais de lignes séparées.', 'Le texte d’un local est posé <b>à l’intérieur</b> de son contour.', 'Un lot : <b>un seul contour par niveau</b>, étiqueté « LOT n » avec le numéro du lot dans le dossier.', 'Les <b>pièces</b> (facultatives) sont entièrement à l’intérieur du contour de leur lot et ne se chevauchent pas. Si des pièces sont dessinées, la surface du lot est la somme des pièces.', 'Hauteur sous plafond facultative dans la pièce : « HSP 2,50 ».', 'Lots, annexes et parties communes <b>ne se chevauchent pas</b> (des côtés communs sont admis).', 'Annexe : « LOT n » suivi de sa nature (BALCON, LOGGIA, TERRASSE, JARDIN).', 'Poteaux, gaines, trémies sur CP_DEDUIRE, à l’intérieur du local dont la surface est à réduire.', '<b>Copropriété horizontale</b> : un plan de masse (BATIMENT = V, NIVEAU = RDC). La parcelle de chaque villa ou lot de terrain sur CP_PARCELLE (« LOT n ») ; la surface habitable de la villa sur CP_LOT, à l’intérieur de sa parcelle.', 'Surface écrite facultative dans le contour (« 24,35 m² ») : elle est comparée à la surface calculée.'])
    + sec(5, 'Contrôles à l’import') + `<h3>Le plan est refusé si :</h3>` + li(['l’unité n’est pas le mètre ;', 'le cartouche est absent, en double, ou d’un autre dossier, bâtiment ou niveau ;', 'un contour CP_ est ouvert, ou un calque CP_ n’existe pas dans la charte ;', 'un lot n’a pas d’étiquette, n’existe pas dans le dossier, appartient à un autre bâtiment ou est dessiné deux fois ;', 'une pièce est hors du lot ou sans nom, une annexe ne désigne pas son lot, une partie commune n’a pas de nom ;', 'des contours se chevauchent, ou la somme des pièces dépasse le contour du lot.']) + `<h3>Simples avertissements :</h3>` + li(['écart entre surface écrite et surface calculée au-delà de la tolérance ;', 'lots du niveau non dessinés sur le plan ;', 'contours présents sur des calques ignorés.'])
    + sec(6, 'Avant d’envoyer le plan') + li(['☐ Unités en mètres, échelle 1:1', '☐ Cartouche CP_CARTOUCHE rempli (DOSSIER, BATIMENT, NIVEAU)', '☐ Polylignes fermées sur les calques CP_', '☐ Un texte « LOT n » dans chaque contour de lot', '☐ Pièces, annexes et parties communes nommées', '☐ Aucun chevauchement']);
  return wrap(s, 'Charte DXF', body, false);
}

// Ouvre le document dans un nouvel onglet ; l'utilisateur imprime ou enregistre en PDF.
export function openDoc(html) {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open(); w.document.write(html); w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* l'utilisateur peut imprimer manuellement */ } }, 300);
  return true;
}

export { f };
