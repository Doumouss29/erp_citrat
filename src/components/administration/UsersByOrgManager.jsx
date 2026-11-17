import { FormSelect } from "@/components/ui/form-select";
import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DEPARTEMENTS as LEGACY_DEPARTEMENTS } from "@/lib/rhReferentiels";
import { profileApps, getProfile } from "@/lib/accessProfiles";
import { OrgTiles, OrgTile } from "@/components/administration/OrgTiles";
import { invalidateEmployees } from "@/lib/rhSession";

// Bureau par défaut de chaque département (identique à la fiche employé RH)
const DEPT_OFFICE = {}; // Pas de rattachement historique automatique.

const NONE = "__none__";

// Cache gardé entre deux ouvertures de l'onglet : les chiffres s'affichent tout de suite
// avec les dernières valeurs connues, puis se mettent à jour en arrière-plan (pas de clignotement).
let EMP_CACHE = null;
let REVIEW_CACHE = null;
const DEPT_ALIASES = { grand_projet_secretariat: "Grand Projet & Secrétariat", cag_secretariat: "Grand Projet & Secrétariat" };
const deptLabel = (v) => v || "Non affecté";
const titleCase = (s) => (s || "").toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

function initials(u) {
  const n = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.full_name || u.email || "?";
  return n.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}
function displayName(u) {
  return titleCase([u.first_name, u.last_name].filter(Boolean).join(" ") || u.full_name || (u.email || "").split("@")[0]);
}

const Icon = {
  search: <path d="M21 21l-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z" />,
  refresh: <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></>,
  chevron: <path d="M9 18l6-6-6-6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  layers: <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />
};
function Svg({ name, size = 16, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {Icon[name]}
    </svg>
  );
}

