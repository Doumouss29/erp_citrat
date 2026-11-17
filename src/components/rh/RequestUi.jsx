import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, ChevronRight, Minus, Paperclip, X } from "lucide-react";
import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { RH_GOLD } from "@/components/rh/RhPageHeader";
import { getLevel2Validator, getLevel3Validator } from "@/lib/workflowValidators";
import { safeUrl } from "@/lib/safeUrl";

// Éléments visuels communs aux pages de validation et aux pages Congés / Absences des agents.
export const PENDING_STATUSES = ["pending_level1", "pending_level2", "pending_level3"];

const ABSENCE_LABELS = {
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

const LEAVE_TYPE_LABELS = {
  annuel: "Congés annuels",
  maladie: "Congé maladie",
  maternite: "Congé maternité",
  special: "Congé spécial",
  sans_solde: "Congé sans solde",
};

export const norm = (value) => String(value || "").trim().toLowerCase();

export function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : parseISO(String(value));
  return isValid(date) ? date : null;
}

export function formatDate(value, pattern = "dd/MM/yyyy") {
  const date = toDate(value);
  return date ? format(date, pattern) : "—";
}

const isDecemberLeave = (item) => item.leave_period === "collectif" || item.leave_period === "decembre";

function requestLabel(kind, item) {
  if (kind === "absence") return ABSENCE_LABELS[item.absence_type] || "Absence";
  if (isDecemberLeave(item)) return "Congés de décembre";
  if (item.leave_period === "maternite") return LEAVE_TYPE_LABELS.maternite;
  return LEAVE_TYPE_LABELS[item.leave_type] || "Congé";
}

export function departureInfo(item) {
  const start = toDate(item.start_date);
  if (!start) return { label: "Date à vérifier", urgent: false };
  const days = differenceInCalendarDays(start, new Date());
  if (days < 0) return { label: "Déjà commencée", urgent: true };
  if (days === 0) return { label: "Commence aujourd'hui", urgent: true };
  if (days === 1) return { label: "Commence demain", urgent: true };
  return { label: `Commence dans ${days} jours`, urgent: days === 2 || !!item.is_urgent };
}

const startTime = (item) => toDate(item.start_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
export const byDeparture = (a, b) => startTime(a) - startTime(b);

const justificationUrl = (item) => item.justification_file_url || item.justification_url || "";
const missingJustification = (kind, item) =>
  kind === "absence" && ["maladie", "accident_travail"].includes(item.absence_type) && !justificationUrl(item);

export const ABSENCE_ALLOWANCE = 10;

function balanceInfo(kind, item, employeesById) {
  const employee = employeesById[item.employee_id];
  if (!employee) return null;
  const days = Number(item.total_days) || 0;
  let available;
  if (kind === "absence") available = Math.max(0, ABSENCE_ALLOWANCE - (employee.absence_days_used || 0));
  else available = isDecemberLeave(item) ? employee.remaining_december_days ?? 15 : employee.remaining_year_days ?? 15;
  return { available, after: available - days };
}

export const needsControl = (kind, item, employeesById) => {
  const balance = balanceInfo(kind, item, employeesById);
  return missingJustification(kind, item) || (balance && balance.after < 0);
};

const initials = (name) =>
  String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

// Tuile « verre » du bandeau, identique à celle du tableau de bord RH
export function BandTile({ label, sub, value, Icon, onClick, selected, highlight }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!selected : undefined}
      className={`group w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ring-1 ${
        selected ? "bg-[#E8F2F3] ring-2 ring-[#0C3D85]/30" : "bg-white ring-[#DFE8EA]"
      } ${onClick ? "hover:bg-[#F0F6F7] cursor-pointer" : ""}`}
    >
      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-none bg-[#F6EBD5]" style={{ color: "#A7792E" }}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs sm:text-sm font-medium text-[#0C3D85] truncate">{label}</span>
        {sub && <span className="hidden xl:block text-[11px] text-[#667A82] truncate">{sub}</span>}
      </span>
      <span className="min-w-[2.5rem] text-right text-xl font-semibold tabular-nums" style={{ color: highlight ? "#B8862E" : "#0C3D85" }}>{value}</span>
      <ChevronRight className={`w-4 h-4 flex-none ${onClick ? "text-[#8BA3AA] group-hover:text-[#0C3D85]" : "invisible"}`} aria-hidden="true" />
    </Comp>
  );
}

