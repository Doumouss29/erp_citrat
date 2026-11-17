import { formatCurrency, formatDate } from './caisseUtils';
import { escapeHtml } from '@/lib/htmlUtils';
import { CGESN_LOGO_DATA_URI } from './cgesnLogo';

function montantEnLettresPrint(montant) {
  const n = Math.round(Number(montant));
  if (!n || isNaN(n)) return '';
  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  function conv100(n) {
    if (n === 0) return '';
    if (n < 20) return unites[n];
    const d = Math.floor(n / 10), u = n % 10;
    if (d === 7) return u === 1 ? 'soixante et onze' : u === 0 ? 'soixante-dix' : `soixante-${unites[10 + u]}`;
    if (d === 8) return u === 0 ? 'quatre-vingts' : `quatre-vingt-${unites[u]}`;
    if (d === 9) return `quatre-vingt-${unites[10 + u]}`;
    return dizaines[d] + (u === 1 && d !== 8 ? ' et ' : u !== 0 ? '-' : '') + unites[u];
  }
  function convTranche(n) {
    if (n === 0) return '';
    const c = Math.floor(n / 100), r = n % 100;
    const cent = c === 0 ? '' : c === 1 ? 'cent' : `${unites[c]} cents`;
    const reste = conv100(r);
    if (c > 1 && r === 0) return cent;
    return [cent, reste].filter(Boolean).join(' ');
  }
  const millions = Math.floor(n / 1000000);
  const milliers = Math.floor((n % 1000000) / 1000);
  const centaines = n % 1000;
  const parts = [];
  if (millions > 0) parts.push(millions === 1 ? 'un million' : `${convTranche(millions)} millions`);
  if (milliers > 0) parts.push(milliers === 1 ? 'mille' : `${convTranche(milliers)} mille`);
  if (centaines > 0) parts.push(convTranche(centaines));
  const res = parts.join(' ');
  return (res.charAt(0).toUpperCase() + res.slice(1) + ' francs CFA').toUpperCase();
}

