import React from "react";

/**
 * Tuiles d'organisation (bureaux, grades, Administration) partagées par les onglets
 * de l'Administration : Utilisateurs, CGESN-Board, Validateur RH, Consentements, Profils.
 *
 * Charte du Portail Digital CGESN : vert #0f5c52 / #0d3b3f, accent or, police Poppins.
 * Grille : 4 colonnes sur grand écran, 3 sur PC, 2 sur tablette, 1 sur mobile.
 */
const CSS = `
.ot-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;font-family:'Poppins',Helvetica,Arial,sans-serif}
@media (max-width:1180px){.ot-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:860px){.ot-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}}
@media (max-width:520px){.ot-grid{grid-template-columns:minmax(0,1fr);gap:10px}}

.ot-tile{--ac:#0f5c52;--ac2:#14806f;--soft:oklch(0.965 0.025 165);position:relative;min-width:0;display:flex;flex-direction:column;gap:14px;text-align:left;
  padding:18px 18px 14px;border-radius:18px;border:1px solid oklch(0.915 0.006 165);background:#fff;cursor:pointer;color:oklch(0.24 0.01 90);
  font:inherit;box-shadow:0 1px 2px rgba(13,59,63,.04),0 6px 18px -12px rgba(13,59,63,.18);overflow:hidden;
  transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
.ot-tile::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,var(--ac),var(--ac2));opacity:0;transition:opacity .16s}
.ot-tile:hover{transform:translateY(-2px);border-color:oklch(0.8 0.05 165);box-shadow:0 2px 4px rgba(13,59,63,.05),0 16px 32px -16px rgba(13,59,63,.32)}
.ot-tile:hover::before{opacity:.55}
.ot-tile:focus-visible{outline:3px solid oklch(0.72 0.12 165 / .45);outline-offset:2px}
.ot-tile.is-on{border-color:var(--ac);box-shadow:0 0 0 1px var(--ac),0 18px 36px -18px rgba(15,92,82,.45);background:linear-gradient(180deg,var(--soft),#fff 70%)}
.ot-tile.is-on::before{opacity:1}
.ot-tile.is-muted{opacity:.62}
.ot-tile.is-muted:hover,.ot-tile.is-muted.is-on{opacity:1}

.ot-head{display:flex;align-items:flex-start;gap:12px;min-width:0}
.ot-ico{width:40px;height:40px;flex-shrink:0;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--soft);color:var(--ac)}
.ot-titles{min-width:0;flex:1}
.ot-label{font-size:12.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;line-height:1.3;color:oklch(0.22 0.02 165);overflow-wrap:anywhere}
.ot-sub{font-size:11.5px;color:oklch(0.55 0.01 165);margin-top:2px;line-height:1.35;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.ot-badge{flex-shrink:0;min-width:24px;height:24px;padding:0 8px;border-radius:100px;display:inline-flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;background:oklch(0.62 0.16 40);color:#fff;box-shadow:0 0 0 3px oklch(0.62 0.16 40 / .15)}
.ot-badge.warn{background:oklch(0.95 0.06 80);color:oklch(0.5 0.13 60);box-shadow:none}

.ot-value{display:flex;align-items:baseline;gap:7px;line-height:1}
.ot-value b{font-size:34px;font-weight:700;letter-spacing:-.03em;color:oklch(0.2 0.02 165)}
.ot-value span{font-size:13px;font-weight:500;color:oklch(0.5 0.01 165)}
.ot-note{font-size:12px;color:oklch(0.45 0.01 165);margin-top:-6px;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ot-note b{font-weight:600;color:oklch(0.25 0.02 165)}
.ot-note.warn{color:oklch(0.55 0.13 60);font-weight:600}

.ot-bar{display:flex;flex-direction:column;gap:5px}
.ot-bar-track{height:6px;border-radius:6px;background:oklch(0.94 0.008 165);overflow:hidden}
.ot-bar-track i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--ac),var(--ac2));transition:width .4s ease}
.ot-bar-label{display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:oklch(0.55 0.01 165)}

.ot-foot{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);align-items:center;gap:0;margin:0 -18px -14px;padding:11px 18px;border-top:1px solid oklch(0.94 0.006 165);background:oklch(0.985 0.004 165)}
.ot-stat{min-width:0;display:flex;flex-direction:column;gap:1px}
.ot-stat + .ot-stat{padding-left:12px;border-left:1px solid oklch(0.92 0.006 165)}
.ot-stat small{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:oklch(0.58 0.01 165);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ot-stat strong{font-size:14px;font-weight:700;color:oklch(0.25 0.02 165);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ot-stat.small strong{font-size:12px;font-weight:600}
.ot-stat.warn strong{color:oklch(0.56 0.14 55)}
.ot-stat.ok strong{color:#0f5c52}

/* Administration : bloc premium vert profond et or */
.ot-tile.is-admin{--ac:oklch(0.78 0.13 80);--ac2:oklch(0.7 0.14 65);background:linear-gradient(145deg,#0d3b3f 0%,#0f5c52 100%);border-color:#0d3b3f;color:#fff}
.ot-tile.is-admin .ot-ico{background:rgba(255,255,255,.12);color:oklch(0.82 0.13 85)}
.ot-tile.is-admin .ot-label,.ot-tile.is-admin .ot-value b{color:#fff}
.ot-tile.is-admin .ot-sub,.ot-tile.is-admin .ot-value span,.ot-tile.is-admin .ot-note,.ot-tile.is-admin .ot-bar-label{color:oklch(0.88 0.03 165)}
.ot-tile.is-admin .ot-note b{color:#fff}
.ot-tile.is-admin .ot-note.warn{color:oklch(0.85 0.12 80)}
.ot-tile.is-admin .ot-bar-track{background:rgba(255,255,255,.16)}
.ot-tile.is-admin .ot-foot{background:rgba(0,0,0,.14);border-top-color:rgba(255,255,255,.1)}
.ot-tile.is-admin .ot-stat + .ot-stat{border-left-color:rgba(255,255,255,.14)}
.ot-tile.is-admin .ot-stat small{color:oklch(0.82 0.03 165)}
.ot-tile.is-admin .ot-stat strong{color:#fff}
.ot-tile.is-admin .ot-stat.warn strong{color:oklch(0.84 0.13 80)}
.ot-tile.is-admin:hover{border-color:#0d3b3f}
.ot-tile.is-admin.is-on{box-shadow:0 0 0 3px oklch(0.78 0.13 80),0 18px 36px -18px rgba(13,59,63,.6);background:linear-gradient(145deg,#0d3b3f 0%,#0f5c52 100%)}

/* Non affectés / sans bureau */
.ot-tile.is-warn{--ac:oklch(0.62 0.14 60);--ac2:oklch(0.7 0.13 75);--soft:oklch(0.97 0.035 85)}

@media (max-width:520px){
  .ot-tile{padding:16px 16px 12px;gap:12px}
  .ot-foot{margin:0 -16px -12px;padding:10px 16px}
  .ot-value b{font-size:30px}
}
`;