export function BandTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3 min-h-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "#A7792E" }}>{children}</p>
      {right}
    </div>
  );
}

// Couleur propre à chaque type de demande : vert pétrole pour les congés, orange pour les absences.
export const THEMES = {
  leave: {
    background: "linear-gradient(180deg,#f1f6f7 0%,#ffffff 70%)",
    vars: { "--accent": "#0C3D85", "--accent-on": "#d4af6a", "--accent-soft": "rgba(13,92,102,0.07)", "--accent-ring": "rgba(13,92,102,0.12)" },
  },
  absence: {
    background: "linear-gradient(180deg,#fff4ec 0%,#ffffff 70%)",
    vars: { "--accent": "#c2410c", "--accent-on": "#ffffff", "--accent-soft": "rgba(234,88,12,0.09)", "--accent-ring": "rgba(194,65,12,0.18)" },
  },
};

export function SectionBlock({ kind = "leave", icon: Icon, title, right, children }) {
  const theme = THEMES[kind];
  return (
    <section className="rounded-3xl overflow-hidden shadow-sm ring-1 ring-[var(--accent-ring)]" style={{ ...theme.vars, background: theme.background }}>
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 sm:px-7 py-4 border-b border-[var(--accent-ring)]">
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--accent)" }}>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)", color: "var(--accent-on)" }}>
            <Icon className="w-4 h-4" aria-hidden="true" />
          </span>
          {title}
        </h2>
        {right}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

const LEVELS = [
  { key: "level1", label: "Validation du bureau", short: "Bureau" },
  { key: "level2", label: "Validation RH", short: "RH" },
  { key: "level3", label: "Décision finale · DG", short: "DG" },
];

export function expectedValidator(item, level, validators) {
  if (level === "level1") return { name: item.level1_approver || "Validateur de bureau", email: item.level1_approver_email };
  const person = level === "level2" ? getLevel2Validator(validators) : getLevel3Validator(validators);
  return {
    name: person?.nom || (level === "level2" ? "Gestionnaire RH" : "Direction Générale"),
    email: item[`${level}_approver_email`] || person?.email,
  };
}

export function decisionOutcome(item, kind, approved) {
  if (!approved) return "La demande sera clôturée et l'agent recevra le motif du refus.";
  if (item.status === "pending_level1") return "La demande passera à l'étape suivante : validation RH.";
  if (item.status === "pending_level2") return "La demande passera à l'étape suivante : décision de la Direction Générale.";
  return kind === "leave"
    ? `La demande sera approuvée définitivement et ${item.total_days || 0} jour(s) seront décomptés du solde de l'agent.`
    : `La demande sera approuvée définitivement et ${item.total_days || 0} jour(s) d'absence seront comptabilisés.`;
}

function InfoTile({ label, sub, tone, children }) {
  const tones = { neutral: "bg-[var(--accent-soft)] text-slate-900", danger: "bg-red-50 text-red-800" };
  return (
    <div className={`rounded-xl px-3 py-2.5 min-w-0 ${tones[tone || "neutral"]}`}>
      <p className="text-[11px] font-medium opacity-70 truncate">{label}</p>
      <p className="text-sm font-bold mt-0.5 leading-snug tabular-nums">{children}</p>
      {sub && <p className="text-[11px] mt-0.5 opacity-80">{sub}</p>}
    </div>
  );
}

