import { FormSelect } from "@/components/ui/form-select";
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, User, Calendar, Pencil, FileText, Upload, Paperclip, Download, Loader2, Building2, Maximize, Lightbulb } from "lucide-react";
import LotissementFormDialog from "@/components/board/lotissements/LotissementFormDialog";
import { createBoardPageUrl } from "@/lib/boardPageUrl";
import {
  LOTISSEMENT_PHASES,
  LOTISSEMENT_TOTAL,
  getPhaseElements,
  computeProgress,
  computePhaseProgress,
  formatDateFR,
  isLate,
  displayStatut,
  statutBadgeClass,
  statusColor,
} from "@/lib/lotissementPhases";
import { toast } from "sonner";

const DISPONIBILITES = ["Manquante", "Disponible", "Non applicable"];

const dispoStyle = (d) => {
  switch (d) {
    case "Disponible":
      return "bg-emerald-100 text-emerald-700";
    case "Non applicable":
      return "bg-slate-200 text-slate-600";
    default:
      return "bg-red-100 text-red-700";
  }
};

export default function LotissementDetail() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [activePhase, setActivePhase] = useState(0);
  const [showEdit, setShowEdit] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: lotissement, isLoading } = useQuery({
    queryKey: ["lotissement", id],
    queryFn: () => base44.entities.Lotissement.get(id),
    enabled: !!id,
  });

  const { data: suivi = [] } = useQuery({
    queryKey: ["lotissement-suivi", id],
    queryFn: () => base44.entities.LotissementSuivi.filter({ lotissement_id: id }),
    enabled: !!id,
  });

  const isAdmin = user?.role === "admin" || user?.fonction === "admin";

  const suiviByElement = useMemo(() => {
    const map = {};
    (suivi || []).forEach((s) => { map[s.element_id] = s; });
    return map;
  }, [suivi]);

  const progress = useMemo(() => computeProgress(suiviByElement), [suiviByElement]);

  const phaseProgress = useMemo(() => {
    return LOTISSEMENT_PHASES.map((_, idx) => computePhaseProgress(idx, suiviByElement));
  }, [suiviByElement]);

  const activeElements = getPhaseElements(activePhase);

  const handleDispoChange = async (element, value) => {
    const existing = suiviByElement[element.id];
    setSavingId(element.id);
    try {
      if (existing) {
        await base44.entities.LotissementSuivi.update(existing.id, {
          disponibilite: value,
          updated_by: user?.email || "",
        });
      } else {
        await base44.entities.LotissementSuivi.create({
          lotissement_id: id,
          element_id: element.id,
          disponibilite: value,
          document: "",
          observations: "",
          updated_by: user?.email || "",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["lotissement-suivi", id] });
      queryClient.invalidateQueries({ queryKey: ["lotissement-suivi-all"] });
    } catch (err) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSavingId(null);
    }
  };

  const handleFieldChange = async (element, field, value) => {
    const existing = suiviByElement[element.id];
    if (!existing) return;
    setSavingId(element.id);
    try {
      await base44.entities.LotissementSuivi.update(existing.id, {
        [field]: value,
        updated_by: user?.email || "",
      });
      queryClient.invalidateQueries({ queryKey: ["lotissement-suivi", id] });
      queryClient.invalidateQueries({ queryKey: ["lotissement-suivi-all"] });
    } catch (err) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSavingId(null);
    }
  };

  const handleUpload = async (element, file) => {
    if (!file) return;
    const existing = suiviByElement[element.id];
    setUploadingId(element.id);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      if (existing) {
        await base44.entities.LotissementSuivi.update(existing.id, {
          attachment_url: file_uri,
          attachment_name: file.name,
          updated_by: user?.email || "",
        });
      } else {
        await base44.entities.LotissementSuivi.create({
          lotissement_id: id,
          element_id: element.id,
          disponibilite: "Disponible",
          document: "",
          attachment_url: file_uri,
          attachment_name: file.name,
          observations: "",
          updated_by: user?.email || "",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["lotissement-suivi", id] });
      queryClient.invalidateQueries({ queryKey: ["lotissement-suivi-all"] });
      toast.success("Pièce jointe ajoutée");
    } catch (err) {
      toast.error("Erreur lors du téléversement");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDownload = async (element) => {
    const rec = suiviByElement[element.id];
    if (!rec?.attachment_url) return;
    // Safari bloque un onglet ouvert après un appel réseau : on l'ouvre d'abord, sur le clic.
    const onglet = window.open("", "_blank");
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: rec.attachment_url });
      if (onglet) onglet.location.href = signed_url;
      else window.location.href = signed_url;
    } catch (err) {
      onglet?.close();
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleRemoveAttachment = async (element) => {
    const existing = suiviByElement[element.id];
    if (!existing) return;
    setSavingId(element.id);
    try {
      await base44.entities.LotissementSuivi.update(existing.id, {
        attachment_url: "",
        attachment_name: "",
        updated_by: user?.email || "",
      });
      queryClient.invalidateQueries({ queryKey: ["lotissement-suivi", id] });
      queryClient.invalidateQueries({ queryKey: ["lotissement-suivi-all"] });
      toast.success("Pièce jointe retirée");
    } catch (err) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading || !lotissement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  const lot = { ...lotissement, isLate: isLate(lotissement) };
  const color = statusColor(lot);

  const infoItems = [
    { icon: Building2, label: "Bureau", value: lot.bureau || "—" },
    { icon: MapPin, label: "Localité", value: lot.localite || "—" },
    { icon: Maximize, label: "Superficie", value: lot.superficie_text || (lot.superficie_ha ? lot.superficie_ha + " ha" : "—") },
    { icon: Calendar, label: "Année", value: lot.annee ? String(lot.annee) : "—" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Retour + actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <button
            onClick={() => navigate(createBoardPageUrl("LotissementsList"))}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux projets
          </button>
          {(isAdmin || (!!user && lotissement?.created_by_id === user.id)) && (
            <Button variant="outline" onClick={() => setShowEdit(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Éditer
            </Button>
          )}
        </div>

        {/* Carte d'identité */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="h-1.5" style={{ background: color }} />
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{lot.nom}</h1>
              <Badge variant="outline" className={statutBadgeClass(lot)}>{displayStatut(lot)}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              {infoItems.map((it) => (
                <div key={it.label} className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                    <it.icon className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">{it.label}</div>
                    <div className="text-sm font-semibold text-slate-800">{it.value}</div>
                  </div>
                </div>
              ))}
            </div>
            {lot.avancement && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold mb-1">Avancement</div>
                <p className="text-sm text-blue-900 whitespace-pre-line">{lot.avancement}</p>
              </div>
            )}
            {lot.solutions && (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mb-1 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> Solutions / actions
                </div>
                <p className="text-sm text-emerald-900 whitespace-pre-line">{lot.solutions}</p>
              </div>
            )}
            {lot.notes && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                {lot.notes}
              </div>
            )}
          </div>
        </div>

        {/* Progression globale */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">Avancement global</span>
            <span className="font-semibold text-slate-800">{progress.done} / {LOTISSEMENT_TOTAL} pièces — {progress.pct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: progress.pct + "%", background: color }} />
          </div>
        </div>

        {/* Onglets des phases */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-4 w-1 rounded-full" style={{ background: color }} />
            <span className="text-xs uppercase tracking-[0.15em] text-slate-500 font-bold">Phasage du dossier</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {LOTISSEMENT_PHASES.map((nom, idx) => {
              const pp = phaseProgress[idx];
              const isActive = idx === activePhase;
              const isComplete = pp.pct >= 100;
              return (
                <button
                  key={idx}
                  onClick={() => setActivePhase(idx)}
                  className={`group relative flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200 ${
                    isActive
                      ? "border-slate-800 bg-slate-800 text-white shadow-md"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:shadow-sm"
                  }`}
                >
                  <span className={`flex items-center justify-center w-9 h-9 rounded-md text-sm font-bold flex-shrink-0 ${
                    isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${isActive ? "text-white/60" : "text-slate-400"}`}>
                      Phase {idx + 1}
                    </div>
                    <div className={`text-xs font-semibold leading-tight ${isActive ? "text-white" : "text-slate-700"}`}>
                      {nom}
                    </div>
                  </div>
                  <span className={`inline-flex items-center text-[11px] font-bold px-2 py-1 rounded-md flex-shrink-0 ${
                    isActive
                      ? "bg-white/20 text-white"
                      : isComplete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {pp.done}/{pp.total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Phase active : barre + éléments */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-amber-600 font-semibold">Phase {activePhase + 1}</div>
              <h2 className="text-lg font-bold text-slate-900">{LOTISSEMENT_PHASES[activePhase]}</h2>
            </div>
            <div className="text-sm text-slate-500">
              {phaseProgress[activePhase].done} / {phaseProgress[activePhase].total} pièces — {phaseProgress[activePhase].pct}%
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
            <div className="h-full rounded-full transition-all" style={{ width: phaseProgress[activePhase].pct + "%", background: color }} />
          </div>

          <div className="space-y-3">
            {activeElements.map((el) => {
              const rec = suiviByElement[el.id] || { disponibilite: "Manquante", document: "", observations: "" };
              return (
                <div key={el.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-900">{el.intitule}</div>
                      {el.conditionnel && (
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Conditionnel</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {savingId === el.id && (
                        <span className="text-xs text-slate-400">…</span>
                      )}
                      <FormSelect
                        value={rec.disponibilite}
                        onChange={(e) => handleDispoChange(el, e.target.value)}
                        className={`rounded-lg border-0 px-3 py-1.5 text-sm font-medium cursor-pointer ${dispoStyle(rec.disponibilite)}`}
                      >
                        {DISPONIBILITES.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </FormSelect>
                    </div>
                  </div>
                  {(rec.disponibilite === "Disponible" || rec.disponibilite === "Non applicable") && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                            <FileText className="w-3 h-3" /> Document
                          </label>
                          <Input
                            value={rec.document || ""}
                            onChange={(e) => handleFieldChange(el, "document", e.target.value)}
                            placeholder="Référence / nom du document"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 block">Observations</label>
                          <Input
                            value={rec.observations || ""}
                            onChange={(e) => handleFieldChange(el, "observations", e.target.value)}
                            placeholder="Observations"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      {rec.disponibilite === "Disponible" && (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              {rec.attachment_url ? (
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
                                    {rec.attachment_name || "Pièce jointe"}
                                  </div>
                                  <div className="text-[10px] text-emerald-600 font-medium">Fichier téléversé</div>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-500">Aucune pièce jointe</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {uploadingId === el.id ? (
                                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Téléversement…
                                </span>
                              ) : rec.attachment_url ? (
                                <>
                                  <button
                                    onClick={() => handleDownload(el)}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 hover:bg-slate-100 transition"
                                  >
                                    <Download className="w-3.5 h-3.5" /> Télécharger
                                  </button>
                                  <button
                                    onClick={() => handleRemoveAttachment(el)}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition"
                                  >
                                    Retirer
                                  </button>
                                </>
                              ) : (
                                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-800 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-700 transition">
                                  <Upload className="w-3.5 h-3.5" /> Téléverser
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) handleUpload(el, f);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <LotissementFormDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        lotissement={lotissement}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["lotissement", id] })}
      />
    </div>
  );
}