const ICONS = {
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.6 3.5 6" /></>,
  alert: <><path d="M12 3l9.5 17h-19L12 3z" /><path d="M12 10v4M12 17.5v.01" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.6 2.6L16 9.6" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M14 9l2 2" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></>
};

export function OrgIcon({ name = "pin", size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name] || ICONS.pin}
    </svg>
  );
}

export function OrgTiles({ children, label = "Bureaux", style }) {
  return (
    <>
      <style>{CSS}</style>
      <section className="ot-grid" aria-label={label} style={style}>{children}</section>
    </>
  );
}

/**
 * @param {object} p
 * @param {string} p.label          titre de la tuile
 * @param {string} [p.sub]          sous-titre (description courte)
 * @param {string} [p.icon]         pin | shield | user | users | alert | check | key
 * @param {number|string} p.value   chiffre principal
 * @param {string} [p.unit]         unité du chiffre principal
 * @param {React.ReactNode} [p.note] ligne d'information sous le chiffre
 * @param {boolean} [p.noteWarn]
 * @param {number} [p.progress]     0-100 : barre de progression
 * @param {string} [p.progressLabel]
 * @param {Array<{label:string,value:any,tone?:'warn'|'ok'}>} [p.stats] pied de tuile
 * @param {number} [p.badge]        pastille (ex. demandes en attente)
 * @param {'alert'|'warn'} [p.badgeTone]
 * @param {'admin'|'warn'} [p.variant]
 * @param {boolean} [p.active]
 * @param {boolean} [p.muted]       tuile vide, atténuée
 */
export function OrgTile({ label, sub, icon = "pin", value, unit, note, noteWarn, progress, progressLabel, stats, badge, badgeTone = "alert", badgeTitle, variant, active, muted, onClick, title }) {
  const cls = ["ot-tile", active && "is-on", variant === "admin" && "is-admin", variant === "warn" && "is-warn", muted && !active && "is-muted"].filter(Boolean).join(" ");
  const pct = typeof progress === "number" ? Math.max(0, Math.min(100, Math.round(progress))) : null;
  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={!!active} title={title || label}>
      <div className="ot-head">
        <span className="ot-ico"><OrgIcon name={icon} /></span>
        <div className="ot-titles">
          <div className="ot-label">{label}</div>
          {sub && <div className="ot-sub">{sub}</div>}
        </div>
        {badge > 0 && <span className={`ot-badge ${badgeTone === "warn" ? "warn" : ""}`} title={badgeTitle}>{badge}</span>}
      </div>

      <div className="ot-value"><b>{value}</b>{unit && <span>{unit}</span>}</div>
      {note && <div className={`ot-note ${noteWarn ? "warn" : ""}`} title={typeof note === "string" ? note : undefined}>{note}</div>}

      {pct !== null && (
        <div className="ot-bar">
          <div className="ot-bar-track"><i style={{ width: `${pct}%` }} /></div>
          {progressLabel && <div className="ot-bar-label"><span>{progressLabel}</span><span>{pct} %</span></div>}
        </div>
      )}

      {stats && stats.length > 0 && (
        <div className="ot-foot">
          {stats.map((s) => (
            <div key={s.label} className={`ot-stat ${s.tone || ""}`}>
              <small>{s.label}</small>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export default OrgTiles;
