import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/ui/form-select";
import { DEPARTURE_REASONS, contractLabel, endDateOf, isIntern, reasonLabel, recordDeparture, reinstate, renewContract } from "@/lib/departures";

const KINDS = [
  { value: "CDD", label: "CDD" },
  { value: "CDDTI", label: "CDDTI" },
  { value: "CDI", label: "CDI" },
  { value: "Prestation", label: "Prestation" },
  { value: "Stage", label: "Stage" }
];
const INTERNSHIPS = ["PERFECTIONNEMENT", "PRESFOR", "STAGE ECOLE"];

const addMonths = (iso, n) => {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};
const dayAfter = (iso) => {
  if (!iso) return new Date().toISOString().slice(0, 10);
  const d = new Date(iso);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};
const fullName = (e) => [e?.first_name, e?.last_name].filter(Boolean).join(" ") || e?.employee_code || "";

/**
 * Décision de fin de contrat.
 * mode : "renew" (renouveler / changer de contrat) | "leave" (enregistrer le départ) | "reinstate" (réintégrer)
 */
export default function DepartureDialog({ open, mode, employee, currentUser, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [f, setF] = useState({});

  useEffect(() => {
    if (!open || !employee) return;
    const end = endDateOf(employee);
    const intern = isIntern(employee);
    // Départ : motif proposé selon le contrat ; renouvellement : même contrat, 6 mois après l'échéance
    setF({
      date: end && new Date(end) < new Date() ? end : new Date().toISOString().slice(0, 10),
      reason: intern ? "fin_stage" : ["CDD", "CDDTI", "Prestation"].includes(employee.contract_type) ? "fin_contrat" : "",
      notes: "",
      kind: intern ? "Stage" : employee.contract_type || "CDD",
      internshipType: employee.internship_type || "PERFECTIONNEMENT",
      startDate: dayAfter(end),
      endDate: addMonths(dayAfter(end), 6)
    });
    setError("");
  }, [open, employee, mode]);

  if (!employee) return null;
  const by = currentUser?.email || "";
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setError("");
    if (mode === "leave" && (!f.date || !f.reason)) return setError("La date et le motif du départ sont obligatoires.");
    if (mode === "renew" && f.kind !== "CDI" && !f.endDate) return setError("Indiquez la nouvelle date de fin.");
    if (mode === "renew" && f.kind !== "CDI" && f.startDate && f.endDate < f.startDate) return setError("La date de fin doit suivre la date de début.");
    setBusy(true);
    try {
      let res;
      if (mode === "leave") res = await recordDeparture(employee, { date: f.date, reason: f.reason, notes: f.notes }, by);
      else if (mode === "renew") res = await renewContract(employee, { kind: f.kind, internshipType: f.internshipType, startDate: f.startDate, endDate: f.endDate, notes: f.notes }, by);
      else res = await reinstate(employee, f.notes, by);
      onDone && onDone({ ...employee, ...res.patch }, res.accounts);
    } catch (e) {
      setError(e?.message || "Enregistrement impossible.");
    }
    setBusy(false);
  };

  const title = mode === "leave" ? "Enregistrer le départ" : mode === "renew" ? "Renouveler ou faire évoluer le contrat" : "Réintégrer la personne";
  const accent = mode === "leave" ? "bg-rose-600 hover:bg-rose-700" : "bg-[#0f5c52] hover:bg-[#0c4c44]";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">{title}</DialogTitle>
          <p className="text-sm text-slate-500">
            {fullName(employee)} · {employee.employee_code} · {contractLabel(employee)}
            {endDateOf(employee) && <> · fin le {new Date(endDateOf(employee)).toLocaleDateString("fr-FR")}</>}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {mode === "leave" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Date de départ</Label>
                  <Input type="date" value={f.date || ""} onChange={(e) => set("date", e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Motif</Label>
                  <FormSelect className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" value={f.reason || ""} onChange={(e) => set("reason", e.target.value)}>
                    <option value="">Choisir un motif…</option>
                    {DEPARTURE_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </FormSelect>
                </div>
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-800 leading-relaxed">
                La fiche passe dans « Partis » et le compte portail de la personne est suspendu (sauf administrateur). Rien n'est supprimé : vous pourrez la réintégrer.
              </div>
            </>
          )}

          {mode === "renew" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Nouveau contrat</Label>
                  <FormSelect className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" value={f.kind || ""} onChange={(e) => set("kind", e.target.value)}>
                    {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </FormSelect>
                </div>
                {f.kind === "Stage" ? (
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Type de stage</Label>
                    <FormSelect className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" value={f.internshipType || ""} onChange={(e) => set("internshipType", e.target.value)}>
                      {INTERNSHIPS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </FormSelect>
                  </div>
                ) : <div className="hidden sm:block" />}
                <div className="space-y-1.5">
                  <Label className="font-semibold">Date de début</Label>
                  <Input type="date" value={f.startDate || ""} onChange={(e) => set("startDate", e.target.value)} className="h-11 rounded-xl" />
                </div>
                {f.kind !== "CDI" && (
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Nouvelle date de fin</Label>
                    <Input type="date" value={f.endDate || ""} onChange={(e) => set("endDate", e.target.value)} className="h-11 rounded-xl" />
                  </div>
                )}
              </div>
              {f.kind !== "CDI" && (
                <div className="flex flex-wrap gap-2">
                  {[3, 6, 12].map((n) => (
                    <button key={n} type="button" onClick={() => set("endDate", addMonths(f.startDate, n))} className="h-8 px-3 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:border-[#0f5c52] hover:text-[#0f5c52]">
                      + {n} mois
                    </button>
                  ))}
                </div>
              )}
              {isIntern(employee) && f.kind !== "Stage" && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-800 leading-relaxed">
                  Passage de stagiaire à salarié : la date de début devient la date d'embauche. Pensez à préciser la catégorie et le poste sur la fiche.
                </div>
              )}
            </>
          )}

          {mode === "reinstate" && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700 leading-relaxed">
              Départ enregistré : <b>{reasonLabel(employee.departure_reason)}</b>
              {employee.departure_date && <> le {new Date(employee.departure_date).toLocaleDateString("fr-FR")}</>}. La fiche redevient active et le compte portail est réactivé.
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="font-semibold">Commentaire <span className="font-normal text-slate-400">(facultatif)</span></Label>
            <Textarea rows={3} value={f.notes || ""} onChange={(e) => set("notes", e.target.value)} className="rounded-xl" placeholder={mode === "leave" ? "Ex. préavis effectué, solde de tout compte, matériel restitué…" : "Ex. avenant signé le…"} />
          </div>

          {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy} className="rounded-xl">Annuler</Button>
          <Button onClick={submit} disabled={busy} className={`rounded-xl text-white ${accent}`}>
            {busy ? "Enregistrement…" : mode === "leave" ? "Confirmer le départ" : mode === "renew" ? "Renouveler" : "Réintégrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