const CSS = `
.uo{--g:#0C3D85;--g2:#14806f;--gt:oklch(0.96 0.03 165);--ink:oklch(0.24 0.01 90);--mut:oklch(0.52 0.005 90);--sub:oklch(0.66 0.005 90);--ln:oklch(0.92 0.004 90);--ln2:oklch(0.95 0.003 90);--bg:oklch(0.985 0.002 90);--warn:oklch(0.62 0.13 65);--warnbg:oklch(0.97 0.035 85);font-family:'Poppins',Helvetica,Arial,sans-serif;color:var(--ink)}
.uo *{box-sizing:border-box}
.uo-card{background:#fff;border:1px solid var(--ln);border-radius:18px;overflow:hidden}
.uo-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:22px 26px;border-bottom:1px solid var(--ln)}
.uo-title{font-size:18px;font-weight:700;letter-spacing:-0.01em;margin:0}
.uo-subtitle{font-size:12.5px;color:var(--mut);margin-top:2px}
.uo-head-actions{display:flex;align-items:center;gap:10px}
.uo-sync{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 6px 0 12px;border-radius:100px;background:var(--bg);border:1px solid var(--ln);font-size:12px;font-weight:500;color:var(--mut)}
.uo-dot{width:8px;height:8px;border-radius:50%;background:oklch(0.65 0.15 150);box-shadow:0 0 0 3px oklch(0.65 0.15 150 / .15)}
.uo-dot.err{background:oklch(0.6 0.19 25);box-shadow:0 0 0 3px oklch(0.6 0.19 25 / .15)}
.uo-dot.load{background:var(--sub);box-shadow:none;animation:uoPulse 1s infinite}
@keyframes uoPulse{50%{opacity:.3}}
.uo-icon-btn{width:28px;height:28px;border-radius:50%;border:none;background:transparent;color:var(--mut);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.uo-icon-btn:hover{background:var(--ln2);color:var(--g)}
.uo-btn{height:36px;padding:0 16px;border-radius:10px;border:none;background:var(--g);color:#fff;font:600 13px 'Poppins',sans-serif;display:inline-flex;align-items:center;gap:7px;cursor:pointer;white-space:nowrap}
.uo-btn:hover{background:#0c4c44}
.uo-btn:disabled{opacity:.5;cursor:not-allowed}
.uo-btn.ghost{background:transparent;color:var(--mut);border:1px solid var(--ln)}
.uo-btn.ghost:hover{background:var(--bg);color:var(--ink)}

.uo-invite{padding:20px 26px;background:var(--bg);border-bottom:1px solid var(--ln)}
.uo-invite-grid{display:grid;grid-template-columns:2fr 1fr 1.4fr 1.2fr 1fr;gap:10px}
.uo-invite-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;flex-wrap:wrap}
.uo-hint{font-size:11.5px;color:var(--mut);line-height:1.5;max-width:620px}
.uo-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.uo-label{font-size:11px;font-weight:600;color:var(--mut)}
.uo-input{width:100%;height:38px;padding:0 12px;border-radius:9px;border:1px solid var(--ln);background:#fff;font:13px 'Poppins',sans-serif;color:var(--ink);outline:none}
.uo-input:focus{border-color:var(--g);box-shadow:0 0 0 3px oklch(0.6 0.1 165 / .15)}
[data-form-select].uo-input{cursor:pointer}

.uo-body{display:grid;grid-template-columns:minmax(0,1fr);min-height:360px}
.uo-side{min-width:0;padding:14px 26px;background:var(--bg);border-bottom:1px solid var(--ln)}
.uo-side-title{display:none}
.uo-side-list{display:flex;flex-wrap:wrap;gap:8px}
.uo-side-item{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 6px 0 14px;letter-spacing:.03em;font-weight:600 !important;border:1px solid var(--ln);border-radius:100px;background:#fff;font:500 12.5px 'Poppins',sans-serif;color:var(--ink);cursor:pointer;white-space:nowrap}
.uo-side-item:hover{border-color:var(--g)}
.uo-side-item.on{background:var(--g);border-color:var(--g);color:#fff;font-weight:600}

.uo-side-item.empty{color:var(--sub)}
.uo-count{min-width:22px;height:20px;padding:0 7px;border-radius:100px;background:var(--ln2);font-size:11px;font-weight:600;color:var(--mut);display:inline-flex;align-items:center;justify-content:center}
.uo-side-item.on .uo-count{background:rgba(255,255,255,.22);color:#fff}
.uo-side-sep{display:none}
.uo-side-item.warn .uo-count{background:var(--warnbg);color:var(--warn)}

.uo-main{padding:20px 26px 24px;min-width:0}
.uo-side-list{min-width:0}
.uo-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
.uo-search{position:relative;flex:1 1 240px}
.uo-search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--sub)}
.uo-search .uo-input{padding-left:36px}
.uo-toolbar .uo-input.sel{width:auto;flex:0 1 210px}
.uo-seg{display:inline-flex;padding:3px;border-radius:10px;background:var(--ln2);gap:2px}
.uo-seg button{height:32px;padding:0 12px;border:none;border-radius:8px;background:transparent;font:500 12px 'Poppins',sans-serif;color:var(--mut);cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.uo-seg button.on{background:#fff;color:var(--g);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.08)}

.uo-alert{margin-bottom:14px;padding:10px 14px;border-radius:10px;font-size:12.5px;font-weight:500}
.uo-alert.err{background:oklch(0.97 0.025 25);border:1px solid oklch(0.88 0.07 25);color:oklch(0.45 0.15 25)}
.uo-alert.ok{background:oklch(0.97 0.035 155);border:1px solid oklch(0.86 0.08 155);color:oklch(0.38 0.1 155)}

.uo-table{border:1px solid var(--ln);border-radius:14px;overflow:hidden}
.uo-cols,.uo-row{display:grid;grid-template-columns:minmax(260px,2.4fr) minmax(130px,1fr) minmax(210px,1.6fr) minmax(170px,1.3fr) 104px 36px;gap:18px;align-items:center;padding:0 22px}
.uo-cols{height:42px;background:var(--bg);border-bottom:1px solid var(--ln);font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--sub)}
.uo-group{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 16px;background:linear-gradient(0deg,var(--bg),var(--bg));border-bottom:1px solid var(--ln)}
.uo-group:not(:first-child){border-top:1px solid var(--ln)}
.uo-group-name{display:flex;align-items:center;gap:8px;border:none;background:none;padding:0;cursor:pointer;font:600 13px 'Poppins',sans-serif;color:var(--ink)}
.uo-group-name svg{color:var(--sub);transition:transform .15s}
.uo-group-name.open svg{transform:rotate(90deg)}
.uo-group-meta{font-size:11.5px;font-weight:500;color:var(--sub)}
.uo-bulk{display:flex;align-items:center;gap:6px}
.uo-bulk [data-form-select]{height:30px;padding:0 8px;border-radius:8px;border:1px dashed var(--ln);background:#fff;font:12px 'Poppins',sans-serif;color:var(--mut);cursor:pointer;outline:none}
.uo-bulk .uo-btn{height:30px;padding:0 12px;font-size:12px;border-radius:8px}
.uo-bulk-confirm{font-size:12px;color:var(--ink)}

.uo-row{min-height:84px;padding-top:16px;padding-bottom:16px;border-bottom:1px solid var(--ln2);background:#fff;transition:background .12s}
.uo-row:hover{background:oklch(0.993 0.002 90)}
.uo-rowwrap:last-child .uo-row{border-bottom:none}
.uo-user{display:flex;align-items:center;gap:14px;min-width:0}
.uo-avatar{width:42px;height:42px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--g),var(--g2));color:#fff;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:600;letter-spacing:.02em}
.uo-name{font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap;line-height:1.35}
.uo-tag{font-size:9.5px;font-weight:700;letter-spacing:.05em;padding:2px 7px;border-radius:100px;background:var(--gt);color:var(--g);flex-shrink:0}
.uo-tag.super{background:oklch(0.93 0.07 85);color:oklch(0.45 0.11 70)}
.uo-span2{grid-column:span 2}
.uo-hors{height:38px;display:flex;align-items:center;padding:0 12px;border-radius:8px;background:var(--bg);border:1px dashed var(--ln);font-size:12.5px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uo-email{font-size:12.5px;color:var(--mut);margin-top:1px;word-break:break-all}
.uo-pos{font-size:11.5px;color:var(--sub);margin-top:2px;line-height:1.35}
.uo-cell{position:relative;min-width:0}
.uo-cell-label{display:none}
.uo-ghost{width:100%;height:38px;padding:0 28px 0 12px;border-radius:8px;border:1px solid transparent;background:transparent;font:500 13px 'Poppins',sans-serif;color:var(--ink);cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center}
.uo-ghost:hover{border-color:var(--ln);background-color:#fff}
.uo-ghost:focus{border-color:var(--g);background-color:#fff;box-shadow:0 0 0 3px oklch(0.6 0.1 165 / .12)}
.uo-ghost.empty{color:var(--warn);background-color:var(--warnbg)}
.uo-ghost.rh{color:var(--mut)}
.uo-src{position:absolute;right:28px;top:50%;transform:translateY(-50%);font-size:8.5px;font-weight:700;letter-spacing:.06em;padding:1px 5px;border-radius:4px;background:var(--ln2);color:var(--sub);pointer-events:none}
.uo-access{height:30px;padding:0 10px;border-radius:8px;border:1px solid var(--ln);background:#fff;font:600 11.5px 'Poppins',sans-serif;color:var(--mut);cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.uo-access:hover,.uo-access.on{border-color:var(--g);color:var(--g)}
.uo-access svg{transition:transform .15s}
.uo-access.on svg{transform:rotate(90deg)}
.uo-meter{width:28px;height:4px;border-radius:4px;background:var(--ln2);overflow:hidden}
.uo-meter i{display:block;height:100%;background:var(--g)}
.uo-del{width:32px;height:32px;border-radius:8px;border:none;background:transparent;color:var(--sub);display:flex;align-items:center;justify-content:center;cursor:pointer}
.uo-del:hover{background:oklch(0.96 0.03 25);color:oklch(0.55 0.18 25)}
.uo-confirm{display:flex;align-items:center;gap:6px;grid-column:5 / span 2;justify-content:flex-end}
.uo-confirm button{height:28px;padding:0 10px;border:none;border-radius:7px;font:600 11px 'Poppins',sans-serif;cursor:pointer}

.uo-apps{padding:16px 22px 18px 78px;background:var(--bg);border-bottom:1px solid var(--ln2)}
.uo-apps-legend{display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--mut);margin-bottom:10px}
.uo-apps-legend span{display:inline-flex;align-items:center;gap:6px}
.uo-apps-legend i{width:10px;height:10px;border-radius:50%;display:inline-block}
.uo-pills{display:flex;gap:6px;flex-wrap:wrap}
.uo-pill{height:28px;padding:0 12px;border-radius:100px;font:600 11.5px 'Poppins',sans-serif;cursor:pointer;border:1px solid var(--ln);background:#fff;color:var(--mut)}
.uo-pill:hover{border-color:var(--g);color:var(--g)}
.uo-pill.grade{background:var(--g);border-color:var(--g);color:#fff;cursor:default}
.uo-pill.extra{background:oklch(0.96 0.05 60);border-color:oklch(0.7 0.15 50);color:oklch(0.45 0.13 45)}

.uo-tag.new{background:oklch(0.94 0.05 250);color:oklch(0.45 0.13 255)}
.uo-tag.warn{background:var(--warnbg);color:var(--warn)}
.uo-group{padding:12px 18px}
.uo-group.is-open{background:var(--gt)}
.uo-group-name{font-size:13.5px;letter-spacing:.02em}
.uo-subgroup{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:8px 22px;background:var(--warnbg);border-top:1px solid var(--ln2);border-bottom:1px solid var(--ln2);font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--warn)}
.uo-subgroup .uo-btn{height:28px;font-size:11.5px;text-transform:none;letter-spacing:0}

.uo-req{border-bottom:1px solid var(--ln)}
.uo-req-head{width:100%;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 26px;border:none;background:#fff;cursor:pointer;text-align:left;font-family:'Poppins',sans-serif}
.uo-req-bell{min-width:26px;height:26px;padding:0 8px;border-radius:100px;background:var(--ln2);color:var(--sub);font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
.uo-req-bell.on{background:oklch(0.62 0.17 35);color:#fff;box-shadow:0 0 0 4px oklch(0.62 0.17 35 / .15)}
.uo-req-title{font-size:14px;font-weight:700;color:var(--ink)}
.uo-req-sub{font-size:12px;color:var(--mut)}
.uo-req-list{display:flex;flex-direction:column;gap:8px;padding:0 26px 18px}
.uo-req-item{display:grid;grid-template-columns:minmax(240px,1fr) 170px 190px auto;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--ln);border-left:3px solid oklch(0.62 0.17 35);border-radius:12px;background:var(--bg)}
.uo-req-sel{height:34px;font-size:12.5px}
.uo-req-sel.empty{border-color:oklch(0.8 0.1 70);background:var(--warnbg)}
.uo-req-actions{display:flex;gap:6px;justify-content:flex-end}
.uo-req-actions .uo-btn{height:34px;padding:0 12px;font-size:12px}
@media (max-width:900px){
  .uo-req-item{grid-template-columns:1fr 1fr}
  .uo-req-item .uo-user{grid-column:1 / -1}
  .uo-req-actions{grid-column:1 / -1;justify-content:flex-start}
}

.uo-tiles{padding:20px 26px;background:var(--bg);border-bottom:1px solid var(--ln)}
@media (max-width:640px){.uo-tiles{padding:14px}}
.uo-tile{min-width:0;display:flex;flex-direction:column;gap:8px;text-align:left;padding:13px 14px;border-radius:14px;border:1px solid var(--ln);background:#fff;cursor:pointer;font-family:'Poppins',sans-serif;color:var(--ink);transition:border-color .12s,box-shadow .12s,transform .12s}
.uo-tile:hover{border-color:var(--g);box-shadow:0 4px 14px rgba(15,92,82,.08);transform:translateY(-1px)}
.uo-tile.on{border-color:var(--g);background:var(--gt);box-shadow:0 0 0 2px var(--g) inset}
.uo-tile.all{background:#fff;border-style:dashed}
.uo-tile.all.on{background:var(--gt);border-style:solid}
.uo-tile.none .uo-tile-name{color:var(--warn)}
.uo-tile.empty{opacity:.6}
.uo-tile-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.uo-tile-name{display:inline-flex;align-items:center;gap:5px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.uo-tile-name svg{color:var(--g)}
.uo-tile-req{min-width:22px;height:22px;padding:0 7px;border-radius:100px;background:oklch(0.62 0.17 35);color:#fff;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
.uo-tile-num{font-size:26px;font-weight:700;line-height:1;letter-spacing:-.02em;display:flex;align-items:baseline;gap:6px}
.uo-tile-num small{font-size:12px;font-weight:500;color:var(--mut);letter-spacing:0}
.uo-tile-meter{height:5px;border-radius:5px;background:var(--ln2);overflow:hidden}
.uo-tile-meter i{display:block;height:100%;background:var(--g);border-radius:5px}
.uo-tile-foot{display:flex;flex-direction:column;gap:1px;font-size:11.5px;color:var(--mut);white-space:nowrap}
.uo-tile-foot span:first-child{color:var(--warn);font-weight:600}
.uo-pick{display:flex;flex-direction:column;align-items:center;gap:6px;padding:44px 20px;text-align:center;color:var(--mut);font-size:13px;border:1px dashed var(--ln);border-radius:14px}
.uo-pick svg{color:var(--g)}
.uo-pick b{color:var(--ink);font-size:14.5px}
.uo-listhead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.uo-listhead span{font-size:15px;font-weight:700;letter-spacing:.02em;text-transform:uppercase}
.uo-listhead .uo-btn{height:30px;font-size:12px;padding:0 12px}


.uo-empty{padding:48px 20px;text-align:center;color:var(--mut);font-size:13px}
.uo-empty b{display:block;color:var(--ink);font-size:14px;font-weight:600;margin-bottom:4px}
.uo-foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:11.5px;color:var(--sub)}

@media (max-width:1100px){
  .uo-invite-grid{grid-template-columns:1fr 1fr 1fr}
  .uo-invite-grid .uo-field:first-child{grid-column:1 / -1}
}
@media (max-width:0px){
  .uo-body{grid-template-columns:minmax(0,1fr)}
  .uo-side{min-width:0;border-right:none;border-bottom:1px solid var(--ln);padding:12px 22px}
  .uo-side-title{display:none}
  .uo-side-list{flex-direction:row;overflow-x:auto;gap:6px;padding-bottom:2px}
  .uo-side-item{width:auto;flex-shrink:0;border:1px solid var(--ln);background:#fff;border-radius:100px;padding:0 6px 0 12px}
  .uo-side-item.on::before{display:none}
  .uo-side-item.on{background:var(--g);color:#fff;box-shadow:none;border-color:var(--g)}
  .uo-side-item.on .uo-count{background:rgba(255,255,255,.2);color:#fff}
  .uo-side-sep{display:none}
}
@media (max-width:1060px){
  .uo-side{padding:12px 18px}
  .uo-cols{display:none}
  .uo-row{grid-template-columns:1fr 1fr;gap:10px 12px;padding:14px}
  .uo-user{grid-column:1 / -1;padding-right:36px}
  .uo-cell-label{display:block;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--sub);margin-bottom:3px}
  .uo-ghost{border-color:var(--ln);background-color:#fff}
  .uo-src{top:auto;bottom:10px;transform:none}
  .uo-del{position:absolute;top:14px;right:10px}
  .uo-rowwrap{position:relative}
  .uo-confirm{grid-column:1 / -1;justify-content:flex-start}
  .uo-apps{padding:12px 14px}
}
@media (max-width:640px){
  .uo-head{padding:18px}
  .uo-head-actions{width:100%;justify-content:space-between}
  .uo-invite{padding:16px 18px}
  .uo-invite-grid{grid-template-columns:1fr}
  .uo-main{padding:14px}
  .uo-toolbar .uo-input.sel{flex:1 1 140px}
  .uo-seg{width:100%}
  .uo-seg button{flex:1;justify-content:center}
}
`;

