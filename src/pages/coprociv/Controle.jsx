import React from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { compute, controlesEDD, PHASES, CHECK_PHASE, CHECK_SCREEN, ROLE_NAV } from '@/lib/engine';
import { Card, Btn, Pill, Mono, C } from '@/components/coprociv/ui';

const OKC = 'oklch(0.55 0.13 155)', KOC = 'oklch(0.62 0.15 55)';
const fmtD = t => t ? new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

function Cachet({ titre, qui, fait, attente, detail, action }) {
  return (
    <div style={{ flex: 1, minWidth: 260, border: '1.5px solid ' + (fait ? 'var(--gold)' : C.line), borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: fait ? 'oklch(0.97 0.03 85)' : 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, background: fait ? 'var(--gold)' : 'oklch(0.95 0.01 85)', color: fait ? 'var(--b0)' : C.muted }}>{fait ? '✓' : '·'}</span>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--b0)' }}>{titre}</div>
          <div style={{ fontSize: 13, color: C.muted }}>{qui}</div>
        </div>
      </div>
      <div style={{ fontSize: 14 }}>{fait ? detail : attente}</div>
      {action}
    </div>
  );
}

export default function Controle() {
  const { state, setScreen, setCertified, setValidated } = useCopro();
  const role = state.role;
  const c = compute(state);
  const checks = controlesEDD(state, c);
  const ready = checks.every(x => x.ok);
  const nbKo = checks.filter(x => !x.ok).length;
  const allowed = ROLE_NAV[role] || [];
  const certif = (state.meta || {}).certif, valid = (state.meta || {}).valid;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card title="Certification et validation" right={<Pill tone={state.validated ? 'ok' : state.certified ? 'navy' : ready ? 'neutral' : 'warn'}>{state.validated ? 'Validé par le notaire' : state.certified ? 'Certifié, en attente du notaire' : ready ? 'Prêt à certifier' : nbKo + ' point' + (nbKo > 1 ? 's' : '') + ' à corriger'}</Pill>}>
        {(state.staleCertif || state.staleValid) && (
          <div role="alert" style={{ padding: '10px 12px', borderRadius: 10, background: 'oklch(0.95 0.05 55)', color: 'oklch(0.4 0.12 55)', fontSize: 14, fontWeight: 600 }}>
            Le dossier a été modifié depuis {state.staleCertif ? 'la certification' : 'la validation'} : elle n'est plus valable. {state.staleCertif ? 'Le géomètre doit certifier à nouveau.' : 'Le notaire doit valider à nouveau.'}
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Cachet titre="1. Certification" qui="Géomètre-expert" fait={state.certified}
            attente={ready ? 'Tous les contrôles sont conformes : l\'état descriptif peut être certifié.' : 'Corrigez d\'abord les points signalés ci-dessous.'}
            detail={certif ? <span>Certifié le {fmtD(certif.le)} par {certif.nom || certif.par}<br /><span style={{ fontSize: 13, color: C.muted }}>Empreinte <Mono>{String(certif.empreinte).slice(0, 12)}</Mono></span></span> : 'Certifié.'}
            action={role === 'geometre' && (state.certified
              ? <Btn variant="ghost" onClick={() => setCertified(false)}>Retirer la certification</Btn>
              : <Btn variant="official" onClick={() => setCertified(true)} disabled={!ready}>Certifier l'EDD</Btn>)} />
          <Cachet titre="2. Validation" qui="Notaire" fait={state.validated}
            attente={state.certified ? 'L\'EDD certifié attend la relecture et la validation du notaire.' : 'Disponible une fois l\'EDD certifié par le géomètre.'}
            detail={valid ? <span>Validé le {fmtD(valid.le)} par {valid.nom || valid.par}</span> : 'Validé.'}
            action={role === 'notaire' && (state.validated
              ? <Btn variant="ghost" onClick={() => setValidated(false)}>Retirer la validation</Btn>
              : <Btn variant="official" onClick={() => setValidated(true)} disabled={!state.certified}>Valider l'EDD</Btn>)} />
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>La certification et la validation sont liées à l'empreinte du contenu : toute modification d'un lot, d'un coefficient, d'une grille ou du règlement les annule automatiquement.</div>
      </Card>

      <Card title={`Contrôles (${checks.length - nbKo} / ${checks.length} conformes)`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {PHASES.filter(p => p[0] !== 'finaliser').map(([k, l]) => {
            const list = checks.filter(x => CHECK_PHASE[x.id] === k);
            const ko = list.filter(x => !x.ok).length;
            return (
              <section key={k} style={{ border: '1px solid ' + C.soft, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: 16, color: 'var(--b0)' }}>{l}</h4>
                  <Pill tone={ko ? 'warn' : 'ok'}>{ko ? ko + ' à corriger' : 'Conforme'}</Pill>
                </div>
                {list.map(x => {
                  const go = CHECK_SCREEN[x.id];
                  return (
                    <div key={x.id} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr) auto', gap: 8, alignItems: 'start', fontSize: 14, padding: '4px 0' }}>
                      <span aria-hidden style={{ color: x.ok ? OKC : KOC, fontWeight: 800 }}>{x.ok ? '✓' : '!'}</span>
                      <span style={{ color: x.ok ? 'inherit' : 'oklch(0.42 0.12 55)' }}>{x.t}</span>
                      {!x.ok && allowed.includes(go) && <button onClick={() => setScreen(go)} style={{ border: 0, background: 'transparent', color: 'var(--b0)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 14, padding: 0 }}>Corriger</button>}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={() => setScreen('docs')}>Aller aux documents →</Btn>
      </div>
    </div>
  );
}
