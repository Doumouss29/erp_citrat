import React, { useState, useEffect } from 'react';
import { CoprocivProvider as CProvider, useCopro } from '@/lib/coprocivStore';
import { ROLE_NAV } from '@/lib/engine';
import { useIsMobile } from '@/hooks/use-mobile';
import Sidebar from '@/components/coprociv/Sidebar';
import Header from '@/components/coprociv/Header';
import Toast from '@/components/coprociv/Toast';
import { AccueilProfil } from '@/components/coprociv/AccueilConnexion';
import MesDossiers from '@/pages/coprociv/MesDossiers';
import NouveauDossier from '@/pages/coprociv/NouveauDossier';
import VueEnsemble from '@/pages/coprociv/VueEnsemble';
import LotsPlans from '@/pages/coprociv/LotsPlans';
import Tantienes from '@/pages/coprociv/Tantienes';
import ChargesSpeciales from '@/pages/coprociv/ChargesSpeciales';
import Reglement from '@/pages/coprociv/Reglement';
import EDD from '@/pages/coprociv/EDD';
import Coproprietaires from '@/pages/coprociv/Coproprietaires';
import Syndic from '@/pages/coprociv/Syndic';
import Portail from '@/pages/coprociv/Portail';
import Immeuble from '@/pages/coprociv/Immeuble';
import PartiesCommunesPage from '@/pages/coprociv/PartiesCommunesPage';
import Controle from '@/pages/coprociv/Controle';
import Documents from '@/pages/coprociv/Documents';
import Administration from '@/pages/coprociv/Administration';

// La page d'accueil s'affiche à chaque entrée dans le module ; un simple rechargement de page ne la remontre pas.
const ENTERED_KEY = 'coprociv_entree';
const wasEntered = () => { try { return sessionStorage.getItem(ENTERED_KEY) === '1'; } catch (e) { return false; } };

function Shell() {
  const { state, setScreen, canAdmin } = useCopro();
  const isMobile = useIsMobile();
  const [menu, setMenu] = useState(false);
  const [entered, setEntered] = useState(wasEntered);
  const role = state.role || 'geometre';
  const nav = ROLE_NAV[role] || ROLE_NAV.lecture;
  let screen = state.screen || 'dossiers';

  useEffect(() => { setMenu(false); }, [state.screen, state.did]);

  if (screen === 'admin' && !canAdmin) screen = 'dossiers';
  if (!state.did && screen !== 'dossiers' && screen !== 'admin' && !(screen === 'new' && role === 'geometre')) screen = 'dossiers';
  if (state.did && screen !== 'dossiers' && screen !== 'new' && screen !== 'admin' && !nav.includes(screen)) screen = nav[0] || 'overview';

  // Écran réellement affiché (selon le profil) : on le reflète dans l'état pour le titre et le menu.
  useEffect(() => { if (screen !== state.screen) setScreen(screen); }, [screen, state.screen, setScreen]);

  useEffect(() => () => { try { sessionStorage.removeItem(ENTERED_KEY); } catch (e) { /* stockage indisponible */ } }, []);

  if (!entered) {
    return <AccueilProfil onEnter={() => { try { sessionStorage.setItem(ENTERED_KEY, '1'); } catch (e) { /* stockage indisponible */ } setEntered(true); }} />;
  }

  const goHome = () => {
    try { sessionStorage.removeItem(ENTERED_KEY); } catch (e) { /* stockage indisponible */ }
    setEntered(false);
  };

  let body;
  switch (screen) {
    case 'dossiers': body = <MesDossiers />; break;
    case 'new': body = <NouveauDossier />; break;
    case 'overview': body = <VueEnsemble />; break;
    case 'immeuble': body = <Immeuble />; break;
    case 'lots': body = <LotsPlans />; break;
    case 'pc': body = <PartiesCommunesPage />; break;
    case 'controle': body = <Controle />; break;
    case 'docs': body = <Documents />; break;
    case 'tant': body = <Tantienes />; break;
    case 'charges': body = <ChargesSpeciales />; break;
    case 'regl': body = <Reglement />; break;
    case 'edd': body = <EDD />; break;
    case 'owners': body = <Coproprietaires />; break;
    case 'syndic': body = <Syndic />; break;
    case 'portail': body = <Portail />; break;
    case 'admin': body = <Administration />; break;
    default: body = <MesDossiers />;
  }

  return (
    <div className={isMobile ? 'cp-mobile' : ''} style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : '296px minmax(0, 1fr)', minHeight: '100vh', background: '#F6F3EC', color: 'oklch(0.24 0.020 var(--h))', fontFamily: 'Manrope, system-ui, sans-serif', fontSize: 14 }}>
      {isMobile ? (
        menu && (
          <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(15,29,61,.45)' }}>
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', left: 0, top: 0, bottom: 0 }}><Sidebar onHome={goHome} /></div>
          </div>
        )
      ) : <Sidebar onHome={goHome} />}
      <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header onMenu={isMobile ? () => setMenu(true) : null} />
        <div style={{ padding: isMobile ? '16px 16px 48px' : '24px 32px 56px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {role === 'lecture' && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'oklch(0.95 0.05 70)', color: 'oklch(0.38 0.11 60)', fontSize: 13.5, fontWeight: 600 }}>
              Aucun profil ne vous a encore été attribué : accès en lecture seule. Demandez à l’administrateur de vous définir comme géomètre-expert ou notaire.
            </div>
          )}
          {body}
        </div>
      </main>
      <Toast />
    </div>
  );
}

export default function Coprociv() {
  return (
    <CProvider>
      <Shell />
    </CProvider>
  );
}