// Génère une fiche A4 contenant deux exemplaires identiques du bon :
// un pour le client, un pour l'archive, séparés par une ligne de découpe.
export function buildBonCaissePrintHtml(operation, bureauNom) {
  const isEntree = operation?.type_operation === 'entree';
  const title = isEntree ? "BON D'ENTRÉE DE CAISSE" : 'BON DE SORTIE DE CAISSE';
  const numerobon = operation?.numero_bon || '';
  const bureauDisplay = bureauNom || operation?.bureau_nom || operation?.bureau_code || '';

  const modeReglementLabels = {
    espece: 'Espèces',
    cheque: 'Chèque',
    virement: 'Virement bancaire',
    mobile_pay: 'Mobile Money',
  };
  const modeReglement = modeReglementLabels[operation?.mode_reglement] || operation?.mode_reglement || '';
  const montantLettres = operation?.montant_lettres || montantEnLettresPrint(operation?.montant);

  const copy = () => `
    <section class="bon">
      <header class="header">
        <img class="logo" src="${CGESN_LOGO_DATA_URI}" alt="CITRAT" />
        <div class="header-text">
          <h1>Cabinet de Géomètre Expert Soro Nanga Sarl</h1>
          <p>Foncier – SIG – VRD – Topographie – Géodésie – Formations</p>
          <p>cgesn2007@yahoo.fr &nbsp;·&nbsp; Tél : 27 20 37 02 05 / 05 05 42 52 69 / 01 01 40 00 06</p>
        </div>
      </header>

      <div class="title-band">
        <div class="title-left">
          ${bureauDisplay ? `<div class="bureau-name">Bureau de ${escapeHtml(bureauDisplay)}</div>` : ''}
          <div class="bon-title">${title}</div>
        </div>
        <div class="meta-row">
          <div class="meta-block">
            <label>N°</label>
            <div class="meta-value numero">${escapeHtml(numerobon || '—')}</div>
          </div>
          <div class="meta-block">
            <label>Date</label>
            <div class="meta-value">${formatDate(operation.date_operation)}</div>
          </div>
        </div>
      </div>

      <div class="fields-grid">
        <div class="field">
          <label>Nom et prénoms</label>
          <div class="field-value">${escapeHtml(operation.beneficiaire || '')}</div>
        </div>
        <div class="field">
          <label>Mode de paiement</label>
          <div class="field-value">${escapeHtml(modeReglement)}</div>
        </div>
        <div class="field full">
          <label>${isEntree ? 'Objet' : 'Motif de sortie'}</label>
          <div class="field-value">${escapeHtml(operation.description || '')}</div>
        </div>
      </div>

      <div class="montant-grid">
        <div class="montant-box">
          <label>Montant</label>
          <div class="montant-chiffres">${formatCurrency(operation.montant)}</div>
        </div>
        <div class="montant-box lettres">
          <label>Montant en lettres</label>
          <div class="montant-lettres">${escapeHtml(montantLettres)}</div>
        </div>
      </div>

      <div class="signatures">
        <div class="signature-box">
          <strong>Visa du Client</strong>
          <div class="sig-spacer"></div>
          <span>${operation.beneficiaire ? escapeHtml(operation.beneficiaire) : 'Signature et contact'}</span>
        </div>
        <div class="signature-box">
          <strong>Visa de la Trésorerie</strong>
          <div class="sig-spacer"></div>
          <span>${escapeHtml(operation.secretaire_nom || 'Nom et signature')}</span>
        </div>
      </div>
    </section>
  `;

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title} ${escapeHtml(numerobon)}</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { font-family: Arial, sans-serif; color: #0f172a; background: #f0f4f8; }
          body { padding: 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sheet { width: 194mm; margin: 0 auto; background: #fff; }

          .bon {
            height: 134mm;
            border: 1px solid #cbd5e1; border-radius: 8px;
            padding: 5mm 7mm 5mm;
            display: flex; flex-direction: column; gap: 3.5mm;
            overflow: hidden;
          }
          .cut {
            height: 9mm; display: flex; align-items: center; gap: 8px;
            color: #94a3b8; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase;
          }
          .cut::before, .cut::after { content: ''; flex: 1; border-top: 1px dashed #94a3b8; }

          /* En-tête : logo à gauche du texte, sans trait */
          .header { display: flex; align-items: center; justify-content: center; gap: 4mm; }
          .header .logo { width: 20mm; height: 20mm; object-fit: contain; flex-shrink: 0; }
          .header-text { text-align: center; }
          .header-text h1 { font-size: 15px; font-weight: 800; color: #1e3a8a; margin-bottom: 3px; }
          .header-text p { font-size: 9.5px; color: #475569; line-height: 1.45; }

          /* Bande titre : titre à gauche, N° et date à droite */
          .title-band {
            display: flex; align-items: center; justify-content: space-between; gap: 4mm;
            background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 3mm 4mm;
          }
          .bureau-name {
            font-size: 10px; font-weight: 700; color: #475569; letter-spacing: 0.1em;
            text-transform: uppercase; margin-bottom: 2px;
          }
          .bon-title { font-size: 19px; font-weight: 900; color: #1e3a8a; letter-spacing: 0.03em; }
          .meta-row { display: flex; gap: 3mm; flex-shrink: 0; }
          .meta-block {
            display: flex; flex-direction: column; align-items: center; min-width: 32mm;
            border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; background: #fff;
          }
          .meta-block label, .field label, .montant-box label {
            font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em;
          }
          .meta-block .meta-value { font-size: 12.5px; font-weight: 700; color: #0f172a; margin-top: 2px; }
          .meta-block .meta-value.numero { color: #dc2626; }

          /* Champs */
          .fields-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 3mm 8mm; }
          .field { display: flex; flex-direction: column; gap: 3px; }
          .field.full { grid-column: 1 / -1; }
          .field .field-value {
            font-size: 12.5px; color: #0f172a; border-bottom: 1px dotted #94a3b8;
            padding-bottom: 3px; min-height: 20px;
          }

          /* Montant : chiffres et lettres côte à côte */
          .montant-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 3mm; }
          .montant-box {
            background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 2.5mm 4mm;
            display: flex; flex-direction: column; justify-content: center; gap: 2px;
          }
          .montant-chiffres { font-size: 18px; font-weight: 800; color: #1e3a8a; }
          .montant-lettres { font-size: 11.5px; color: #334155; font-style: italic; font-weight: 600; }

          /* Signatures : occupent l'espace restant */
          .signatures { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; min-height: 24mm; }
          .signature-box {
            border: 1px solid #cbd5e1; border-radius: 8px; padding: 2.5mm 4mm; text-align: center;
            display: flex; flex-direction: column; align-items: center;
          }
          .signature-box strong {
            font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.05em;
          }
          .signature-box .sig-spacer { flex: 1; width: 100%; border-bottom: 1px dotted #94a3b8; margin-bottom: 4px; }
          .signature-box span { font-size: 10px; color: #475569; }

          @media print {
            html, body { background: #fff; padding: 0; }
            .sheet { width: 100%; page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          ${copy()}
          <div class="cut">✂ découper ici</div>
          ${copy()}
        </div>
      </body>
    </html>
  `;
}

export default function BonsCaissePrintTemplate() {
  return null;
}
