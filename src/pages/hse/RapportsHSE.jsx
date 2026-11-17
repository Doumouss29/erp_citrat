import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText, Plus, Download, ArrowLeft, Check, CalendarRange, Images, PenLine, Send, AlertTriangle,
  Trash2, RotateCcw, Loader2, ShieldCheck, X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import HSEPageHeader, { hseBtnPrimary, hseBtnSecondary, hseIcon, HSE_TEAL } from "@/components/hse/HSEPageHeader";
import useHseRapportPerms from "@/hooks/useHseRapportPerms";

// ─── Utilitaires ────────────────────────────────────────────────────────────
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const ZONES = ["Worodougou", "Cavally"];
const quarterMonths = (t) => `${MOIS[(t - 1) * 3]} – ${MOIS[(t - 1) * 3 + 2]}`;
const nextQ = (a, t) => (t === 4 ? { annee: a + 1, trimestre: 1 } : { annee: a, trimestre: t + 1 });
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "");
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
const errMsg = (e, fallback) => e?.response?.data?.error || fallback;
const call = async (payload) => (await base44.functions.invoke("hseRapport", payload)).data;

const STATUT_STYLE = {
  Brouillon: "bg-amber-50 text-amber-800 border-amber-200",
  "Validé": "bg-emerald-50 text-emerald-800 border-emerald-200",
  Transmis: "bg-sky-50 text-sky-800 border-sky-200",
};
function StatutBadge({ statut }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUT_STYLE[statut] || STATUT_STYLE.Brouillon}`}>{statut || "Brouillon"}</span>;
}

async function openPdf(id) {
  try {
    const { url } = await call({ action: "pdf", id });
    window.open(url, "_blank", "noopener");
  } catch (e) {
    toast.error(errMsg(e, "PDF indisponible."));
  }
}

function downloadBase64(pdfBase64, filename) {
  const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b5f5a]/30 focus:border-[#0b5f5a] disabled:bg-slate-50 disabled:text-slate-500";

// ─── Page ───────────────────────────────────────────────────────────────────
export default function RapportsHSE() {
  const [params, setParams] = useSearchParams();
  const id = params.get("id");
  const { data: perms, isLoading, error } = useHseRapportPerms();

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 space-y-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;
  }
  if (error || !perms?.canView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <HSEPageHeader backTo="/hse" title="Rapports trimestriels HSE" />
        <div className="max-w-3xl mx-auto px-4 py-10 text-center text-slate-600">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <p className="font-semibold text-slate-800">Accès réservé</p>
          <p className="text-sm mt-1">Les rapports trimestriels sont préparés par le Référent HSE et validés par le Coordinateur HSE ou le Chef de projet HSE.</p>
        </div>
      </div>
    );
  }
  return id
    ? <RapportEditor id={id} perms={perms} onBack={() => setParams({})} />
    : <RapportList perms={perms} onOpen={(rid) => setParams({ id: rid })} />;
}

// ─── Liste des rapports ─────────────────────────────────────────────────────
function RapportList({ perms, onOpen }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["hse-rapports"], queryFn: () => call({ action: "list" }) });
  const rapports = data?.rapports || [];
  const now = new Date();
  const [createOpen, setCreateOpen] = useState(false);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [trimestre, setTrimestre] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setCreating(true);
    try {
      const res = await call({ action: "create", annee, trimestre });
      if (res.existing) toast.info(`Le rapport T${trimestre} ${annee} existe déjà : il est ouvert.`);
      queryClient.invalidateQueries({ queryKey: ["hse-rapports"] });
      setCreateOpen(false);
      onOpen(res.rapport.id);
    } catch (e) {
      toast.error(errMsg(e, "Création impossible."));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <HSEPageHeader
        backTo="/hse"
        title="Rapports trimestriels HSE"
        subtitle="Préparation, validation et archivage des rapports transmis"
        actions={perms.canPrepare && (
          <button type="button" className={hseBtnPrimary} onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" strokeWidth={2.2} /> Nouveau rapport
          </button>
        )}
      />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
        ) : rapports.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-800">Aucun rapport pour l'instant</p>
            <p className="text-sm text-slate-500 mt-1">{perms.canPrepare ? "Créez le rapport du trimestre pour commencer." : "Le Référent HSE n'a pas encore créé de rapport."}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rapports.map((r) => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-2xl font-bold text-slate-900">T{r.trimestre} {r.annee}</div>
                    <div className="text-sm text-slate-500 capitalize">{quarterMonths(r.trimestre)} {r.annee}</div>
                  </div>
                  <StatutBadge statut={r.statut} />
                </div>
                <div className="mt-4 space-y-1 text-sm text-slate-600 flex-1">
                  <div>Zones : <span className="text-slate-800">{(r.zones?.length ? r.zones : ZONES).join(", ")}</span></div>
                  <div>{r.pdf_genere_le ? <>PDF du {fmtDateTime(r.pdf_genere_le)}{r.modifie_apres_pdf && r.statut === "Brouillon" && <span className="text-amber-700"> (à regénérer)</span>}</> : <span className="text-slate-400">PDF pas encore généré</span>}</div>
                  {r.valide_par && <div>Validé par {r.valide_par} le {fmtDate(r.valide_le)}</div>}
                  {r.transmis_le && <div>Transmis le {fmtDate(r.transmis_le)}</div>}
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" className={`${hseBtnPrimary} flex-1`} onClick={() => onOpen(r.id)}>
                    {r.statut === "Brouillon" && perms.canPrepare ? <><PenLine className="w-4 h-4" /> Préparer</> : <>Ouvrir</>}
                  </button>
                  {r.pdf_uri && (
                    <button type="button" className={hseBtnSecondary} onClick={() => openPdf(r.id)} aria-label="Télécharger le PDF">
                      <Download className={hseIcon} /> PDF
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau rapport trimestriel</DialogTitle>
            <DialogDescription>Le contenu est prérempli à partir du rapport du trimestre précédent, s'il existe.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-slate-700">Année
              <select className={`${field} mt-1`} value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Trimestre
              <select className={`${field} mt-1`} value={trimestre} onChange={(e) => setTrimestre(Number(e.target.value))}>
                {[1, 2, 3, 4].map((t) => <option key={t} value={t}>T{t} ({quarterMonths(t)})</option>)}
              </select>
            </label>
          </div>
          <DialogFooter>
            <button type="button" className={hseBtnSecondary} onClick={() => setCreateOpen(false)}>Annuler</button>
            <button type="button" className={hseBtnPrimary} disabled={creating} onClick={create}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Créer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Préparation d'un rapport ───────────────────────────────────────────────
const STEPS = [
  { key: "periode", label: "Période", icon: CalendarRange },
  { key: "contenu", label: "Contenu", icon: PenLine },
  { key: "photos", label: "Annexes et photos", icon: Images },
  { key: "generation", label: "PDF et validation", icon: FileText },
];

const toDraft = (r) => ({
  zones: r.zones?.length ? r.zones : [...ZONES],
  deces_invalidite: !!r.deces_invalidite,
  recommandations_precedentes: r.recommandations_precedentes || [],
  progres: r.progres || "",
  risques: r.risques || "",
  recommandationsText: (r.recommandations || []).join("\n"),
  pae_ppsps: r.pae_ppsps || [],
  pae_synthese: r.pae_synthese || "",
  planification: r.planification || [],
  inclure_fiches: r.inclure_fiches !== false,
  inclure_photos: r.inclure_photos !== false,
  photos_par_page: Number(r.photos_par_page) === 2 ? 2 : 4,
  photos_exclues: r.photos_exclues || [],
});
const fromDraft = (d) => {
  const { recommandationsText, ...rest } = d;
  return { ...rest, recommandations: recommandationsText.split("\n").map((l) => l.trim()).filter(Boolean) };
};

function RapportEditor({ id, perms, onBack }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["hse-rapport", id], queryFn: () => call({ action: "get", id }) });
  const rapport = data?.rapport;
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState("periode");
  const [busy, setBusy] = useState(null); // "save" | "pdf" | "status" | "delete"
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { if (rapport && !dirty) setDraft(toDraft(rapport)); }, [rapport?.id, rapport?.updated_date]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const zonesKey = (draft?.zones || []).join(",");
  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ["hse-rapport-preview", id, zonesKey],
    queryFn: () => call({ action: "preview", id, zones: draft.zones }),
    enabled: !!draft,
  });

  if (isLoading || (!draft && !error)) {
    return <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 space-y-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>;
  }
  if (error || !rapport) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-slate-700">{errMsg(error, "Rapport introuvable.")}</p>
        <button type="button" className={`${hseBtnSecondary} mt-4`} onClick={onBack}><ArrowLeft className={hseIcon} /> Retour aux rapports</button>
      </div>
    );
  }

  const readOnly = rapport.statut !== "Brouillon" || !perms.canPrepare;
  const set = (patch) => { setDraft((d) => ({ ...d, ...patch })); setDirty(true); };
  const refresh = (r) => {
    queryClient.setQueryData(["hse-rapport", id], (old) => ({ ...(old || {}), rapport: r }));
    queryClient.invalidateQueries({ queryKey: ["hse-rapports"] });
  };

  const save = async (silent = false) => {
    setBusy("save");
    try {
      const res = await call({ action: "save", id, patch: fromDraft(draft) });
      setDirty(false);
      refresh(res.rapport);
      if (!silent) toast.success("Rapport enregistré.");
      return true;
    } catch (e) {
      toast.error(errMsg(e, "Enregistrement impossible."));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const generate = async () => {
    if (dirty && !(await save(true))) return;
    setBusy("pdf");
    try {
      const res = await base44.functions.invoke("exportHSEPDF", { rapportId: id });
      downloadBase64(res.data.pdfBase64, res.data.filename);
      const fresh = await call({ action: "get", id });
      refresh(fresh.rapport);
      toast.success("PDF généré et archivé dans le rapport.");
    } catch (e) {
      toast.error(errMsg(e, "La génération a échoué. Réessayez ; avec beaucoup de photos, retirez-en quelques-unes."));
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (statut) => {
    setBusy("status");
    try {
      const res = await call({ action: "status", id, statut });
      refresh(res.rapport);
      toast.success(statut === "Validé" ? "Rapport validé : son contenu et son PDF sont figés." : statut === "Transmis" ? "Rapport marqué comme transmis." : "Rapport rouvert en brouillon.");
    } catch (e) {
      toast.error(errMsg(e, "Action impossible."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await call({ action: "delete", id });
      queryClient.invalidateQueries({ queryKey: ["hse-rapports"] });
      toast.success("Brouillon supprimé.");
      onBack();
    } catch (e) {
      toast.error(errMsg(e, "Suppression impossible."));
      setBusy(null);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const nq = nextQ(rapport.annee, rapport.trimestre);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-24">
      <HSEPageHeader
        title={`Rapport T${rapport.trimestre} ${rapport.annee}`}
        subtitle={`${quarterMonths(rapport.trimestre)} ${rapport.annee} • ${rapport.statut}${readOnly && rapport.statut === "Brouillon" ? " • lecture seule" : ""}`}
        actions={<StatutBadge statut={rapport.statut} />}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4">
        <button type="button" onClick={() => { if (!dirty || window.confirm("Des modifications ne sont pas enregistrées. Quitter quand même ?")) onBack(); }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#0b5f5a]">
          <ArrowLeft className="w-4 h-4" /> Tous les rapports
        </button>

        {/* Étapes */}
        <nav aria-label="Étapes du rapport" className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const on = s.key === step;
            return (
              <button key={s.key} type="button" onClick={() => setStep(s.key)} aria-current={on ? "step" : undefined}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${on ? "border-[#0b5f5a] bg-white shadow-sm" : "border-slate-200 bg-white/60 hover:bg-white"}`}>
                <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold ${on ? "bg-[#0b5f5a] text-white" : i < stepIndex ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {i < stepIndex ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800 truncate">{s.label}</span>
                </span>
                <Icon className={`ml-auto hidden lg:block w-4 h-4 ${on ? "text-[#0b5f5a]" : "text-slate-400"}`} />
              </button>
            );
          })}
        </nav>

        <div className="mt-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6">
          {step === "periode" && <StepPeriode rapport={rapport} draft={draft} set={set} readOnly={readOnly} preview={preview} loading={previewLoading} />}
          {step === "contenu" && <StepContenu draft={draft} set={set} readOnly={readOnly} nextLabel={`T${nq.trimestre} ${nq.annee}`} />}
          {step === "photos" && <StepPhotos draft={draft} set={set} readOnly={readOnly} preview={preview} loading={previewLoading} />}
          {step === "generation" && (
            <StepGeneration rapport={rapport} perms={perms} draft={draft} preview={preview} dirty={dirty} busy={busy}
              onGenerate={generate} onStatus={setStatus} onDelete={() => setConfirmDelete(true)} />
          )}
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur xl:left-[264px] pb-[env(safe-area-inset-bottom)] max-md:bottom-[68px]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2">
          <button type="button" className={hseBtnSecondary} disabled={stepIndex === 0} onClick={() => setStep(STEPS[stepIndex - 1].key)}>Précédent</button>
          <span className="flex-1 text-xs text-slate-500 text-center truncate">
            {readOnly ? (rapport.statut === "Brouillon" ? "Lecture seule" : `Rapport ${rapport.statut.toLowerCase()} : contenu figé`) : dirty ? "Modifications non enregistrées" : "Tout est enregistré"}
          </span>
          {!readOnly && (
            <button type="button" className={hseBtnSecondary} disabled={!dirty || !!busy} onClick={() => save()}>
              {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className={hseIcon} />} Enregistrer
            </button>
          )}
          {stepIndex < STEPS.length - 1 && (
            <button type="button" className={hseBtnPrimary} onClick={() => setStep(STEPS[stepIndex + 1].key)}>Suivant</button>
          )}
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer ce brouillon ?</DialogTitle>
            <DialogDescription>Le rapport T{rapport.trimestre} {rapport.annee} et son contenu seront supprimés définitivement. Les fiches HSE ne sont pas touchées.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className={hseBtnSecondary} onClick={() => setConfirmDelete(false)}>Annuler</button>
            <button type="button" className={`${hseBtnPrimary} !bg-red-600 hover:!bg-red-700`} disabled={busy === "delete"} onClick={remove}>
              {busy === "delete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Supprimer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Étape 1 : période et aperçu ────────────────────────────────────────────
function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="text-2xl font-bold">{value ?? "–"}</div>
      <div className="text-xs font-medium mt-0.5">{label}</div>
    </div>
  );
}