export default function UsersByOrgManager({
  users, setUsers, profiles, accessAppDefs, loading, saving, setSaving, error, setError, inviteMsg,
  currentUser, refreshUser, onSetGrade, onSetRole, onToggleAccess, onRemove, onInvite
}) {
  const [bureauList, setBureauList] = useState([]);
  useEffect(() => {
    let active = true;
    base44.entities.OfficeTerminal.list("office_name", 200)
      .then(rows => { if (active) setBureauList((rows || []).map(b => String(b.office_name || "").trim().toUpperCase()).filter(Boolean)); })
      .catch(() => { if (active) setBureauList([]); });
    return () => { active = false; };
  }, []);
  const BUREAUX = bureauList;
  const [configuredDepartments, setConfiguredDepartments] = useState([]);
  useEffect(() => {
    let active = true;
    base44.entities.Department.list("label", 200)
      .then(rows => { if (active) setConfiguredDepartments((rows || []).map(d => ({value:d.value,label:d.label}))); })
      .catch(() => { if (active) setConfiguredDepartments([]); });
    return () => { active = false; };
  }, []);
  const DEPARTEMENTS = configuredDepartments;
  const departmentLabel = value => DEPARTEMENTS.find(d => d.value === value)?.label || value || "Non affecté";
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState(""); // "" = aucun bureau choisi (tuiles seules)
  const [deptFilter, setDeptFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  // Sections par bureau, repliées par défaut (true = section dépliée)
  const [openGroups, setOpenGroups] = useState({});
  const [openAccess, setOpenAccess] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [bulkGrade, setBulkGrade] = useState({});
  const [bulkConfirm, setBulkConfirm] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inv, setInv] = useState({ email: "", office: "", department: "", grade: "", role: "user" });

  // Fiches employés du portail (source officielle depuis la fermeture de RH-CITRAT).
  // Elles servent à relier les comptes et à préparer grade et applications des personnes à inviter.
  const [erpEmployees, setErpEmployees] = useState(EMP_CACHE || []);
  const [empStatus, setEmpStatus] = useState(EMP_CACHE ? "ok" : "loading");
  const [empReady, setEmpReady] = useState(!!EMP_CACHE);
  const [pendingOpen, setPendingOpen] = useState({});
  const [inviteAllConfirm, setInviteAllConfirm] = useState(null);
  const [inviteProgress, setInviteProgress] = useState(null);
  // showLoading : rechargement demandé à la main (bouton). Sinon, mise à jour silencieuse si un cache existe.
  const loadErpEmployees = async (showLoading = false) => {
    if (showLoading || !EMP_CACHE) setEmpStatus("loading");
    try {
      const list = await base44.entities.Employee.filter({ is_active: true }, "last_name", 1000);
      const arr = Array.isArray(list) ? list : [];
      EMP_CACHE = arr;
      setErpEmployees(arr);
      setEmpStatus("ok");
    } catch {
      if (!EMP_CACHE) setErpEmployees([]);
      setEmpStatus(EMP_CACHE ? "ok" : "error");
    } finally {
      setEmpReady(true);
    }
  };
  useEffect(() => { loadErpEmployees(); }, []);

  // Adresse d'invitation d'une fiche : e-mail de connexion, sinon e-mail personnel
  const empEmail = (e) => String((e && (e.email || e.personal_email)) || "").trim().toLowerCase();

  // Demandes déjà traitées (partagées entre administrateurs)
  const REVIEW_KEY = "demandes_droits_traitees";
  const [reviewCfg, setReviewCfg] = useState(REVIEW_CACHE);
  useEffect(() => { if (reviewCfg) REVIEW_CACHE = reviewCfg; }, [reviewCfg]);
  const [showRequests, setShowRequests] = useState(false);
  useEffect(() => {
    base44.entities.ConfigurationApp.filter({ cle: REVIEW_KEY })
      .then((list) => setReviewCfg((list && list[0]) || { cle: REVIEW_KEY, valeur: { ids: {} } }))
      .catch(() => setReviewCfg({ cle: REVIEW_KEY, valeur: { ids: {} } }));
  }, []);
  const reviewed = (reviewCfg && reviewCfg.valeur && reviewCfg.valeur.ids) || {};
  const markReviewed = async (userId) => {
    const ids = { ...reviewed, [userId]: new Date().toISOString() };
    const valeur = { ids };
    setReviewCfg((c) => ({ ...(c || { cle: REVIEW_KEY }), valeur }));
    try {
      if (reviewCfg && reviewCfg.id) await base44.entities.ConfigurationApp.update(reviewCfg.id, { valeur });
      else {
        const created = await base44.entities.ConfigurationApp.create({ cle: REVIEW_KEY, description: "Demandes de droits marquées comme traitées (Administration › Utilisateurs)", valeur });
        setReviewCfg(created);
      }
    } catch (err) {
      setError((err && err.message) || "Impossible d'enregistrer la demande comme traitée.");
    }
  };

  const savePending = async (empId, patch) => {
    setSaving(true);
    setError(null);
    try {
      await base44.entities.Employee.update(empId, patch); invalidateEmployees();
      setErpEmployees((prev) => prev.map((e) => (e.id === empId ? { ...e, ...patch } : e)));
      if ("email" in (patch || {})) base44.functions.invoke("syncEmployeeEmail", { employee_id: empId }).catch(() => null);
    } catch (err) {
      setError((err && err.message) || "Échec de l'enregistrement de la fiche.");
    } finally {
      setSaving(false);
    }
  };

  const togglePendingAccess = (e, appId) => {
    const cur = Array.isArray(e.portal_access) ? e.portal_access : [];
    const next = cur.includes(appId) ? cur.filter((a) => a !== appId) : [...cur, appId];
    savePending(e.id, { portal_access: next });
  };

  const invitePending = async (e) => {
    const email = empEmail(e);
    // Fiche sans e-mail de connexion : on y inscrit l'adresse invitée pour que le compte s'y relie
    if (!e.email && email) {
      try {
        await base44.entities.Employee.update(e.id, { email }); invalidateEmployees();
        setErpEmployees((prev) => prev.map((x) => (x.id === e.id ? { ...x, email } : x)));
        base44.functions.invoke("syncEmployeeEmail", { employee_id: e.id }).catch(() => null);
      } catch {
        /* l'invitation part quand même ; le rattachement se fera à la main */
      }
    }
    const ok = await onInvite({
      email,
      role: "user",
      grade: e.portal_grade || "",
      office: e.office || "",
      department: e.department || "",
      access: Array.isArray(e.portal_access) ? e.portal_access : []
    });
    return ok;
  };

  const empByEmail = useMemo(() => {
    const m = {};
    erpEmployees.forEach((e) => {
      [e.email, e.personal_email, e.email_pro].forEach((v) => {
        const k = String(v || "").trim().toLowerCase();
        if (k && !m[k]) m[k] = e;
      });
    });
    return m;
  }, [erpEmployees]);

  // Rattachement effectif : valeur du compte portail, sinon celle de la fiche RH
  const rows = useMemo(() => users.map((u) => {
    // Super administrateur : hors organisation, jamais relié à une fiche employé
    if (u.super_admin) {
      return { u, emp: null, superAdmin: true, office: "", department: "", officeFromRh: false, deptFromRh: false };
    }
    const emp = empByEmail[(u.email || "").toLowerCase()];
    return {
      u,
      emp,
      office: u.office || (emp && emp.office) || "",
      department: u.department || (emp && emp.department) || "",
      officeFromRh: !u.office && !!(emp && emp.office),
      deptFromRh: !u.department && !!(emp && emp.department)
    };
  }), [users, empByEmail]);
  const linked = rows.filter((r) => r.emp).length;
  const orgRows = rows.filter((r) => !r.superAdmin);

  const term = search.trim().toLowerCase();
  // Bureau affiché : la tuile choisie ; une recherche sans tuile porte sur tous les bureaux
  const effOffice = officeFilter || (term ? "all" : "");
  const filtered = rows.filter((r) => {
    const { u } = r;
    if (!effOffice) return false;
    if (r.superAdmin && (effOffice !== "all" || deptFilter !== "all")) return false;
    if (effOffice === NONE && r.office) return false;
    if (effOffice !== "all" && effOffice !== NONE && r.office !== effOffice) return false;
    if (deptFilter === NONE && r.department) return false;
    if (deptFilter !== "all" && deptFilter !== NONE && r.department !== deptFilter) return false;
    const hasGrade = u.grade && getProfile(profiles, u.grade);
    if (gradeFilter === "none" && hasGrade) return false;
    if (gradeFilter !== "all" && gradeFilter !== "none" && u.grade !== gradeFilter) return false;
    if (!term) return true;
    const hay = [u.first_name, u.last_name, u.full_name, u.email, r.emp && r.emp.position].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(term);
  });

  // Fiches « à inviter » : fiche active avec e-mail, sans compte portail correspondant
  const pendingAll = useMemo(() => {
    const accountEmails = new Set(users.map((u) => (u.email || "").toLowerCase()));
    const hasAccount = (e) => [e.email, e.personal_email, e.email_pro]
      .some((v) => v && accountEmails.has(String(v).trim().toLowerCase()));
    return erpEmployees
      .filter((e) => empEmail(e) && !hasAccount(e))
      .sort((a, b) => displayName(a).localeCompare(displayName(b)));
  }, [erpEmployees, users]);
  const pendingFiltered = pendingAll.filter((e) => {
    const office = e.office || "";
    const dept = e.department || "";
    if (!effOffice) return false;
    if (effOffice === NONE && office) return false;
    if (effOffice !== "all" && effOffice !== NONE && office !== effOffice) return false;
    if (deptFilter === NONE && dept) return false;
    if (deptFilter !== "all" && deptFilter !== NONE && dept !== deptFilter) return false;
    const hasGrade = e.portal_grade && getProfile(profiles, e.portal_grade);
    if (gradeFilter === "none" && hasGrade) return false;
    if (gradeFilter !== "all" && gradeFilter !== "none" && e.portal_grade !== gradeFilter) return false;
    if (!term) return true;
    const hay = [e.first_name, e.last_name, e.email, e.personal_email, e.position, e.employee_code].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(term);
  });


  // Vue « tous les bureaux » sans recherche : une section repliable par bureau.
  // Dès qu'un bureau est choisi ou qu'une recherche est tapée : liste à plat.
  const groupBy = "none"; // le classement par bureau se fait par les tuiles
  const HORS = "__hors__";
  const groups = useMemo(() => {
    const sortRows = (list) => list.slice().sort((a, b) => (b.superAdmin ? 1 : 0) - (a.superAdmin ? 1 : 0) || displayName(a.u).localeCompare(displayName(b.u)));
    if (groupBy === "none") return [{ key: "all", label: null, items: sortRows(filtered), pending: pendingFiltered }];
    const map = {};
    const slot = (k) => (map[k] = map[k] || { items: [], pending: [] });
    filtered.forEach((r) => slot(r.superAdmin ? HORS : (r.office || NONE)).items.push(r));
    pendingFiltered.forEach((e) => slot(e.office || NONE).pending.push(e));
    const rank = (k) => (k === HORS ? -1 : k === NONE ? 999 : (BUREAUX.indexOf(k) === -1 ? 500 : BUREAUX.indexOf(k)));
    return Object.keys(map)
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .map((k) => ({
        key: k,
        label: k === HORS ? "Hors organisation" : k === NONE ? "Non affectés" : k.toUpperCase(),
        items: sortRows(map[k].items),
        pending: map[k].pending
      }));
  }, [filtered, pendingFiltered, groupBy]);
  const allOpen = groups.length > 0 && groups.every((g) => openGroups[g.key]);
  const toggleAllGroups = () => {
    const next = {};
    if (!allOpen) groups.forEach((g) => { next[g.key] = true; });
    setOpenGroups(next);
  };

  // Nouvelles demandes de droits : comptes sans grade ou sans bureau (à compléter),
  // et comptes créés depuis moins de 7 jours que personne n'a encore marqués « traités ».
  const NEW_DAYS = 7;
  const daysSince = (d) => {
    const t = Date.parse(d || "");
    return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86400000);
  };
  const requests = useMemo(() => orgRows
    .map((r) => {
      const u = r.u;
      const reasons = [];
      if (!(u.grade && getProfile(profiles, u.grade))) reasons.push("Sans grade");
      if (!r.office) reasons.push("Sans bureau");
      const age = daysSince(u.created_date);
      const isNew = age !== null && age < NEW_DAYS && !reviewed[u.id];
      if (!reasons.length && !isNew) return null;
      return { r, reasons, age, isNew };
    })
    .filter(Boolean)
    .sort((a, b) => (a.age ?? 9999) - (b.age ?? 9999)), [orgRows, profiles, reviewed]);
  // Chiffres de chaque tuile : comptes, fiches à inviter, demandes en attente
  const officeStats = useMemo(() => {
    const st = {};
    const get = (k) => (st[k] = st[k] || { accounts: 0, pending: 0, requests: 0 });
    get("all");
    BUREAUX.forEach((b) => get(b));
    rows.forEach((r) => {
      get("all").accounts += 1;
      if (!r.superAdmin) get(r.office || NONE).accounts += 1;
    });
    pendingAll.forEach((e) => { get("all").pending += 1; get(e.office || NONE).pending += 1; });
    requests.forEach(({ r }) => { get("all").requests += 1; get(r.office || NONE).requests += 1; });
    return st;
  }, [rows, pendingAll, requests]);
  const tileKeys = [
    ...BUREAUX,
    ...Object.keys(officeStats).filter((k) => k !== "all" && k !== NONE && !BUREAUX.includes(k)),
    ...(officeStats[NONE] && (officeStats[NONE].accounts || officeStats[NONE].pending) ? [NONE] : [])
  ];
  // Tous les chiffres ne s'affichent qu'une fois toutes les données chargées (comptes, fiches, grades, demandes traitées)
  const ready = (!loading || users.length > 0) && empReady && reviewCfg !== null ; // Les profils sont vides tant que l'administrateur ne les a pas créés.
  const tileLabel = (k) => (k === "all" ? "Tous les bureaux" : k === NONE ? "Non affectés" : k);

  const ageLabel = (age) => (age === null ? "" : age === 0 ? "aujourd'hui" : age === 1 ? "hier" : `il y a ${age} j`);
  const goToUser = (r) => {
    const k = r.superAdmin ? HORS : (r.office || NONE);
    setOpenGroups((p) => ({ ...p, [k]: true }));
    setOpenAccess((p) => ({ ...p, [r.u.id]: true }));
    setTimeout(() => {
      const el = document.getElementById(`uo-user-${r.u.id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const saveOrg = async (userId, patch) => {
    setSaving(true);
    setError(null);
    try {
      await base44.functions.invoke("updateUserAccess", { user_id: userId, ...patch });
      setUsers((prev) => prev.map((x) => (x.id === userId ? { ...x, ...patch } : x)));
      if (currentUser && userId === currentUser.id && refreshUser) refreshUser();
    } catch (err) {
      setError((err && err.message) || "Échec de la mise à jour du rattachement.");
    } finally {
      setSaving(false);
    }
  };

  const changeDepartment = (r, department) => {
    const patch = { department };
    if (!r.u.office && department && DEPT_OFFICE[department]) patch.office = DEPT_OFFICE[department];
    saveOrg(r.u.id, patch);
  };

  const applyBulkGrade = async (group) => {
    const grade = bulkGrade[group.key];
    setBulkConfirm(null);
    if (!grade) return;
    setSaving(true);
    setError(null);
    const covered = profileApps(profiles, grade);
    let failed = 0;
    for (const r of group.items) {
      const access = (r.u.access || []).filter((a) => !covered.includes(a));
      try {
        await base44.functions.invoke("updateUserAccess", { user_id: r.u.id, grade, access });
        setUsers((prev) => prev.map((x) => (x.id === r.u.id ? { ...x, grade, access } : x)));
      } catch {
        failed += 1;
      }
    }
    if (failed) setError(`${failed} utilisateur(s) n'ont pas pu être mis à jour.`);
    if (currentUser && group.items.some((r) => r.u.id === currentUser.id) && refreshUser) refreshUser();
    setBulkGrade((p) => ({ ...p, [group.key]: "" }));
    setSaving(false);
  };

  const submitInvite = async () => {
    const ok = await onInvite({ ...inv, email: inv.email.trim().toLowerCase() });
    if (ok) {
      setInv({ email: "", office: "", department: "", grade: "", role: "user" });
      setShowInvite(false);
    }
  };

  const renderTile = (k) => {
    if (!ready) {
      return (
        <OrgTile
          key={k}
          label={tileLabel(k)}
          sub="Chargement…"
          icon={k === NONE ? "alert" : "pin"}
          variant={k === NONE ? "warn" : undefined}
          value="–"
          unit="comptes"
          progress={0}
          progressLabel="Comptes activés"
          stats={[{ label: "À inviter", value: "–" }, { label: "Demandes", value: "–" }]}
          onClick={() => {}}
        />
      );
    }
    const st = officeStats[k] || { accounts: 0, pending: 0, requests: 0 };
    const total = st.accounts + st.pending;
    const pct = total ? (st.accounts / total) * 100 : 0;
    const on = officeFilter === k;
    return (
      <OrgTile
        key={k}
        label={tileLabel(k)}
        sub={k === NONE ? "Comptes sans bureau" : `${total} personne${total > 1 ? "s" : ""} au total`}
        icon={k === NONE ? "alert" : "pin"}
        variant={k === NONE ? "warn" : undefined}
        value={st.accounts}
        unit={`compte${st.accounts > 1 ? "s" : ""}`}
        progress={pct}
        progressLabel="Comptes activés"
        stats={[
          { label: "À inviter", value: st.pending, tone: st.pending ? "warn" : "ok" },
          { label: "Demandes", value: st.requests, tone: st.requests ? "warn" : undefined }
        ]}
        badge={st.requests}
        badgeTitle="Demandes de droits en attente"
        active={on}
        muted={!total}
        onClick={() => setOfficeFilter(on ? "" : k)}
      />
    );
  };

  const renderRow = (r) => {
    const { u } = r;
    const hasGrade = !!(u.grade && getProfile(profiles, u.grade));
    const gradeApps = profileApps(profiles, u.grade);
    const granted = accessAppDefs.filter((a) => gradeApps.includes(a.id) || (u.access || []).includes(a.id)).length;
    const total = accessAppDefs.length || 1;
    const isOpen = !!openAccess[u.id];
    const isMe = currentUser && currentUser.id === u.id;

    return (
      <div className="uo-rowwrap" key={u.id} id={`uo-user-${u.id}`}>
        <div className="uo-row">
          <div className="uo-user">
            <div className="uo-avatar">{initials(u)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="uo-name">
                <span>{displayName(u)}</span>
                {r.superAdmin
                  ? <span className="uo-tag super">SUPER ADMIN</span>
                  : u.role === "admin" && <span className="uo-tag">ADMIN</span>}
                {!r.superAdmin && (daysSince(u.created_date) ?? 99) < NEW_DAYS && <span className="uo-tag new">NOUVEAU</span>}
                {u.role === "en_attente" && <span className="uo-tag warn" title="Inscription non validée : aucun accès aux données tant qu'un grade ou une application n'est pas attribué">EN ATTENTE</span>}
                {u.role === "suspendu" && <span className="uo-tag warn" title="Compte suspendu : aucun accès aux données">SUSPENDU</span>}
              </div>
              <div className="uo-email" title={u.email}>{u.email}</div>
            </div>
          </div>

          {r.superAdmin ? (
            <div className="uo-cell uo-span2">
              <div className="uo-cell-label">Rattachement</div>
              <div className="uo-hors">Hors organisation · accès à tous les bureaux</div>
            </div>
          ) : (
            <>
          <div className="uo-cell">
            <div className="uo-cell-label">Bureau</div>
            <FormSelect
              className={`uo-ghost ${!r.office ? "empty" : r.officeFromRh ? "rh" : ""}`}
              value={r.office}
              onChange={(e) => saveOrg(u.id, { office: e.target.value })}
              disabled={saving}
              title={r.officeFromRh ? "Repris de la fiche RH-CITRAT" : "Bureau"}
            >
              <option value="">À définir</option>
              {BUREAUX.map((b) => <option key={b} value={b}>{b}</option>)}
              {r.office && !BUREAUX.includes(r.office) && <option value={r.office}>{r.office.toUpperCase()}</option>}
            </FormSelect>
          </div>

          <div className="uo-cell">
            <div className="uo-cell-label">Département</div>
            <FormSelect
              className={`uo-ghost ${!r.department ? "empty" : r.deptFromRh ? "rh" : ""}`}
              value={r.department}
              onChange={(e) => changeDepartment(r, e.target.value)}
              disabled={saving}
              title={r.deptFromRh ? "Repris de la fiche RH-CITRAT" : departmentLabel(r.department)}
            >
              <option value="">À définir</option>
              {DEPARTEMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              {r.department && !DEPARTEMENTS.some((d) => d.value === r.department) && <option value={r.department}>{departmentLabel(r.department)}</option>}
            </FormSelect>
          </div>

            </>
          )}
          <div className="uo-cell">
            <div className="uo-cell-label">Grade</div>
            <FormSelect
              className={`uo-ghost ${!hasGrade ? "empty" : ""}`}
              value={hasGrade ? u.grade : ""}
              onChange={(e) => onSetGrade(u.id, e.target.value)}
              disabled={saving}
              title="Le grade détermine les applications accordées"
            >
              <option value="">À définir</option>
              {profiles.map((p) => <option key={p.id} value={p.profile_id}>{p.name}</option>)}
            </FormSelect>
          </div>

          {confirmDeleteId === u.id ? (
            <div className="uo-confirm">
              <span style={{ fontSize: 12, fontWeight: 500, color: "oklch(0.55 0.18 25)" }}>Supprimer ?</span>
              <button onClick={() => { setConfirmDeleteId(null); onRemove(u.id); }} disabled={saving} style={{ background: "oklch(0.55 0.18 25)", color: "#fff" }}>Oui</button>
              <button onClick={() => setConfirmDeleteId(null)} style={{ background: "var(--ln2)", color: "var(--mut)" }}>Non</button>
            </div>
          ) : (
            <>
              <div className="uo-cell" style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                <div className="uo-cell-label">Accès</div>
                <button className={`uo-access ${isOpen ? "on" : ""}`} onClick={() => setOpenAccess((p) => ({ ...p, [u.id]: !isOpen }))}>
                  <span className="uo-meter"><i style={{ width: `${Math.round((granted / total) * 100)}%` }} /></span>
                  {granted}/{accessAppDefs.length}
                  <Svg name="chevron" size={12} />
                </button>
              </div>
              <button className="uo-del" onClick={() => setConfirmDeleteId(u.id)} title="Supprimer l'utilisateur" aria-label="Supprimer l'utilisateur" disabled={isMe}>
                <Svg name="trash" size={15} />
              </button>
            </>
          )}
        </div>

        {isOpen && (
          <div className="uo-apps">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
              <div className="uo-apps-legend" style={{ marginBottom: 0 }}>
                <span><i style={{ background: "var(--g)" }} /> Inclus par le grade</span>
                <span><i style={{ background: "oklch(0.96 0.05 60)", border: "1px solid oklch(0.7 0.15 50)" }} /> Ajout individuel</span>
                <span><i style={{ background: "#fff", border: "1px solid var(--ln)" }} /> Non accordé — cliquer pour ajouter</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--ink)", cursor: isMe && u.super_admin ? "not-allowed" : "pointer" }} title={isMe && u.super_admin ? "Vous ne pouvez pas retirer votre propre statut" : "Compte sans bureau ni département, non relié à une fiche employé"}>
                <input
                  type="checkbox"
                  checked={!!u.super_admin}
                  disabled={saving || (isMe && u.super_admin)}
                  onChange={(e) => {
                    const on = e.target.checked;
                    saveOrg(u.id, on ? { super_admin: true, office: "", department: "" } : { super_admin: false });
                    if (on && u.role !== "admin") onSetRole(u.id, "admin");
                  }}
                  style={{ accentColor: "#0C3D85", width: 15, height: 15 }}
                />
                Super administrateur
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--ink)", cursor: isMe ? "not-allowed" : "pointer" }} title="Un compte suspendu n'a plus accès au portail. Les administrateurs ne sont jamais bloqués.">
                <input
                  type="checkbox"
                  checked={u.statut === "suspendu"}
                  disabled={saving || isMe}
                  onChange={(e) => saveOrg(u.id, { statut: e.target.checked ? "suspendu" : "actif" })}
                  style={{ accentColor: "#0C3D85", width: 15, height: 15 }}
                />
                Compte suspendu
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--mut)" }}>
                Rôle
                <FormSelect className="uo-input" style={{ height: 30, width: "auto", fontSize: 12 }} value={u.role === "admin" ? "admin" : "user"} onChange={(e) => onSetRole(u.id, e.target.value)} disabled={saving || r.superAdmin}>
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </FormSelect>
              </label>
              </div>
            </div>
            <div className="uo-pills">
              {accessAppDefs.map((a) => {
                const gp = getProfile(profiles, u.grade);
                const fromGrade = gradeApps.includes(a.id);
                const extra = !fromGrade && (u.access || []).includes(a.id);
                return (
                  <button
                    key={a.id}
                    className={`uo-pill ${fromGrade ? "grade" : extra ? "extra" : ""}`}
                    onClick={() => { if (!fromGrade) onToggleAccess(u.id, a.id); }}
                    title={fromGrade ? `Inclus dans le grade « ${gp ? gp.name : ""} » — se modifie dans l'onglet Profils` : extra ? "Ajout individuel — cliquer pour retirer" : "Cliquer pour accorder individuellement"}
                  >
                    {extra ? `+ ${a.name}` : a.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Ligne d'une fiche RH sans compte : grade et applications préparés, invitation à la demande
  const renderPendingRow = (e) => {
    const gradeOk = !!(e.portal_grade && getProfile(profiles, e.portal_grade));
    const gradeApps = profileApps(profiles, e.portal_grade);
    const extras = Array.isArray(e.portal_access) ? e.portal_access : [];
    const granted = accessAppDefs.filter((a) => gradeApps.includes(a.id) || extras.includes(a.id)).length;
    const total = accessAppDefs.length || 1;
    const isOpen = !!pendingOpen[e.id];
    return (
      <div className="uo-rowwrap" key={`emp-${e.id}`}>
        <div className="uo-row">
          <div className="uo-user">
            <div className="uo-avatar" style={{ background: "var(--ln2)", color: "var(--mut)" }}>{initials(e)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="uo-name">
                <span>{displayName(e)}</span>
                <span className="uo-tag" style={{ background: "var(--warnbg)", color: "var(--warn)" }}>À INVITER</span>
              </div>
              <div className="uo-email" title={empEmail(e)}>{empEmail(e)}</div>
            </div>
          </div>
          <div className="uo-cell">
            <div className="uo-cell-label">Bureau</div>
            <div className="uo-ghost rh" style={{ display: "flex", alignItems: "center" }} title="Repris de la fiche employé">{e.office || "À définir"}</div>
          </div>
          <div className="uo-cell">
            <div className="uo-cell-label">Département</div>
            <div className="uo-ghost rh" style={{ display: "flex", alignItems: "center" }} title="Repris de la fiche employé">{departmentLabel(e.department)}</div>
          </div>
          <div className="uo-cell">
            <div className="uo-cell-label">Grade</div>
            <FormSelect
              className={`uo-ghost ${!gradeOk ? "empty" : ""}`}
              value={gradeOk ? e.portal_grade : ""}
              onChange={(ev) => {
                const grade = ev.target.value;
                const covered = profileApps(profiles, grade);
                savePending(e.id, { portal_grade: grade, portal_access: extras.filter((a) => !covered.includes(a)) });
              }}
              disabled={saving}
              title="Grade appliqué au compte lors de l'invitation"
            >
              <option value="">À définir</option>
              {profiles.map((p) => <option key={p.id} value={p.profile_id}>{p.name}</option>)}
            </FormSelect>
          </div>
          <div className="uo-cell" style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
            <div className="uo-cell-label">Accès</div>
            <button className={`uo-access ${isOpen ? "on" : ""}`} onClick={() => setPendingOpen((p) => ({ ...p, [e.id]: !isOpen }))}>
              <span className="uo-meter"><i style={{ width: `${Math.round((granted / total) * 100)}%` }} /></span>
              {granted}/{accessAppDefs.length}
              <Svg name="chevron" size={12} />
            </button>
          </div>
          <button
            className="uo-icon-btn"
            onClick={() => invitePending(e)}
            disabled={saving || !!inviteProgress}
            title={`Envoyer l'invitation à ${empEmail(e)}`}
            aria-label="Inviter"
            style={{ color: "var(--g)" }}
          >
            <Svg name="plus" size={15} />
          </button>
        </div>
        {isOpen && (
          <div className="uo-apps">
            <div className="uo-apps-legend">
              <span><i style={{ background: "var(--g)" }} /> Inclus par le grade</span>
              <span><i style={{ background: "oklch(0.96 0.05 60)", border: "1px solid oklch(0.7 0.15 50)" }} /> Ajout individuel</span>
              <span><i style={{ background: "#fff", border: "1px solid var(--ln)" }} /> Non accordé — cliquer pour ajouter</span>
            </div>
            <div className="uo-pills">
              {accessAppDefs.map((a) => {
                const fromGrade = gradeApps.includes(a.id);
                const extra = !fromGrade && extras.includes(a.id);
                return (
                  <button
                    key={a.id}
                    className={`uo-pill ${fromGrade ? "grade" : extra ? "extra" : ""}`}
                    onClick={() => { if (!fromGrade) togglePendingAccess(e, a.id); }}
                    disabled={saving}
                    title={fromGrade ? "Inclus dans le grade — se modifie dans l'onglet Profils" : extra ? "Ajout individuel — cliquer pour retirer" : "Cliquer pour accorder individuellement"}
                  >
                    {extra ? `+ ${a.name}` : a.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const inviteAllPending = async (source) => {
    setInviteAllConfirm(null);
    const list = (source || pendingFiltered).slice();
    let failed = 0;
    for (let i = 0; i < list.length; i++) {
      setInviteProgress(`${i + 1}/${list.length}`);
      const ok = await invitePending(list[i]);
      if (!ok) failed += 1;
    }
    setInviteProgress(null);
    if (failed) setError(`${failed} invitation(s) n'ont pas pu être envoyées.`);
  };

  return (
    <div className="uo">
      <style>{CSS}</style>
      <div className="uo-card">
        {/* En-tête */}
        <div className="uo-head">
          <div>
            <h2 className="uo-title">Utilisateurs</h2>
            <div className="uo-subtitle">
              {ready
                ? <>{users.length} compte{users.length > 1 ? "s" : ""} · {pendingAll.length} fiche{pendingAll.length > 1 ? "s" : ""} à inviter · classés par bureau</>
                : "Chargement des comptes…"}
            </div>
          </div>
          <div className="uo-head-actions">
            <div className="uo-sync" title="Comptes reliés à une fiche employé du portail (par e-mail)">
              <span className={`uo-dot ${empStatus === "error" ? "err" : empStatus === "loading" ? "load" : ""}`} />
              {empStatus === "loading" && "Lecture des fiches…"}
              {empStatus === "ok" && <>Fiches employés · {linked}/{orgRows.length} relié{linked > 1 ? "s" : ""}</>}
              {empStatus === "error" && "Fiches employés indisponibles"}
              <button className="uo-icon-btn" onClick={() => loadErpEmployees(true)} disabled={empStatus === "loading"} title="Recharger les fiches employés" aria-label="Recharger">
                <Svg name="refresh" size={14} />
              </button>
            </div>
            <button className={`uo-btn ${showInvite ? "ghost" : ""}`} onClick={() => setShowInvite((v) => !v)}>
              <Svg name={showInvite ? "close" : "plus"} size={15} />
              {showInvite ? "Fermer" : "Inviter"}
            </button>
          </div>
        </div>

        {/* Nouvelles demandes de droits */}
        {ready && (
          <div className="uo-req">
            <button className="uo-req-head" onClick={() => setShowRequests((v) => !v)} aria-expanded={showRequests}>
              <span className={`uo-req-bell ${requests.length ? "on" : ""}`}>{requests.length}</span>
              <span className="uo-req-title">Nouvelles demandes de droits</span>
              <span className="uo-req-sub">
                {requests.length
                  ? "Comptes à compléter (grade ou bureau) et comptes créés ces 7 derniers jours"
                  : "Aucune demande en attente"}
              </span>
              {requests.length > 0 && <Svg name="chevron" size={14} style={{ marginLeft: "auto", transform: showRequests ? "rotate(90deg)" : "none", transition: "transform .15s" }} />}
            </button>
            {showRequests && requests.length > 0 && (
              <div className="uo-req-list">
                {requests.map(({ r, reasons, age, isNew }) => {
                  const u = r.u;
                  const hasGrade = !!(u.grade && getProfile(profiles, u.grade));
                  const canClose = isNew && !reasons.length;
                  return (
                    <div className="uo-req-item" key={`req-${u.id}`}>
                      <div className="uo-user">
                        <div className="uo-avatar" style={{ width: 36, height: 36, fontSize: 11.5 }}>{initials(u)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="uo-name" style={{ fontSize: 13.5 }}>
                            <span>{displayName(u)}</span>
                            {reasons.map((x) => <span key={x} className="uo-tag warn">{x.toUpperCase()}</span>)}
                            {isNew && <span className="uo-tag new">NOUVEAU · {ageLabel(age).toUpperCase()}</span>}
                          </div>
                          <div className="uo-email">{u.email}{r.emp && r.emp.position ? ` · ${titleCase(r.emp.position)}` : ""}</div>
                        </div>
                      </div>
                      <FormSelect
                        className={`uo-input uo-req-sel ${!r.office ? "empty" : ""}`}
                        value={r.office}
                        onChange={(e) => saveOrg(u.id, { office: e.target.value })}
                        disabled={saving}
                        title="Bureau"
                      >
                        <option value="">Bureau…</option>
                        {BUREAUX.map((b) => <option key={b} value={b}>{b}</option>)}
                        {r.office && !BUREAUX.includes(r.office) && <option value={r.office}>{r.office.toUpperCase()}</option>}
                      </FormSelect>
                      <FormSelect
                        className={`uo-input uo-req-sel ${!hasGrade ? "empty" : ""}`}
                        value={hasGrade ? u.grade : ""}
                        onChange={(e) => onSetGrade(u.id, e.target.value)}
                        disabled={saving}
                        title="Le grade détermine les applications accordées"
                      >
                        <option value="">Grade…</option>
                        {profiles.map((p) => <option key={p.id} value={p.profile_id}>{p.name}</option>)}
                      </FormSelect>
                      <div className="uo-req-actions">
                        <button className="uo-btn ghost" onClick={() => goToUser(r)} title="Ouvrir la ligne de l'utilisateur et ses applications">Accès</button>
                        <button
                          className="uo-btn"
                          onClick={() => markReviewed(u.id)}
                          disabled={!canClose}
                          title={canClose ? "Retirer cette demande de la liste" : "Renseignez d'abord le grade et le bureau"}
                        >
                          Traité
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Invitation */}
        {showInvite && (
          <div className="uo-invite">
            <div className="uo-invite-grid">
              <div className="uo-field">
                <label className="uo-label">E-mail</label>
                <input className="uo-input" type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} placeholder="prenom.nom@exemple.com" autoFocus />
              </div>
              <div className="uo-field">
                <label className="uo-label">Bureau</label>
                <FormSelect className="uo-input" value={inv.office} onChange={(e) => setInv({ ...inv, office: e.target.value })}>
                  <option value="">Choisir…</option>
                  {BUREAUX.map((b) => <option key={b} value={b}>{b}</option>)}
                </FormSelect>
              </div>
              <div className="uo-field">
                <label className="uo-label">Département</label>
                <FormSelect
                  className="uo-input"
                  value={inv.department}
                  onChange={(e) => {
                    const department = e.target.value;
                    setInv((p) => ({ ...p, department, office: p.office || DEPT_OFFICE[department] || "" }));
                  }}
                >
                  <option value="">Choisir…</option>
                  {DEPARTEMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </FormSelect>
              </div>
              <div className="uo-field">
                <label className="uo-label">Grade</label>
                <FormSelect className="uo-input" value={inv.grade} onChange={(e) => setInv({ ...inv, grade: e.target.value })}>
                  <option value="">Choisir…</option>
                  {profiles.map((p) => <option key={p.id} value={p.profile_id}>{p.name}</option>)}
                </FormSelect>
              </div>
              <div className="uo-field">
                <label className="uo-label">Rôle</label>
                <FormSelect className="uo-input" value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value })}>
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </FormSelect>
              </div>
            </div>
            <div className="uo-invite-foot">
              <div className="uo-hint">
                Un e-mail d'invitation est envoyé pour définir le mot de passe. Utilisez l'e-mail de la fiche RH pour que le bureau et le département se remplissent tout seuls.
              </div>
              <button className="uo-btn" onClick={submitInvite} disabled={saving || !inv.email.trim()}>
                {saving ? "Envoi…" : "Envoyer l'invitation"}
              </button>
            </div>
          </div>
        )}

        <div className="uo-body">
          {/* Bureaux */}
          <div className="uo-tiles">
            <OrgTiles label="Bureaux">{tileKeys.map(renderTile)}</OrgTiles>
          </div>

          {/* Liste */}
          <div className="uo-main">
            {effOffice && (
              <div className="uo-listhead">
                <span>{officeFilter ? tileLabel(officeFilter) : "Résultats de recherche · tous les bureaux"}</span>
                {officeFilter && <button className="uo-btn ghost" onClick={() => setOfficeFilter("")}><Svg name="close" size={13} />Fermer</button>}
              </div>
            )}
            <div className="uo-toolbar">
              <div className="uo-search">
                <Svg name="search" size={15} />
                <input className="uo-input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un nom ou un e-mail…" />
              </div>
              <FormSelect className="uo-input sel" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option value="all">Tous les départements</option>
                {DEPARTEMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                <option value={NONE}>Sans département</option>
              </FormSelect>
              <FormSelect className="uo-input sel" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                <option value="all">Tous les grades</option>
                {profiles.map((p) => <option key={p.id} value={p.profile_id}>{p.name}</option>)}
                <option value="none">Sans grade</option>
              </FormSelect>
              {groupBy === "office" && (
                <button className="uo-btn ghost" onClick={toggleAllGroups}>
                  {allOpen ? "Tout replier" : "Tout déplier"}
                </button>
              )}
            </div>

            {error && <div className="uo-alert err">{error}</div>}
            {inviteMsg && <div className="uo-alert ok">{inviteMsg}</div>}

            {!effOffice ? null : loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="uo-table">
                <div className="uo-cols">
                  <span>Utilisateur</span>
                  <span style={{ paddingLeft: 12 }}>Bureau</span>
                  <span style={{ paddingLeft: 12 }}>Département</span>
                  <span style={{ paddingLeft: 12 }}>Grade</span>
                  <span>Accès</span>
                  <span />
                </div>

                {filtered.length === 0 && pendingFiltered.length === 0 ? (
                  <div className="uo-empty">
                    <b>Aucun utilisateur</b>
                    {rows.length ? "Aucun compte ne correspond à ces filtres." : "Invitez un premier utilisateur avec le bouton « Inviter »."}
                  </div>
                ) : groups.map((g) => {
                  const isOpen = !g.label || !!openGroups[g.key];
                  const inviteKey = `inv-${g.key}`;
                  return (
                    <React.Fragment key={g.key}>
                      {g.label && (
                        <div className={`uo-group ${isOpen ? "is-open" : ""}`}>
                          <button className={`uo-group-name ${isOpen ? "open" : ""}`} onClick={() => setOpenGroups((p) => ({ ...p, [g.key]: !isOpen }))} aria-expanded={isOpen}>
                            <Svg name="chevron" size={14} />
                            <span style={{ color: g.key === NONE ? "var(--warn)" : undefined }}>{g.label}</span>
                            <span className="uo-group-meta">
                              {g.items.length} compte{g.items.length > 1 ? "s" : ""}
                              {g.pending.length > 0 && <> · <span style={{ color: "var(--warn)" }}>{g.pending.length} à inviter</span></>}
                            </span>
                          </button>
                          {isOpen && g.key !== HORS && g.items.length > 0 && (bulkConfirm === g.key ? (
                            <div className="uo-bulk">
                              <span className="uo-bulk-confirm">
                                Donner le grade <b>{(getProfile(profiles, bulkGrade[g.key]) || {}).name}</b> aux {g.items.length} compte{g.items.length > 1 ? "s" : ""} de {g.label} ?
                              </span>
                              <button className="uo-btn" onClick={() => applyBulkGrade(g)} disabled={saving}>Confirmer</button>
                              <button className="uo-btn ghost" onClick={() => { setBulkConfirm(null); setBulkGrade((p) => ({ ...p, [g.key]: "" })); }}>Annuler</button>
                            </div>
                          ) : (
                            <div className="uo-bulk">
                              <FormSelect
                                value={bulkGrade[g.key] || ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setBulkGrade((p) => ({ ...p, [g.key]: v }));
                                  if (v) setBulkConfirm(g.key);
                                }}
                                title="Attribuer un grade à tous les comptes du bureau"
                              >
                                <option value="">Grade pour tout le bureau…</option>
                                {profiles.map((p) => <option key={p.id} value={p.profile_id}>{p.name}</option>)}
                              </FormSelect>
                            </div>
                          ))}
                        </div>
                      )}
                      {isOpen && g.items.map(renderRow)}
                      {isOpen && g.pending.length > 0 && (
                        <>
                          <div className="uo-subgroup">
                            <span>Fiches employés à inviter · {g.pending.length}</span>
                            <div className="uo-bulk">
                              {inviteProgress ? (
                                <span className="uo-bulk-confirm">Envoi des invitations… {inviteProgress}</span>
                              ) : inviteAllConfirm === inviteKey ? (
                                <>
                                  <span className="uo-bulk-confirm">Envoyer <b>{g.pending.length}</b> invitation{g.pending.length > 1 ? "s" : ""} par e-mail ?</span>
                                  <button className="uo-btn" onClick={() => inviteAllPending(g.pending)} disabled={saving}>Confirmer</button>
                                  <button className="uo-btn ghost" onClick={() => setInviteAllConfirm(null)}>Annuler</button>
                                </>
                              ) : (
                                <button className="uo-btn ghost" onClick={() => setInviteAllConfirm(inviteKey)} disabled={saving} title="Invite ces fiches avec leur grade, leurs applications, leur bureau et leur département">
                                  Inviter les {g.pending.length}
                                </button>
                              )}
                            </div>
                          </div>
                          {g.pending.map(renderPendingRow)}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {effOffice && (
              <div className="uo-foot">
                <span>
                {filtered.length === rows.length ? `${rows.length} utilisateur${rows.length > 1 ? "s" : ""}` : `${filtered.length} sur ${rows.length} utilisateurs`}
                {pendingAll.length > 0 && ` · ${pendingAll.length} fiche${pendingAll.length > 1 ? "s" : ""} employé à inviter`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}