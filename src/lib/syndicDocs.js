// COPROCIV — documents du syndic (à imprimer / enregistrer en PDF).
import { compute, addrOf, esc, DOC_CSS, levelsLabel, BATL, TYPES, fcfa, n0 } from '@/lib/engine';
import { fillText } from '@/lib/docs';
import { withDefaults, cotisations, comptes, poids, quorumAG, resultat, odjLabel, fmtDate, periodeLabel, CATS, today } from '@/lib/syndic';

const wrap = (title, body) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${DOC_CSS}.right{text-align:right}.box{border:1px solid #999;padding:8pt 10pt;margin:8pt 0}</style></head><body>${body}</body></html>`;
const entete = (s, sy) => {
  const i = s.info || {};
  const S = sy.syndic || {};
  return `<table class="meta"><tr><td><b>Syndicat des copropriétaires</b><br>${esc(i.nom || '')}<br>${esc(addrOf(i))}<br>Titre foncier : ${esc(i.tf || '…')}</td><td class="right">Syndic : <b>${esc(S.nom || '…')}</b><br>Agrément n° ${esc(S.agrement || '…')}${S.arrete ? '<br>Arrêté n° ' + esc(S.arrete) : ''}<br>Compte du syndicat : ${esc((sy.syndicat || {}).banque || '')} ${esc((sy.syndicat || {}).compte || '…')}</td></tr></table>`;
};
const ownersOf = (s, c) => (s.owners || []).filter(o => c.rows.some(r => r.owner === o.id));
const lotsTxt = (c, ownerId) => c.rows.filter(r => r.owner === ownerId).map(r => r.id).join(', ');

export function convocationHtml(s, syRaw, ag) {
  const sy = withDefaults(syRaw), c = compute(s);
  const odj = (ag.odj || []).map((r, k) => `<li><b>Résolution ${k + 1}</b> — ${esc(r.titre || odjLabel(r.objet))}${r.cle && r.cle !== 'gen' ? ' <i>(vote des seuls copropriétaires concernés par la grille « ' + esc(((s.grids || []).find(g => g.id === r.cle) || {}).name || '') + ' »)</i>' : ''}</li>`).join('');
  const pages = ownersOf(s, c).map(o => `<div class="cert">${entete(s, sy)}
    <p class="right">${esc(o.nom || '')}<br>${esc(o.adresse || '')}</p>
    <p class="right">Fait le ${fmtDate(ag.convocLe || today())}</p>
    <h1>Convocation à l’assemblée générale ${ag.type === 'extraordinaire' ? 'extraordinaire' : 'ordinaire'}</h1>
    <p>Madame, Monsieur,</p>
    <p>Sur convocation du conseil syndical (article 388 du Code de la Construction et de l’Habitat), vous êtes prié(e) d’assister à l’assemblée générale des copropriétaires qui se tiendra le <b>${fmtDate(ag.date)}${ag.heure ? ' à ' + esc(ag.heure) : ''}</b>, ${esc(ag.lieu || 'au lieu indiqué par le syndic')}.</p>
    <p>Vous y disposerez de <b>${poids(s, c, o.id, 'gen')} voix</b> (lots n° ${esc(lotsTxt(c, o.id))}).</p>
    <h2>Ordre du jour</h2><ol style="padding-left:14pt;list-style:none">${odj || '<li>…</li>'}</ol>
    <p>Si vous ne pouvez être présent(e), vous pouvez vous faire représenter par un mandataire muni d’un pouvoir écrit.</p>
    <div class="sig"><div></div><div>Pour le conseil syndical<br><br>${esc((sy.conseil.membres || []).map(id => ((s.owners || []).find(x => x.id === id) || {}).nom).filter(Boolean).join(', '))}</div></div>
    <div style="margin-top:24pt;border-top:1px dashed #999;padding-top:8pt"><b>Pouvoir</b> — Je soussigné(e) ${esc(o.nom || '')}, copropriétaire des lots n° ${esc(lotsTxt(c, o.id))}, donne pouvoir à ……………………………… de me représenter à l’assemblée générale du ${fmtDate(ag.date)}. Signature :</div>
  </div>`).join('');
  return wrap('Convocations AG', pages || '<p>Aucun copropriétaire.</p>');
}

export function pvHtml(s, syRaw, ag) {
  const sy = withDefaults(syRaw), c = compute(s);
  const q = quorumAG(s, c, ag);
  const own = ownersOf(s, c);
  const presTbl = own.map(o => { const p = (ag.presences || {})[o.id] || 'absent'; return `<tr><td>${esc(o.nom || '')}</td><td>${esc(lotsTxt(c, o.id))}</td><td class="n">${poids(s, c, o.id, 'gen')}</td><td>${p === 'present' ? 'Présent' : p === 'represente' ? 'Représenté' + ((ag.mandataires || {})[o.id] ? ' par ' + esc(ag.mandataires[o.id]) : '') : 'Absent'}</td></tr>`; }).join('');
  const resolutions = (ag.odj || []).map((r, k) => {
    const R = resultat(s, c, ag, r);
    const votants = own.filter(o => r.regle === 'membres' ? (ag.presences || {})[o.id] === 'present' : ['present', 'represente'].includes((ag.presences || {})[o.id]) && poids(s, c, o.id, r.cle) > 0);
    const noms = v => votants.filter(o => v === 'abst' ? !['pour', 'contre'].includes((r.votes || {})[o.id]) : (r.votes || {})[o.id] === v).map(o => esc(o.nom || '')).join(', ') || '—';
    return `<h2>Résolution ${k + 1} — ${esc(r.titre || odjLabel(r.objet))}</h2>${r.texte ? `<p>${esc(r.texte)}</p>` : ''}
      <p>Règle : ${esc(R.regle)}${r.cle && r.cle !== 'gen' ? ' (grille « ' + esc(((s.grids || []).find(g => g.id === r.cle) || {}).name || '') + ' »)' : ''}.</p>
      <table><tr><th>Pour</th><th>Contre</th><th>Abstention</th></tr><tr><td class="n">${R.pour} ${R.unite}</td><td class="n">${R.contre} ${R.unite}</td><td class="n">${R.abst} ${R.unite}</td></tr></table>
      <p style="font-size:9.5pt">Ont voté contre : ${noms('contre')}. Se sont abstenus : ${noms('abst')}.</p>
      <p><b>${R.adoptee ? 'Résolution adoptée.' : 'Résolution rejetée.'}</b></p>`;
  }).join('');
  const conseil = (ag.odj || []).some(r => r.objet === 'conseil') ? '<p class="box">Conformément à l’article 392 du Code, copie du présent procès-verbal désignant les membres du conseil syndical est transmise au Ministre en charge du Logement et à la Mairie de la commune.</p>' : '';
  return wrap('Procès-verbal AG', `${entete(s, sy)}<h1>Procès-verbal de l’assemblée générale ${ag.type === 'extraordinaire' ? 'extraordinaire' : 'ordinaire'}</h1>
    <p class="sub">${fmtDate(ag.date)} — ${esc(ag.lieu || '')}</p>
    <p>L’assemblée a été convoquée par le conseil syndical le ${fmtDate(ag.convocLe)} (art. 388). Le syndic en assure le secrétariat (art. 395).</p>
    <h2>Feuille de présence</h2><table><thead><tr><th>Copropriétaire</th><th>Lots</th><th>Voix</th><th>Présence</th></tr></thead><tbody>${presTbl}</tbody></table>
    <p>Copropriétaires présents ou représentés : ${q.presents} sur ${q.inscrits}, totalisant <b>${q.voix} / ${q.total} voix</b> (${Math.round(q.ratio * 1000) / 10} %). Quorum requis : ${n0(ag.quorum ?? 50)} % — <b>${q.atteint ? 'atteint' : 'non atteint'}</b>.</p>
    ${resolutions}${conseil}
    <div class="sig"><div>Le président de séance<br>${esc(ag.president || '')}</div><div>Le secrétaire (syndic)<br>${esc(sy.syndic.nom || '')}</div></div>`);
}

export function appelHtml(s, syRaw, periode, lotIds) {
  const sy = withDefaults(syRaw), c = compute(s);
  const an = String(periode).slice(0, 4);
  const cot = cotisations(s, sy, an, c);
  const appels = (sy.appels || []).filter(a => a.periode === periode && (!lotIds || lotIds.includes(a.lotId)));
  const cpt = comptes(s, sy);
  const pages = appels.map(a => {
    const r = c.rows.find(x => x.id === a.lotId) || {};
    const o = (s.owners || []).find(x => x.id === r.owner) || {};
    const occ = (sy.occupants || {})[a.lotId] || {};
    const dest = occ.payeur === 'occupant' && occ.nom ? occ.nom + ' (occupant, art. 403)' : (o.nom || '');
    const det = ((cot.parLot[a.lotId] || {}).detail || []).map(d => `<tr><td>${esc(d.poste)}</td><td class="n">${fcfa(d.montant)}</td></tr>`).join('');
    const arr = (cpt[a.lotId] || {}).solde - (a.echeance <= today() ? n0(a.montant) : 0);
    return `<div class="cert">${entete(s, sy)}<p class="right">${esc(dest)}</p>
      <h1>Appel de cotisation — ${esc(periodeLabel(periode))}</h1>
      <p>Lot n° <b>${esc(a.lotId)}</b> — ${esc(r.des || '')} — ${esc(BATL(r.bat || ''))}, ${esc(r.parts ? levelsLabel(r) : '')} — ${r.tg}/${s.baseGen} des parties communes générales.</p>
      <table><thead><tr><th>Poste</th><th>Montant</th></tr></thead><tbody>${det}</tbody><tfoot><tr><th>Cotisation du mois</th><th class="n">${fcfa(a.montant)}</th></tr></tfoot></table>
      ${arr > 0 ? `<p>Arriéré antérieur : <b>${fcfa(arr)}</b>.</p>` : ''}
      <p>À régler au plus tard le <b>${fmtDate(a.echeance)}</b> sur le compte du syndicat : ${esc(sy.syndicat.banque || '')} ${esc(sy.syndicat.compte || '…')}.</p>
      <p style="font-size:9pt">Cotisation mensuelle fixée par l’assemblée générale (art. 402). Les fonds sont déposés sur le compte bancaire séparé du syndicat (art. 406).</p></div>`;
  }).join('');
  return wrap('Appels de cotisation', pages || '<p>Aucun appel pour cette période.</p>');
}

export function quittanceHtml(s, syRaw, p) {
  const sy = withDefaults(syRaw), c = compute(s);
  const r = c.rows.find(x => x.id === p.lotId) || {};
  const o = (s.owners || []).find(x => x.id === r.owner) || {};
  return wrap('Quittance', `${entete(s, sy)}<h1>Quittance n° ${esc(String(p.id).slice(-6).toUpperCase())}</h1>
    <p>Le syndic reconnaît avoir reçu de <b>${esc(p.payeur || o.nom || '')}</b> la somme de <b>${fcfa(p.montant)}</b> le ${fmtDate(p.date)} (${esc(p.mode || '')}${p.ref ? ', réf. ' + esc(p.ref) : ''}), au titre des cotisations de copropriété du lot n° ${esc(p.lotId)} — ${esc(r.des || '')}.</p>
    <div class="sig"><div></div><div>Le syndic<br>${esc(sy.syndic.nom || '')}</div></div>`);
}

export function relanceHtml(s, syRaw, lotId, type) {
  const sy = withDefaults(syRaw), c = compute(s);
  const cpt = comptes(s, sy);
  const r = c.rows.find(x => x.id === lotId) || {};
  const o = (s.owners || []).find(x => x.id === r.owner) || {};
  const k = cpt[lotId] || {};
  const forced = type === 'recouvrement';
  return wrap(forced ? 'Mise en demeure' : 'Lettre de relance', `${entete(s, sy)}<p class="right">${esc(o.nom || '')}<br>${esc(o.adresse || '')}</p><p class="right">Le ${fmtDate(today())}</p>
    <h1>${forced ? 'Mise en demeure avant recouvrement forcé' : 'Lettre de relance'}</h1>
    <p>Madame, Monsieur,</p>
    <p>Sauf erreur de notre part, les cotisations de copropriété afférentes au lot n° <b>${esc(lotId)}</b> (${esc(r.des || '')}) présentent à ce jour un solde impayé de <b>${fcfa(k.solde)}</b> (appelé : ${fcfa(k.du)} ; réglé : ${fcfa(k.paye)}).</p>
    ${forced
      ? `<p>Malgré notre précédente relance, cette somme demeure impayée. Conformément à l’article 404 du Code de la Construction et de l’Habitat, nous vous mettons en demeure de la régler sous huitaine, faute de quoi le syndic${sy.syndic.cabinetRecouvrement ? ' ou le cabinet de recouvrement ' + esc(sy.syndic.cabinetRecouvrement) : ''} engagera une action en recouvrement forcé de la créance.</p>`
      : `<p>Nous vous remercions de bien vouloir régulariser cette situation dans les meilleurs délais, par versement sur le compte du syndicat : ${esc(sy.syndicat.banque || '')} ${esc(sy.syndicat.compte || '…')}. Conformément à l’article 404 du Code, à défaut de paiement, le syndic sera tenu d’engager une action en recouvrement forcé.</p>`}
    <p>Nous vous prions d’agréer, Madame, Monsieur, nos salutations distinguées.</p>
    <div class="sig"><div></div><div>Le syndic<br>${esc(sy.syndic.nom || '')}</div></div>`);
}

// Extrait du règlement à remettre au locataire (art. 417).
export function extraitBailHtml(s, lotId) {
  const c = compute(s);
  const r = c.rows.find(x => x.id === lotId) || {};
  const pick = re => (s.articles || []).filter(a => re.test(a.t));
  const arts = [...pick(/destination/i), ...pick(/parties privatives/i), ...pick(/parties communes g/i)];
  const charges = [[`Charges générales (tantièmes généraux)`, `${r.tg} / ${s.baseGen}`], ...(s.grids || []).map(g => { const G = c.g[g.id] || { shares: {} }; const sh = G.shares[lotId]; return sh != null ? [`${g.name} — ${g.scope || ''}`, `${sh} / ${G.base}`] : null; }).filter(Boolean)];
  return wrap('Extrait du règlement', `<h1>Extrait du règlement de copropriété</h1><p class="sub">${esc((s.info || {}).nom || '')} — ${esc(addrOf(s.info || {}))}<br>Lot n° ${esc(lotId)} — ${esc(r.des || '')} (${esc((TYPES[r.type] || {}).l || '')})</p>
    <p style="font-size:9.5pt">Document remis au locataire en application de l’article 417 du Code de la Construction et de l’Habitat : destination de l’immeuble, jouissance et usage des parties privatives et communes, quote-part du lot loué dans chaque catégorie de charges.</p>
    ${arts.map(a => `<h2>${esc(a.t)}</h2><p>${esc(fillText(a.x, s)).replace(/\n/g, '<br>')}</p>`).join('')}
    <h2>Quote-part du lot dans chaque catégorie de charges</h2><table><thead><tr><th>Catégorie</th><th>Quote-part</th></tr></thead><tbody>${charges.map(([a, b]) => `<tr><td>${esc(a)}</td><td class="n">${esc(b)}</td></tr>`).join('')}</tbody></table>`);
}

// Comptes du syndicat : budget, appelé, encaissé, dépensé (consultation, art. 390).
export function comptesHtml(s, syRaw, annee) {
  const sy = withDefaults(syRaw), c = compute(s);
  const cot = cotisations(s, sy, annee, c);
  const ex = (sy.exercices || {})[annee] || { postes: [] };
  const dep = (sy.depenses || []).filter(d => String(d.date || '').startsWith(annee));
  const appele = (sy.appels || []).filter(a => String(a.periode).startsWith(annee)).reduce((x, a) => x + n0(a.montant), 0);
  const encaisse = (sy.paiements || []).filter(p => String(p.date || '').startsWith(annee)).reduce((x, p) => x + n0(p.montant), 0);
  const rows = (ex.postes || []).map(p => { const real = dep.filter(d => d.poste === p.id).reduce((x, d) => x + n0(d.montant), 0); return `<tr><td>${esc(p.lib)}</td><td>${esc((CATS.find(k => k[0] === p.cat) || ['', ''])[1])}</td><td class="n">${fcfa(p.montant)}</td><td class="n">${fcfa(real)}</td></tr>`; }).join('');
  const depRows = dep.map(d => `<tr><td>${fmtDate(d.date)}</td><td>${esc(((ex.postes || []).find(p => p.id === d.poste) || {}).lib || '')}</td><td>${esc(d.fournisseur || '')}</td><td>${esc(d.piece || '')}</td><td class="n">${fcfa(d.montant)}</td></tr>`).join('');
  return wrap('Comptes du syndicat ' + annee, `${entete(s, sy)}<h1>Comptes du syndicat — exercice ${esc(annee)}</h1>
    <table><thead><tr><th>Poste</th><th>Catégorie</th><th>Budget voté</th><th>Réalisé</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Aucun budget.</td></tr>'}</tbody><tfoot><tr><th colspan="2">Total</th><th class="n">${fcfa(cot.annuel)}</th><th class="n">${fcfa(dep.reduce((x, d) => x + n0(d.montant), 0))}</th></tr></tfoot></table>
    <p>Cotisations appelées : <b>${fcfa(appele)}</b> · encaissées : <b>${fcfa(encaisse)}</b>. Part affectée à la rémunération du syndic, aux commissions et appuis : <b>${Math.round(cot.taux * 1000) / 10} %</b> (plafond légal : 30 %, art. 397).</p>
    <h2>Dépenses</h2><table><thead><tr><th>Date</th><th>Poste</th><th>Fournisseur</th><th>Pièce</th><th>Montant</th></tr></thead><tbody>${depRows || '<tr><td colspan="5">Aucune dépense.</td></tr>'}</tbody></table>
    <p style="font-size:9pt">Tout copropriétaire peut consulter les pièces comptables et les quittances du syndicat (art. 390). Comptes contrôlés par le conseil syndical, qui fait office de commissaire aux comptes (art. 393).</p>`);
}
