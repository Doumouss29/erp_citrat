import React, { useEffect, useRef, useState } from 'react';
import { useCopro } from '@/lib/coprocivStore';
import { useNavigate } from 'react-router-dom';
import { NAV, ROLES, ROLE_NAV, THEMES, PHASES, CHECK_SCREEN, compute, controlesEDD } from '@/lib/engine';

const initials = s => String(s || '?').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
const SECTION = { fontSize: 12, color: 'var(--sbm)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600, padding: '0 6px' };

export default function Sidebar({ onHome }) {
  const { state, setScreen, setRole, setTheme, canSwitchRole, canAdmin, isAdmin, user } = useCopro();
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const navigateToLogin = () => navigate('/connexion');
  const menuRef = useRef(null);
  const role = state.role || 'geometre';
  // Pendant la création d'un dossier, aucun dossier n'est « ouvert » : on n'affiche pas le précédent.
  const hasDossier = !!state.did && state.screen !== 'new';
  const info = state.info || {};
  const c = compute(state);
  const roleLabel = (ROLES.find(r => r[0] === role) || ['', 'Lecture seule'])[1];

  useEffect(() => {
    if (!menu) return;
    const close = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const allowed = ROLE_NAV[role] || ROLE_NAV.lecture;
  // Points à corriger par page (même liste de contrôles que la page Contrôle).
  const ko = {};
  if (hasDossier) controlesEDD(state, c).forEach(x => { if (!x.ok) { const k = CHECK_SCREEN[x.id]; ko[k] = (ko[k] || 0) + 1; } });
  const checked = new Set(Object.values(CHECK_SCREEN));
  let n = 0;
  const item = k => {
    const label = (NAV.find(x => x[0] === k) || [k, k])[1];
    const num = k === 'overview' ? '' : String(++n);
    // Indicateur unique et explicite : nombre de points à corriger (orange) ou ✓ (vert) ; rien pour les pages sans contrôle.
    const st = !hasDossier ? null : ko[k] ? { t: ko[k] + ' à corriger', c: 'oklch(0.80 0.13 70)' } : checked.has(k) ? { t: '✓', c: 'oklch(0.80 0.12 155)' }
      : null;
    return { k, label, num, st, active: hasDossier && state.screen === k };
  };
  // Pages dans l'ordre du travail ; un simple espace sépare les étapes, sans titre.
  const groups = [
    { k: 'top', items: allowed.filter(k => !PHASES.some(p => p[2].includes(k))).map(item) },
    ...PHASES.map(([k, , screens]) => ({ k, items: screens.filter(s => allowed.includes(s)).map(item) }))
  ].filter(g => g.items.length);
  const themes = Object.entries(THEMES).map(([k, t]) => ({ k, label: t.label, sw: t.sw, active: state.theme === k }));
  const goNav = k => { if (hasDossier) setScreen(k); };
  const who = user ? (user.full_name || user.email) : 'Mode local';

  return (
    <aside style={{
      position: 'sticky', top: 0, height: '100vh', width: 296, background: 'var(--sb0)', color: 'var(--sbt)',
      display: 'flex', flexDirection: 'column', padding: '20px 14px 16px 16px', gap: 18, overflowY: 'auto',
      borderRight: '1px solid var(--sbl)', overflowX: 'hidden', scrollbarGutter: 'stable', scrollbarWidth: 'thin', flexShrink: 0
    }}>
      <div aria-label="COPROCIV" style={{
        margin: '4px 4px 0', maxWidth: 260, minHeight: 44, aspectRatio: '1530 / 307',
        background: `left center / contain no-repeat url("${THEMES[state.theme || 'marine'].logo}")`
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => setScreen('dossiers')} style={{
          padding: 14, borderRadius: 10, background: 'var(--sb1)', border: '1px solid var(--sb3)',
          textAlign: 'left', color: 'inherit', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3
        }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--sbm)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            <span>{hasDossier ? 'Dossier ' + (info.ref || '') : 'Dossier'}</span><span>{hasDossier ? 'Changer' : ''}</span>
          </span>
          <span style={{ fontWeight: 700, fontSize: 16, marginTop: 4, lineHeight: 1.3 }}>{hasDossier ? info.nom : state.screen === 'new' ? 'Nouveau dossier' : 'Aucun dossier ouvert'}</span>
          <span style={{ fontSize: 13, color: 'var(--sbm)' }}>{hasDossier ? [info.adresse, info.commune].filter(Boolean).join(', ') : 'Mes dossiers'}</span>
        </button>
        {role === 'geometre' && state.screen !== 'new' && (
          <button onClick={() => setScreen('new')} style={{
            height: 40, borderRadius: 8, border: '1px dashed var(--sb5)', background: 'transparent',
            color: 'var(--sbm2)', fontWeight: 700, fontSize: 14, cursor: 'pointer'
          }}>+ Nouveau dossier</button>
        )}
      </div>

      <nav aria-label="Pages du dossier" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {groups.map((g, gi) => {
          return (
            <div key={g.k} style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingTop: gi ? 8 : 0, marginTop: gi ? 8 : 0, borderTop: gi ? '1px solid var(--sb2)' : 0 }}>
              {g.items.map(n => (
                <button key={n.k} onClick={() => goNav(n.k)} disabled={!hasDossier} aria-current={n.active ? 'page' : undefined} style={{
                  display: 'flex', alignItems: 'center', gap: 12, height: 38, padding: '0 12px', border: 0, borderRadius: 8,
                  background: n.active ? 'var(--sb2)' : 'transparent', boxShadow: n.active ? 'inset 3px 0 0 var(--gold)' : 'none',
                  color: n.active ? 'var(--sbt)' : (!hasDossier ? 'var(--sbm)' : 'var(--sbm2)'),
                  cursor: hasDossier ? 'pointer' : 'not-allowed', textAlign: 'left', fontSize: 15, fontWeight: 600, opacity: hasDossier ? 1 : 0.55
                }}>
                  {n.num && <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, background: n.active ? 'var(--gold)' : 'var(--sb2)', color: n.active ? 'var(--b0)' : 'var(--sbm2)', flexShrink: 0 }}>{n.num}</span>}
                  <span style={{ flex: 1 }}>{n.label}</span>
                  {n.st && <span style={{ fontSize: 12, fontWeight: 600, color: n.st.c, whiteSpace: 'nowrap' }}>{n.st.t}</span>}
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      <div ref={menuRef} style={{ marginTop: 'auto', position: 'relative' }}>
        {menu && (
          <div role="menu" style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(100% + 8px)', background: 'var(--sb1)', border: '1px solid var(--sb3)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 12px 32px rgba(0,0,0,.35)', zIndex: 10 }}>
            {canSwitchRole && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={SECTION}>Profil</div>
                {ROLES.map(([k, label, sub]) => (
                  <button key={k} role="menuitemradio" aria-checked={role === k} onClick={() => { setRole(k); setMenu(false); }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: 0, cursor: 'pointer', textAlign: 'left',
                    background: role === k ? 'var(--sb2)' : 'transparent', color: 'var(--sbt)'
                  }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid ' + (role === k ? 'var(--gold)' : 'var(--sb5)'), background: role === k ? 'var(--gold)' : 'transparent', flexShrink: 0 }} />
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
                      <span style={{ fontSize: 12, color: 'var(--sbm)' }}>{sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={SECTION}>Thème</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {themes.map(th => (
                  <button key={th.k} onClick={() => setTheme(th.k)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 36, borderRadius: 8,
                    border: '1.5px solid ' + (th.active ? 'var(--gold)' : 'var(--sb3)'),
                    background: 'var(--sb0)', color: 'var(--sbt)', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                  }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: `linear-gradient(135deg, ${th.sw} 50%, var(--gold) 50%)`, boxShadow: '0 0 0 1.5px rgba(255,255,255,.9)' }} />{th.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Administration : uniquement dans le menu du compte administrateur, jamais dans la navigation des profils métier. */}
            {canAdmin && (
              <button role="menuitem" onClick={() => { setScreen('admin'); setMenu(false); }} style={{
                display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                border: '1px solid ' + (state.screen === 'admin' ? 'var(--gold)' : 'var(--sb3)'), background: state.screen === 'admin' ? 'var(--sb2)' : 'transparent',
                color: 'var(--sbt)', fontSize: 14, fontWeight: 700
              }}>
                <span aria-hidden>⚙</span><span style={{ flex: 1 }}>Administration</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Admin</span>
              </button>
            )}
            <div style={{ borderTop: '1px solid var(--sb3)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {user && <div style={{ fontSize: 12, color: 'var(--sbm)', padding: '0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Connecté : {user.email}</div>}
              <button role="menuitem" onClick={() => { setMenu(false); onHome(); }} style={{ height: 38, borderRadius: 8, border: '1px solid var(--sb3)', background: 'transparent', color: 'var(--sbt)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span aria-hidden>⌂</span>Retour à l’accueil
              </button>
              {/* Déconnexion : uniquement depuis le portail (menu profil), pas dans les applications. */}
              {!user && (
                <button role="menuitem" onClick={() => { setMenu(false); navigateToLogin(); }} style={{ height: 38, borderRadius: 8, border: 0, background: 'var(--gold)', color: 'var(--b0)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Se connecter
                </button>
              )}
            </div>
          </div>
        )}
        <button onClick={() => setMenu(v => !v)} aria-haspopup="menu" aria-expanded={menu} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
          background: menu ? 'var(--sb2)' : 'var(--sb1)', border: '1px solid var(--sb3)', color: 'var(--sbt)', cursor: 'pointer', textAlign: 'left'
        }}>
          <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold)', color: 'var(--b0)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{initials(who)}</span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who}</span>
            <span style={{ fontSize: 13, color: 'var(--sbm)' }}>{isAdmin ? 'Administrateur · vue ' + roleLabel : roleLabel}</span>
          </span>
          <span aria-hidden style={{ fontSize: 12, color: 'var(--sbm)' }}>{menu ? '▾' : '▴'}</span>
        </button>
      </div>
    </aside>
  );
}
