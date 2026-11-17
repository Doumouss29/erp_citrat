const portal = "https://portail-digital-cgesn.com";
const fallbackLogo = "https://base44.app/api/apps/6aa96886350e13fe6882c8af/files/mp/public/6aa96886350e13fe6882c8af/ca2891085_Page1.png";
type Notice = { module: string; type: string; id: string; event: string; to: string; title: string; message: string; path: string; button: string; reference?: string; details?: Array<[string, string]> };
const escapes: Record<string,string> = { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" };
const escape = (s: string) => String(s).replace(/[&<>"']/g, c => escapes[c]);

export async function officialLogo(srv: any) {
  try {
    const [record] = await srv.entities.ConfigurationApp.filter({ cle: "logos_portail" }, "", 1);
    const value = record?.valeur?.header;
    if (value) {
      const url = new URL(value, portal);
      if (url.protocol === "https:" && !url.username && !url.password) return url.href;
    }
  } catch { /* Utiliser le dernier logo officiel connu si la configuration est indisponible. */ }
  return fallbackLogo;
}

const ABSENCE_LABELS: Record<string, string> = {
  maladie: "Maladie",
  accident_travail: "Accident du travail",
  mariage_travailleur: "Mariage du travailleur",
  mariage_enfant_frere_soeur: "Mariage enfant/frère/sœur",
  deces_conjoint: "Décès du conjoint",
  deces_enfant_pere_mere: "Décès enfant/père/mère",
  deces_frere_soeur: "Décès frère/sœur",
  deces_beau_parent: "Décès beau-parent",
  naissance_enfant: "Naissance d'un enfant",
  bapteme_enfant: "Baptême d'un enfant",
  premiere_communion: "Première communion",
  demenagement: "Déménagement",
  formation: "Formation",
  mission: "Mission",
  personnel: "Personnel",
  autre: "Autre",
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annuel: "Congés annuels",
  maladie: "Congé maladie",
  maternite: "Congé maternité",
  special: "Congé spécial",
  sans_solde: "Congé sans solde",
};

function short(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > 180 ? text.slice(0, 179).trimEnd() + "…" : text;
}

function dateFr(value: unknown) {
  return short(value).replace(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/, "$3/$2/$1");
}

function details(rows: Array<[string, unknown]>): Array<[string, string]> {
  return rows.map(([k,v]): [string,string] => [k, short(v)]).filter(([,v]) => v !== "");
}

export function hseDetails(event: any) {
  return details([
    ["Fiche", event.reference], ["Événement", event.event_type], ["Gravité", event.severity],
    ["Survenu le", [dateFr(event.date_event), event.time_event].filter(Boolean).join(" à ")],
    ["Lieu", [event.location, event.zone].filter(Boolean).join(" · ")],
    ["Trajet", [event.departure_point, event.arrival_point].filter(Boolean).join(" → ")],
    ["Mesures immédiates", event.immediate_measures], ["Statut", event.status],
  ]);
}

export function mailBody(n: Notice, logo = fallbackLogo) {
  const hse = n.module === "HSE-PRESFOR";
  const rh = n.module === "RH-CGESN";
  const service = hse ? "L’équipe Hygiène, Sécurité et Environnement (HSE) du PRESFOR" : rh ? "Service des ressources humaines" : "Administration du Portail Digital CGESN";
  const concise = rh || hse;
  const summary = n.details?.length ? `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:15px">${n.details.map(([key,value]) =>
    `<tr><th scope="row" align="left" valign="top" style="padding:4px 16px 4px 0;color:#47655c">${escape(key)}</th><td style="padding:4px 0">${escape(value)}</td></tr>`).join("")}</table>` : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f4;font-family:Arial,Helvetica,sans-serif;color:#22352f"><tr><td align="center" style="padding:18px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #dae2de">
<tr><td bgcolor="#0f5c52" style="padding:18px 22px;border-bottom:3px solid #d7ad52"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:16px"><img src="${escape(logo)}" width="88" alt="CGESN" style="display:block;width:88px;height:auto;border:0"></td>
<td style="color:white;font-size:19px;font-weight:bold">Portail Digital CGESN<br><span style="font-size:13px;font-weight:normal">Cabinet de Géomètre Expert Soro Nanga</span></td></tr></table></td></tr>
<tr><td style="padding:26px 24px 12px"><p style="margin:0 0 8px;color:#47655c;font-size:13px">${escape(n.module)}</p>
${concise ? "" : `<h1 style="margin:0 0 8px;font-size:21px;color:#123e36">Objet&nbsp;: ${escape(n.title)}</h1>`}
</td></tr><tr><td style="padding:0 24px 26px;font-size:15px;line-height:1.6">
${concise ? summary || `<p>${escape(hse ? n.title : n.message)}</p>` : `<p>Madame, Monsieur,</p><p>${escape(n.message)}</p>`}
<p style="margin:22px 0"><a href="${escape(portal + n.path)}" style="display:inline-block;background:#0f5c52;color:#fff;font-weight:bold;text-decoration:none;padding:10px 18px;border-radius:4px">${escape(n.button)}</a></p>
<p style="margin-bottom:0">${concise ? "" : "Cordialement,<br>"}<strong>${escape(service)}</strong>${hse ? "" : "<br>Cabinet de Géomètre Expert Soro Nanga"}</p>
</td></tr>${concise ? "" : `<tr><td style="padding:12px 24px;background:#edf3f0;color:#496057;font-size:12px">Correspondance institutionnelle émise depuis le Portail Digital CGESN.</td></tr>`}</table></td></tr></table>`;
}

async function deliver(srv: any, row: any, logo?: Promise<string>) {
  const table = srv.entities.Notification;
  const n = row.mail_notice;
  const claim = await table.updateMany({ id: row.id, $or: [
    { mail_status: { $exists: false } }, { mail_status: null }, { mail_status: "failed" }
  ] }, { $set: { mail_status: "sending", mail_attempt_at: new Date().toISOString() } });
  if (!claim.updated) return row.mail_status === "accepted" ? "accepted" : "pending";
  try {
    await srv.integrations.Core.SendEmail({ to: n.to, subject: `[${n.module}] ${n.title}`, body: mailBody(n, await (logo ?? officialLogo(srv))), from_name: "Portail Digital CGESN" });
  } catch (error) {
    // A network timeout leaves acceptance unknown. Do not automatically duplicate such a message.
    const status = Number((error as any)?.response?.status);
    const state = status >= 400 && status < 500 ? "failed" : "unknown";
    await table.update(row.id, { mail_status: state });
    return state;
  }
  await table.update(row.id, { mail_status: "accepted" });
  return "accepted";
}

export async function notify(srv: any, n: Notice, email = true, logo?: Promise<string>) {
  if (!n.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.to)) return "invalid";
  try {
    const key = JSON.stringify([n.module, n.id, n.event, n.to.trim().toLowerCase()]);
    const table = srv.entities.Notification;
    const result = await table.upsert([{ mail_key: key, mail_notice: n, user_email: n.to,
      related_id: n.id, type: n.type, title: n.title, message: n.message }], { key: "mail_key" });
    return email ? await deliver(srv, result.records[0], logo) : "internal";
  } catch {
    console.error("Communication à vérifier", n.module, n.id, n.event);
    return "unconfirmed";
  }
}

export async function retryFailed(srv: any) {
  const rows = await srv.entities.Notification.filter({ mail_status: "failed" }, "mail_attempt_at", 25);
  for (const row of rows) {
    if (!row.mail_notice || !row.mail_key) continue;
    // A validator or HSE recipient may have lost access since notification creation.
    const n = row.mail_notice;
    const [account] = await srv.entities.User.filter({ email: n.to });
    if (!account || account.role === "suspendu" || account.statut === "suspendu") continue;
    if (n.module === "HSE-PRESFOR") {
      const active = await srv.entities.ResponsableHSE.filter({ actif: true });
      if (!active.some((r: any) => String(r.email).toLowerCase() === n.to.toLowerCase())) continue;
      const profile = account.grade ? await srv.entities.AccessProfile.filter({ profile_id: account.grade }) : [];
      if (!(account.role === "admin" || account.super_admin || account.access?.includes("hse") || profile[0]?.apps?.includes("hse"))) continue;
    }
    await deliver(srv, row);
  }
}

export async function rhNotices(srv: any, kind: string, item: any, action: string, previous = "") {
  const level = String(action === "cancel" ? previous : item.status).replace("pending_", "");
  const names: Record<string,string> = { level1: "au responsable de validation", level2: "au service RH", level3: "à la Direction générale" };
  const title = action === "submit" ? "Demande reçue" : action === "cancel" ? "Demande retirée" :
    item.status === "approved" ? "Demande approuvée" : item.status === "rejected" ? "Demande refusée" : "Demande transmise";
  const event = action + ":" + previous + ":" + item.status;
  const noun = kind === "leave" ? "de congé" : "d’absence";
  const stage = title.replace("Demande ", "");
  const periods: Record<string,string> = { individuel: "Congés individuels (janvier à novembre)", annee: "Congés individuels (janvier à novembre)", collectif: "Congés collectifs de décembre", decembre: "Congés collectifs de décembre", maternite: "Congé maternité" };
  const dates = [...new Set([dateFr(item.start_date), dateFr(item.end_date)].filter(Boolean))].join(" au ");
  const rows = details([
    ["Demandeur", item.employee_name],
    ["Type", kind === "leave" ? LEAVE_TYPE_LABELS[item.leave_type] || item.leave_type : ABSENCE_LABELS[item.absence_type] || item.absence_type],
    ["Période", kind === "leave" ? periods[item.leave_period] || item.leave_period : ""],
    ["Dates", dates], ["Durée", item.total_days == null ? "" : String(item.total_days) + (Number(item.total_days) > 1 ? " jours" : " jour")],
    ["Motif", item.reason],
    ["Statut", action !== "cancel" && names[level] ? "En attente de validation" : title],
    ["Transmise", action !== "cancel" ? names[level] : ""],
  ]);
  const base = { module: "RH-CGESN", type: kind, id: item.id, event, button: "Suivre ma demande", details: rows };
  const message = `Votre demande ${noun} a été ${stage}.`;
  await notify(srv, { ...base, to: item.employee_email, title: `Demande ${noun} ${stage}`, message, path: (kind === "leave" ? "/rh/Conges" : "/rh/Absences") + (action === "cancel" ? "" : "?demande=" + encodeURIComponent(item.id)) });
  if (names[level]) await notify(srv, { ...base, event: event + ":validator", type: "validation", to: item[level + "_approver_email"],
    title: `Demande ${noun} ${action === "cancel" ? "retirée" : "à examiner"}`,
    message: action === "cancel" ? "Cette demande a été retirée du circuit de validation." : `Une demande ${kind === "leave" ? "de congé" : "d’absence"} attend votre décision.`,
    path: "/rh/Validation" + (action === "cancel" ? "" : "?demande=" + encodeURIComponent(item.id)), button: "Ouvrir les validations" });
}

export function portalNotice(srv: any, user: any, event: string, title: string, message: string) {
  return notify(srv, { module: "Portail CGESN", type: "general", id: user.id, event, to: user.email,
    title, message, path: "/portail", button: "Ouvrir mon portail" });
}