function WorkflowNode({ state, number, title, person, detail, comment, last, connected }) {
  const nodes = {
    done: "bg-[var(--accent)] text-white",
    rejected: "bg-red-700 text-white",
    current: "bg-[#d4af6a] text-[#0e4b53] ring-4 ring-[#d4af6a]/25",
    upcoming: "bg-white text-slate-400 ring-1 ring-slate-300",
    skipped: "bg-slate-100 text-slate-400",
  };
  return (
    <li className={`relative flex md:block gap-3 min-w-0 ${last ? "" : "pb-3 md:pb-0 md:pr-3"}`}>
      {!last && (
        <span
          className={`absolute left-[13px] top-7 bottom-0 w-0.5 md:left-9 md:right-1 md:top-[13px] md:bottom-auto md:w-auto md:h-0.5 ${connected ? "bg-[var(--accent)]" : "bg-slate-200"}`}
          aria-hidden="true"
        />
      )}
      <span className={`relative w-7 h-7 flex-none rounded-full flex items-center justify-center text-xs font-bold ${nodes[state]}`}>
        {state === "done" ? <Check className="w-4 h-4" aria-hidden="true" />
          : state === "rejected" ? <X className="w-4 h-4" aria-hidden="true" />
          : state === "skipped" ? <Minus className="w-4 h-4" aria-hidden="true" />
          : number}
      </span>
      <div className={`min-w-0 flex-1 md:mt-2.5 ${state === "current" ? "rounded-xl bg-[#d4af6a]/15 px-3 py-2" : "pt-0.5 md:pt-0 md:py-2"}`}>
        <p className={`text-sm font-semibold ${state === "upcoming" || state === "skipped" ? "text-slate-500" : "text-slate-900"}`}>{title}</p>
        {person && <p className="text-xs text-slate-600" title={person}>{person}</p>}
        <p className={`text-xs ${state === "current" ? "font-semibold text-[#7a5c1f]" : state === "rejected" ? "font-semibold text-red-700" : "text-slate-500"}`}>{detail}</p>
        {comment && <p className="text-xs text-slate-700 mt-1 rounded-lg bg-slate-50 px-2 py-1.5">{comment}</p>}
      </div>
    </li>
  );
}

function ValidationWorkflow({ item, validators }) {
  const rejectedAt = LEVELS.findIndex(({ key }) => item[`${key}_status`] === "rejected");
  const requested = item.requested_date || item.created_date;
  let previousDate = requested;

  const steps = LEVELS.map(({ key, label }, index) => {
    const status = item[`${key}_status`];
    const date = item[`${key}_date`];
    const comment = item[`${key}_comment`];
    const expected = expectedValidator(item, key, validators);
    const skipped = /non applicable/i.test(comment || "");
    const current = item.status === `pending_${key}`;
    const decider = item[`${key}_decided_by`];
    const substituted = decider && norm(item[`${key}_decided_by_email`]) !== norm(expected.email);
    let state = "upcoming";
    let detail = rejectedAt >= 0 && index > rejectedAt ? "Non atteinte" : "À venir";
    if (skipped) {
      state = "skipped";
      detail = "Non applicable pour ce demandeur";
    } else if (status === "approved") {
      state = "done";
      detail = `Validé le ${formatDate(date, "dd/MM/yyyy à HH:mm")}`;
    } else if (status === "rejected") {
      state = "rejected";
      detail = `Refusé le ${formatDate(date, "dd/MM/yyyy à HH:mm")}`;
    } else if (current) {
      state = "current";
      const start = toDate(previousDate);
      const waited = start ? differenceInCalendarDays(new Date(), start) : 0;
      detail = waited > 0 ? `En attente depuis ${waited} jour(s)` : "En attente depuis aujourd'hui";
    }
    if (date && !skipped) previousDate = date;
    const person = skipped ? "" : substituted ? `${decider}, à la place de ${expected.name}` : (decider || expected.name);
    return { key, label, state, person, detail, comment: skipped ? "" : comment };
  });

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: "#a8853f" }}>Circuit de validation</p>
      <ol className="grid grid-cols-1 md:grid-cols-4">
        <WorkflowNode state="done" title="Demande déposée" person={item.employee_name} detail={formatDate(requested, "dd/MM/yyyy à HH:mm")} connected={steps[0].state === "done" || steps[0].state === "skipped"} />
        {steps.map((step, index) => (
          <WorkflowNode
            key={step.key}
            number={index + 1}
            state={step.state}
            title={step.label}
            person={step.person}
            detail={step.detail}
            comment={step.comment}
            last={index === steps.length - 1}
            connected={index < steps.length - 1 && ["done", "skipped"].includes(steps[index + 1].state)}
          />
        ))}
      </ol>
    </div>
  );
}

