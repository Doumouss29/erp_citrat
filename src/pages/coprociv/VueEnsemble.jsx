import React from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { compute, f, fm, controlesEDD, phasesEtat, CHECK_SCREEN, ROLE_NAV, NAV } from '@/lib/engine';
import { Card, Stat, Pill, Btn, Mono, C } from '@/components/coprociv/ui';

const label = k => (NAV.find(n => n[0] === k) || [k, k])[1];

// Tableau de bord : chiffres clés, points à corriger (ou prochaine étape quand tout est conforme), notes et historique.
export default function VueEnsemble() {
  const { state, setScreen, setNotes } = useCopro();
  const role = state.role || 'geometre';
  const allowed = ROLE_NAV[role] || [];
  const c = compute(state);
  const checks = controlesEDD(state, c);
  const ko = checks.filter(x => !x.ok);
  const etats = phasesEtat(state, checks);
  const journal = (state.journals || {})[state.did] || [];
  const balanced = c.sumTg === state.baseGen;
  const fmtT = t => new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  // Prochaine action selon le profil et l'avancement.
  let next;
  if (role === 'notaire') {
    next = state.validated ? { t: 'L\'EDD est validé.', d: 'Les documents officiels peuvent être téléchargés sans la mention PROJET.', go: 'docs', b: 'Ouvrir les documents' }
      : state.certified ? { t: 'L\'EDD certifié attend votre validation.', d: 'Relisez l\'état descriptif et le règlement, puis apposez votre validation.', go: 'edd', b: 'Relire l\'EDD' }
        : { t: 'En attente de la certification du géomètre.', d: ko.length ? ko.length + ' point(s) restent à corriger par le géomètre.' : 'Le dossier est complet ; le géomètre doit le certifier.', go: 'regl', b: 'Relire le règlement' };
  } else {
    const first = etats.find(p => !p.done && p.k !== 'finaliser');
    const firstKo = first ? ko.find(x => first.screens.includes(CHECK_SCREEN[x.id])) : null;
    next = first && firstKo ? { t: `${first.l} : ${first.label}.`, d: firstKo.t, go: CHECK_SCREEN[firstKo.id], b: 'Ouvrir ' + label(CHECK_SCREEN[firstKo.id]) }
      : !state.certified ? { t: 'Le dossier est complet.', d: 'Tous les contrôles sont conformes : vous pouvez certifier l\'état descriptif.', go: 'controle', b: 'Certifier l\'EDD' }
        : !state.validated ? { t: 'EDD certifié, en attente du notaire.', d: 'Invitez le notaire depuis la page Immeuble s\'il n\'a pas encore accès au dossier.', go: 'docs', b: 'Ouvrir les documents' }
          : { t: 'EDD validé par le notaire.', d: 'Les documents officiels sont disponibles sans la mention PROJET.', go: 'docs', b: 'Ouvrir les documents' };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <Stat label="Lots" value={c.rows.length} sub={state.bats.length + ' bâtiment(s)' + (state.hasSS ? ' + sous-sol' : '')} />
        <Stat label="Surface privative" value={fm(c.totalSu) + ' m²'} sub={'pondérée : ' + f(c.totalSp, 0)} />
        <Stat label="Tantièmes généraux" value={c.sumTg + ' / ' + state.baseGen} sub={balanced ? 'équilibrés' : 'déséquilibrés'} tone={balanced ? 'var(--b0)' : 'oklch(0.55 0.15 55)'} />
        <Stat label="Copropriétaires" value={(state.owners || []).length} sub={state.grids.length + ' grille(s) de charges'} />
      </div>

      <div className="cp-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 20, alignItems: 'stretch' }}>
        <Card title={ko.length ? 'Points à corriger' : 'Prochaine étape'} right={<Pill tone={ko.length ? 'warn' : 'ok'}>{ko.length ? ko.length + ' sur ' + checks.length : checks.length + ' contrôles conformes'}</Pill>}>
          {ko.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--b0)' }}>{next.t}</div>
              <div style={{ fontSize: 14, color: C.muted }}>{next.d}</div>
              {allowed.includes(next.go) && <Btn variant={next.go === 'controle' ? 'official' : 'primary'} onClick={() => setScreen(next.go)}>{next.b} →</Btn>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {ko.map((x, i) => {
                const go = CHECK_SCREEN[x.id];
                return (
                  <div key={x.id} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr) auto', gap: 10, alignItems: 'center', padding: '9px 0', borderTop: i ? '1px solid ' + C.soft : 0, fontSize: 14 }}>
                    <span aria-hidden style={{ color: 'oklch(0.62 0.15 55)', fontWeight: 800 }}>!</span>
                    <span>{x.t}</span>
                    {allowed.includes(go) && <Btn variant="ghost" onClick={() => setScreen(go)} style={{ height: 30, padding: '0 10px', fontSize: 13 }}>{label(go)}</Btn>}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card title="Notes du dossier" right={<Pill tone="neutral">non imprimées</Pill>}>
          <textarea value={state.notes || ''} onChange={e => setNotes(e.target.value)} disabled={role === 'lecture'} rows={4} placeholder="Points à vérifier, échanges avec le notaire, pièces attendues…" style={{ flex: 1, minHeight: 96, padding: 10, borderRadius: 8, border: '1px solid ' + C.line, fontSize: 14, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit' }} />
          <div style={{ fontSize: 12, color: C.muted }}>Visibles par les intervenants ; elles n'entrent ni dans les documents ni dans la certification.</div>
        </Card>
      </div>

      <Card title="Dernières modifications" right={allowed.includes('edd') && <Btn variant="ghost" onClick={() => setScreen('edd')}>Tout l'historique</Btn>}>
        {journal.length === 0 ? <div style={{ fontSize: 14, color: C.muted }}>Aucune modification enregistrée pour ce dossier.</div> : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {journal.slice(0, 8).map((e, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr) auto', gap: 12, alignItems: 'center', fontSize: 14, padding: '8px 0', borderTop: i ? '1px solid ' + C.soft : 0 }}>
                <Mono style={{ fontSize: 13, color: C.muted }}>{fmtT(e.t)}</Mono>
                <span style={{ color: 'var(--b0)', fontWeight: 600 }}>{e.txt}{e.before !== '—' || e.after !== '—' ? <span style={{ fontWeight: 400, color: C.muted }}> · {e.before} → {e.after}</span> : null}</span>
                <span style={{ fontSize: 13, color: C.muted }}>{e.who}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