function StepPeriode({ rapport, draft, set, readOnly, preview, loading }) {
  const toggleZone = (z) => {
    const zones = draft.zones.includes(z) ? draft.zones.filter((x) => x !== z) : [...draft.zones, z];
    if (zones.length) set({ zones });
  };
  return (
    <div className="space-y-6">
      <Section title="Période couverte" hint="Trimestre civil. Une fiche est rattachée à la date de l'événement (à défaut, à sa date de déclaration).">
        <div className="text-lg font-semibold text-slate-900 capitalize">{quarterMonths(rapport.trimestre)} {rapport.annee}</div>
      </Section>
      <Section title="Zones" hint="Au moins une zone. Les fiches sans zone ne sont comptées que si les deux zones sont retenues.">
        <div className="flex flex-wrap gap-2">
          {ZONES.map((z) => {
            const on = draft.zones.includes(z);
            return (
              <button key={z} type="button" disabled={readOnly} onClick={() => toggleZone(z)} aria-pressed={on}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${on ? "border-[#0b5f5a] bg-[#0b5f5a]/10 text-[#0b5f5a]" : "border-slate-200 text-slate-600"} disabled:opacity-70`}>
                {on && <Check className="w-4 h-4" />} {z}
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Aperçu des fiches du trimestre">
        {loading || !preview ? <Skeleton className="h-20 rounded-xl" /> : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Fiches" value={preview.total} tone="bg-slate-50 border-slate-200 text-slate-800" />
              <Stat label="Accidents" value={preview.accidents} tone="bg-red-50 border-red-100 text-red-800" />
              <Stat label="Incidents" value={preview.incidents} tone="bg-amber-50 border-amber-100 text-amber-800" />
              <Stat label="Presqu'accidents" value={preview.presquAccidents} tone="bg-sky-50 border-sky-100 text-sky-800" />
            </div>
            <div className="mt-4 space-y-2">
              {preview.total === 0 && <Notice>Aucune fiche sur ce trimestre pour les zones choisies.</Notice>}
              {preview.ouvertes.length > 0 && (
                <Notice>{preview.ouvertes.length} fiche(s) encore ouverte(s) : {preview.ouvertes.map((f) => `N°${f.fiche_number}`).join(", ")}. Pensez à les clôturer avant la validation.</Notice>
              )}
              {preview.sansPhoto.length > 0 && (
                <Notice>{preview.sansPhoto.length} fiche(s) sans photo : {preview.sansPhoto.map((n) => `N°${n}`).join(", ")}.</Notice>
              )}
            </div>
          </>
        )}
      </Section>
    </div>
  );
}

// ─── Étape 2 : contenu rédigé ───────────────────────────────────────────────
function StepContenu({ draft, set, readOnly, nextLabel }) {
  return (
    <div className="space-y-8">
      <Section title="Bilan sécurité" hint="Remplace la phrase automatique du rapport.">
        <div className="flex flex-wrap gap-2">
          {[[false, "Aucun décès ni invalidité permanente"], [true, "Décès ou invalidité permanente à déplorer"]].map(([v, label]) => (
            <button key={String(v)} type="button" disabled={readOnly} aria-pressed={draft.deces_invalidite === v} onClick={() => set({ deces_invalidite: v })}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${draft.deces_invalidite === v ? (v ? "border-red-500 bg-red-50 text-red-800" : "border-[#0b5f5a] bg-[#0b5f5a]/10 text-[#0b5f5a]") : "border-slate-200 text-slate-600"} disabled:opacity-70`}>
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Recommandations du trimestre précédent" hint="Reprises du rapport précédent. Indiquez où en est chacune.">
        <RowsEditor rows={draft.recommandations_precedentes} onChange={(v) => set({ recommandations_precedentes: v })} readOnly={readOnly}
          addLabel="Ajouter une recommandation" empty={{ texte: "", etat: "En cours" }}
          cols={[
            { key: "texte", label: "Recommandation", span: "md:col-span-8" },
            { key: "etat", label: "État", span: "md:col-span-4", options: ["Réalisée", "En cours", "Non réalisée"] },
          ]} />
      </Section>

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Progrès constatés" hint="Un point par ligne.">
          <textarea className={`${field} min-h-[130px]`} disabled={readOnly} value={draft.progres} onChange={(e) => set({ progres: e.target.value })} />
        </Section>
        <Section title="Risques restant à maîtriser" hint="Un point par ligne.">
          <textarea className={`${field} min-h-[130px]`} disabled={readOnly} value={draft.risques} onChange={(e) => set({ risques: e.target.value })} />
        </Section>
      </div>

      <Section title={`Recommandations pour le trimestre suivant (${nextLabel})`} hint="Un point par ligne. Elles seront reprises dans le prochain rapport pour leur suivi.">
        <textarea className={`${field} min-h-[130px]`} disabled={readOnly} value={draft.recommandationsText} onChange={(e) => set({ recommandationsText: e.target.value })} />
      </Section>

      <Section title="Évaluation des activités PAE et PPSPS">
        <RowsEditor rows={draft.pae_ppsps} onChange={(v) => set({ pae_ppsps: v })} readOnly={readOnly}
          addLabel="Ajouter une activité" empty={{ activite: "", statut: "En cours", taux: "", observations: "" }}
          cols={[
            { key: "activite", label: "Activité", span: "md:col-span-5" },
            { key: "statut", label: "Statut", span: "md:col-span-2", options: ["Exécuté", "En cours", "Non débuté"] },
            { key: "taux", label: "Taux", span: "md:col-span-1" },
            { key: "observations", label: "Observations", span: "md:col-span-4" },
          ]} />
        <label className="block mt-3 text-sm font-medium text-slate-700">Synthèse
          <textarea className={`${field} mt-1 min-h-[80px]`} disabled={readOnly} value={draft.pae_synthese} onChange={(e) => set({ pae_synthese: e.target.value })}
            placeholder="Nombre d'activités exécutées / en cours / non débutées et taux global par catégorie" />
        </label>
      </Section>

      <Section title={`Planification des activités du trimestre suivant (${nextLabel})`}>
        <RowsEditor rows={draft.planification} onChange={(v) => set({ planification: v })} readOnly={readOnly}
          addLabel="Ajouter une activité" empty={{ activite: "", periode: nextLabel, responsable: "", budget: "" }}
          cols={[
            { key: "activite", label: "Activité prévue", span: "md:col-span-5" },
            { key: "periode", label: "Période", span: "md:col-span-2" },
            { key: "responsable", label: "Responsable", span: "md:col-span-3" },
            { key: "budget", label: "Budget", span: "md:col-span-2" },
          ]} />
      </Section>
    </div>
  );
}

// ─── Étape 3 : annexes et photos ────────────────────────────────────────────
function StepPhotos({ draft, set, readOnly, preview, loading }) {
  const photos = preview?.photos || [];
  const excluded = useMemo(() => new Set(draft.photos_exclues), [draft.photos_exclues]);
  const selected = photos.filter((p) => !excluded.has(p.key));
  const max = preview?.maxPhotos || 60;
  const groups = useMemo(() => {
    const g = [];
    for (const p of photos) {
      let grp = g.find((x) => x.name === p.groupe);
      if (!grp) g.push((grp = { name: p.groupe, items: [] }));
      grp.items.push(p);
    }
    return g;
  }, [photos]);
  const toggle = (key) => set({ photos_exclues: excluded.has(key) ? draft.photos_exclues.filter((k) => k !== key) : [...draft.photos_exclues, key] });

  return (
    <div className="space-y-6">
      <Section title="Annexes du rapport">
        <div className="space-y-2">
          <Toggle checked={draft.inclure_fiches} disabled={readOnly} onChange={(v) => set({ inclure_fiches: v })} label="Fiches individuelles de consignation" hint="Une page par fiche du trimestre." />
          <Toggle checked={draft.inclure_photos} disabled={readOnly} onChange={(v) => set({ inclure_photos: v })} label="Annexe photos" hint="Photos des fiches du trimestre et de la galerie, avec légende automatique." />
        </div>
        {draft.inclure_photos && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            Mise en page :
            {[2, 4].map((n) => (
              <button key={n} type="button" disabled={readOnly} aria-pressed={draft.photos_par_page === n} onClick={() => set({ photos_par_page: n })}
                className={`rounded-full border px-3 py-1 text-sm ${draft.photos_par_page === n ? "border-[#0b5f5a] bg-[#0b5f5a]/10 text-[#0b5f5a] font-semibold" : "border-slate-200 text-slate-600"}`}>
                {n} par page
              </button>
            ))}
          </div>
        )}
      </Section>

      {draft.inclure_photos && (
        <Section title="Photos retenues" hint="Décochez les photos à ne pas imprimer. Les photos de la galerie sont retrouvées par leur date (et leur zone si elle est renseignée).">
          {loading || !preview ? <Skeleton className="h-40 rounded-xl" /> : photos.length === 0 ? (
            <Notice>Aucune photo trouvée pour ce trimestre.</Notice>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`text-sm font-semibold ${selected.length > max ? "text-red-700" : "text-slate-800"}`}>{selected.length} retenue(s) sur {photos.length}</span>
                {selected.length > max && <span className="text-sm text-red-700">— seules les {max} premières seront imprimées</span>}
                {!readOnly && (
                  <span className="ml-auto flex gap-2">
                    <button type="button" className={hseBtnSecondary} onClick={() => set({ photos_exclues: [] })}>Tout cocher</button>
                    <button type="button" className={hseBtnSecondary} onClick={() => set({ photos_exclues: photos.map((p) => p.key) })}>Tout décocher</button>
                  </span>
                )}
              </div>
              <div className="space-y-5">
                {groups.map((g) => (
                  <div key={g.name}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{g.name}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {g.items.map((p) => {
                        const on = !excluded.has(p.key);
                        return (
                          <button key={p.key} type="button" disabled={readOnly} onClick={() => toggle(p.key)} aria-pressed={on} title={p.legende}
                            className={`group relative overflow-hidden rounded-xl border-2 text-left transition ${on ? "border-[#0b5f5a]" : "border-slate-200 opacity-50"}`}>
                            <img src={p.url} alt={p.legende} loading="lazy" className="aspect-[4/3] w-full object-cover bg-slate-100" />
                            <span className={`absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full ${on ? "bg-[#0b5f5a] text-white" : "bg-white/90 text-slate-500 border border-slate-300"}`}>
                              {on ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            </span>
                            <span className="block px-2 py-1.5 text-[12px] leading-snug text-slate-600 line-clamp-2">{p.legende}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>
      )}
    </div>
  );
}

// ─── Étape 4 : génération et validation ─────────────────────────────────────
function StepGeneration({ rapport, perms, draft, preview, dirty, busy, onGenerate, onStatus, onDelete }) {
  const photosCount = preview ? Math.min(preview.photos.filter((p) => !(draft.photos_exclues || []).includes(p.key)).length, preview.maxPhotos) : null;
  const pdfState = !rapport.pdf_uri ? "none" : (rapport.modifie_apres_pdf || dirty) ? "outdated" : "ok";
  const isDraft = rapport.statut === "Brouillon";
  const canValidateNow = perms.canValidate && isDraft && pdfState === "ok";

  return (
    <div className="space-y-6">
      <Section title="Contenu du PDF">
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          <CheckItem ok>{preview ? `${preview.total} fiche(s) du trimestre` : "Fiches du trimestre"} — {draft.zones.join(" et ")}</CheckItem>
          <CheckItem ok={!preview || preview.ouvertes.length === 0} warn>{preview && preview.ouvertes.length ? `${preview.ouvertes.length} fiche(s) encore ouverte(s)` : "Toutes les fiches sont clôturées"}</CheckItem>
          <CheckItem ok>{draft.inclure_fiches ? "Fiches individuelles en annexe" : "Sans fiches individuelles"}</CheckItem>
          <CheckItem ok>{draft.inclure_photos ? `Annexe photos : ${photosCount ?? "…"} photo(s), ${draft.photos_par_page} par page` : "Sans annexe photos"}</CheckItem>
        </ul>
      </Section>

      <Section title="PDF">
        <div className="flex flex-wrap items-center gap-3">
          {pdfState === "none" && <span className="text-sm text-slate-500">Pas encore généré.</span>}
          {pdfState === "outdated" && <span className="text-sm text-amber-700 inline-flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Le contenu a changé depuis le dernier PDF ({fmtDateTime(rapport.pdf_genere_le)}).</span>}
          {pdfState === "ok" && <span className="text-sm text-emerald-700 inline-flex items-center gap-1.5"><Check className="w-4 h-4" /> PDF à jour, généré le {fmtDateTime(rapport.pdf_genere_le)}.</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {isDraft && perms.canPrepare && (
            <button type="button" className={hseBtnPrimary} disabled={!!busy} onClick={onGenerate}>
              {busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {busy === "pdf" ? "Génération en cours…" : pdfState === "none" ? "Générer le PDF" : "Regénérer le PDF"}
            </button>
          )}
          {rapport.pdf_uri && (
            <button type="button" className={hseBtnSecondary} onClick={() => openPdf(rapport.id)}><Download className={hseIcon} /> Télécharger le PDF archivé</button>
          )}
        </div>
        {busy === "pdf" && <p className="mt-2 text-xs text-slate-500">Avec les photos, la génération peut prendre une à deux minutes. Ne fermez pas la page.</p>}
      </Section>

      <Section title="Validation et transmission" hint="Une fois validé, le rapport et son PDF sont figés. Seul un validateur peut le rouvrir.">
        <ol className="space-y-2 text-sm text-slate-700">
          <li className="flex gap-2"><Dot done /> Préparé par {rapport.prepare_par || "—"}</li>
          <li className="flex gap-2"><Dot done={!!rapport.pdf_uri} /> PDF {rapport.pdf_genere_le ? `généré le ${fmtDateTime(rapport.pdf_genere_le)}` : "à générer"}</li>
          <li className="flex gap-2"><Dot done={!!rapport.valide_le} /> {rapport.valide_le ? `Validé par ${rapport.valide_par} le ${fmtDate(rapport.valide_le)}` : "À valider par le Coordinateur HSE ou le Chef de projet HSE"}</li>
          <li className="flex gap-2"><Dot done={!!rapport.transmis_le} /> {rapport.transmis_le ? `Transmis le ${fmtDate(rapport.transmis_le)}` : "À transmettre"}</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          {perms.canValidate && isDraft && (
            <button type="button" className={hseBtnPrimary} disabled={!canValidateNow || !!busy} onClick={() => onStatus("Validé")}
              title={canValidateNow ? "" : "Générez d'abord un PDF à jour"}>
              <ShieldCheck className="w-4 h-4" /> Valider le rapport
            </button>
          )}
          {rapport.statut === "Validé" && (perms.canValidate || perms.canPrepare) && (
            <button type="button" className={hseBtnPrimary} disabled={!!busy} onClick={() => onStatus("Transmis")}><Send className="w-4 h-4" /> Marquer comme transmis</button>
          )}
          {perms.canValidate && !isDraft && (
            <button type="button" className={hseBtnSecondary} disabled={!!busy} onClick={() => onStatus("Brouillon")}><RotateCcw className={hseIcon} /> Rouvrir en brouillon</button>
          )}
          {perms.canPrepare && isDraft && (
            <button type="button" className={`${hseBtnSecondary} !text-red-700`} disabled={!!busy} onClick={onDelete}><Trash2 className="w-4 h-4" /> Supprimer le brouillon</button>
          )}
        </div>
        {perms.canValidate && isDraft && pdfState !== "ok" && <p className="mt-2 text-xs text-slate-500">La validation sera possible dès qu'un PDF à jour aura été généré.</p>}
      </Section>
    </div>
  );
}

// ─── Petits composants ──────────────────────────────────────────────────────
function Section({ title, hint, children }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
function Notice({ children }) {
  return <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"><AlertTriangle className="w-4 h-4 flex-none mt-0.5" /><span>{children}</span></div>;
}
function CheckItem({ ok, warn, children }) {
  return (
    <li className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      {ok ? <Check className="w-4 h-4 mt-0.5 text-emerald-600 flex-none" /> : <AlertTriangle className={`w-4 h-4 mt-0.5 flex-none ${warn ? "text-amber-600" : "text-red-600"}`} />}
      <span className="text-slate-700">{children}</span>
    </li>
  );
}
function Dot({ done }) {
  return <span className={`mt-1 h-3 w-3 flex-none rounded-full border-2 ${done ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"}`} />;
}
function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label className={`flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2.5 ${disabled ? "opacity-70" : "cursor-pointer hover:bg-slate-50"}`}>
      <input type="checkbox" className="mt-1 h-4 w-4" style={{ accentColor: HSE_TEAL }} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span><span className="block text-sm font-medium text-slate-800">{label}</span>{hint && <span className="block text-xs text-slate-500">{hint}</span>}</span>
    </label>
  );
}

function RowsEditor({ rows, onChange, cols, readOnly, addLabel, empty }) {
  const update = (i, key, value) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const remove = (i) => onChange(rows.filter((_, j) => j !== i));
  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="hidden md:grid grid-cols-12 gap-2 px-1 text-xs font-semibold text-slate-500">
          {cols.map((c) => <div key={c.key} className={c.span}>{c.label}</div>)}
        </div>
      )}
      {rows.map((r, i) => (
        <div key={i} className="relative grid grid-cols-1 md:grid-cols-12 gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-2 md:border-0 md:bg-transparent md:p-0 md:pr-10">
          {cols.map((c) => (
            <label key={c.key} className={`${c.span} block`}>
              <span className="md:sr-only text-xs font-medium text-slate-500">{c.label}</span>
              {c.options ? (
                <select className={field} disabled={readOnly} value={r[c.key] || c.options[0]} onChange={(e) => update(i, c.key, e.target.value)}>
                  {c.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className={field} disabled={readOnly} value={r[c.key] || ""} onChange={(e) => update(i, c.key, e.target.value)} />
              )}
            </label>
          ))}
          {!readOnly && (
            <button type="button" onClick={() => remove(i)} aria-label="Retirer la ligne"
              className="absolute top-2 right-2 md:top-1 md:right-0 h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-slate-400">Aucune ligne.</p>}
      {!readOnly && (
        <button type="button" className={hseBtnSecondary} onClick={() => onChange([...rows, { ...empty }])}><Plus className={hseIcon} /> {addLabel}</button>
      )}
    </div>
  );
}