export function RequestCard({ item, kind, employeesById, validators, canDecide, showActions, decisionMode, onDecide, selfView, note }) {
  const card = React.useRef(null);
  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demande") === item.id) {
      card.current?.scrollIntoView({ block: "center" });
      card.current?.focus({ preventScroll: true });
    }
  }, [item.id]);
  const departure = departureInfo(item);
  const missing = missingJustification(kind, item);
  const balance = balanceInfo(kind, item, employeesById);
  const url = justificationUrl(item);
  const overBalance = !decisionMode && balance && balance.after < 0;
  const approved = item.status === "approved";

  return (
    <article ref={card} tabIndex={-1} className="bg-white rounded-2xl ring-1 ring-[var(--accent-ring)] shadow-sm p-4 sm:p-5 flex flex-col gap-4 min-w-0">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-none text-sm font-bold" style={{ background: "var(--accent)", color: "var(--accent-on)" }}>
            {initials(item.employee_name)}
          </span>
          <div className="min-w-0">
            <h3 className="font-bold" style={{ color: "var(--accent)" }}>{selfView ? requestLabel(kind, item) : item.employee_name}</h3>
            <p className="text-xs text-slate-500">
              {selfView ? `Demandée le ${formatDate(item.requested_date || item.created_date)}` : `${requestLabel(kind, item)} · ${item.employee_location || "Bureau non renseigné"}`}
            </p>
          </div>
        </div>
        {decisionMode ? (
          <span className={`self-start md:self-center flex-none rounded-full px-2.5 py-1 text-[11px] font-bold ${approved ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-red-50 text-red-800"}`}>
            {approved ? "Approuvée" : "Refusée"}
          </span>
        ) : (
          <span className={`self-start md:self-center flex-none rounded-full px-2.5 py-1 text-[11px] font-bold ${departure.urgent ? "bg-red-50 text-red-800" : "bg-[var(--accent-soft)] text-[var(--accent)]"}`}>
            {departure.label}
          </span>
        )}
        {showActions && (
          canDecide ? (
            <div className="grid grid-cols-[2fr_3fr] md:flex gap-2 flex-none">
              <Button variant="outline" onClick={() => onDecide(item, kind, false)} className="rounded-xl font-semibold border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                Refuser
              </Button>
              <Button onClick={() => onDecide(item, kind, true)} className="bg-[var(--accent)] hover:opacity-90 text-white font-semibold rounded-xl shadow-sm border-0">
                Accepter
              </Button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 flex-none">Vous ne pouvez pas décider de votre propre demande.</p>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <InfoTile label="Début">{formatDate(item.start_date)}</InfoTile>
          <InfoTile label="Fin">{formatDate(item.end_date)}</InfoTile>
          <InfoTile label="Durée">{item.total_days || 0} jour(s)</InfoTile>
          <InfoTile
            label={kind === "leave" ? "Solde" : "Solde d'absence"}
            tone={overBalance ? "danger" : "neutral"}
            sub={balance && !decisionMode ? (overBalance ? `Dépassement de ${Math.abs(balance.after)} j` : `${balance.after} j après décision`) : undefined}
          >
            {balance ? `${balance.available} jour(s)` : "Non disponible"}
          </InfoTile>
        </div>
        <div className="min-w-0 space-y-2">
          {item.reason && (
            <div>
              <p className="text-[11px] font-medium text-slate-500 mb-1">Motif de la demande</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{item.reason}</p>
            </div>
          )}
          {kind === "absence" && missing && (
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800"><AlertTriangle className="w-4 h-4" aria-hidden="true" /> Justificatif manquant</p>
          )}
          {kind === "absence" && !missing && url && (
            <a href={safeUrl(url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold underline" style={{ color: "var(--accent)" }}>
              <Paperclip className="w-4 h-4" aria-hidden="true" /> Voir le justificatif
            </a>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--accent-ring)] pt-4">
        <ValidationWorkflow item={item} validators={validators} />
      </div>
      {note && <p className="text-xs text-slate-500 border-t border-[var(--accent-ring)] pt-3">{note}</p>}
    </article>
  );
}

export const CARD_GRID = "grid grid-cols-1 gap-4";

