import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Tablet, Mail, MapPin, Activity } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Tablettes de pointage installées dans les bureaux (entité OfficeTerminal).
// Affichées dans Rapports de pointage ; création, modification et suppression réservées aux administrateurs.
const EMPTY = { office_name: "", email: "", location: "", is_active: true };

export default function OfficeTerminalsManager({ currentUser, onCount }) {
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = currentUser?.role === "admin";

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.OfficeTerminal.list("office_name", 200);
      setTerminals(list || []);
      onCount && onCount((list || []).length);
    } catch {
      setTerminals([]);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openForm = (t = null) => {
    setError("");
    setEditing(t);
    setForm(t ? { office_name: t.office_name || "", email: t.email || "", location: t.location || "", is_active: t.is_active ?? true } : EMPTY);
    setOpen(true);
  };

  const save = async () => {
    if (!isAdmin) return setError("La gestion des tablettes est réservée aux administrateurs.");
    if (!form.office_name.trim() || !form.email.trim()) return setError("Le nom du bureau et l'e-mail de connexion sont obligatoires.");
    setBusy(true);
    try {
      const data = { ...form, office_name: form.office_name.trim(), email: form.email.trim().toLowerCase() };
      if (editing) await base44.entities.OfficeTerminal.update(editing.id, data);
      else await base44.entities.OfficeTerminal.create({ ...data, last_activity: new Date().toISOString() });
      setOpen(false);
      await load();
    } catch (e) {
      setError(e?.message || "Enregistrement impossible.");
    }
    setBusy(false);
  };

  const remove = async () => {
    if (!isAdmin || !editing) return;
    if (!window.confirm(`Supprimer la tablette « ${editing.office_name} » ?`)) return;
    setBusy(true);
    try {
      await base44.entities.OfficeTerminal.delete(editing.id);
      setOpen(false);
      await load();
    } catch (e) {
      setError(e?.message || "Suppression impossible.");
    }
    setBusy(false);
  };

  const active = terminals.filter((t) => t.is_active !== false).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#0C3D85]">Tablettes de pointage des bureaux</p>
          <p className="text-xs text-slate-500 mt-1">
            Chaque bureau dispose d'une tablette connectée avec un compte dédié, sur laquelle les agents pointent. {active}/{terminals.length} active{active > 1 ? "s" : ""}.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => openForm()} className="w-full sm:w-auto bg-[#0C3D85] hover:bg-[#0c4c44] text-white rounded-xl h-11 px-5 shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle tablette
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
      ) : terminals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
          <Tablet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          Aucune tablette configurée.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {terminals.map((t) => {
            const on = t.is_active !== false;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => isAdmin && openForm(t)}
                className={`group text-left rounded-2xl bg-white border overflow-hidden shadow-sm transition ${isAdmin ? "hover:-translate-y-0.5 hover:shadow-lg cursor-pointer" : "cursor-default"} ${on ? "border-[#0C3D85]/15" : "border-slate-200 opacity-70"}`}
                title={isAdmin ? "Modifier la tablette" : t.office_name}
              >
                <div className={`h-1 ${on ? "bg-gradient-to-r from-[#0C3D85] to-[#14806f]" : "bg-slate-300"}`} />
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-none ${on ? "bg-[#0C3D85]/10 text-[#0C3D85]" : "bg-slate-100 text-slate-400"}`}>
                      <Tablet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 uppercase tracking-wide text-sm leading-snug break-words">{t.office_name}</p>
                      <p className="text-xs text-slate-500">{t.location || "Localisation non définie"}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-none ${on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{on ? "Active" : "Inactive"}</span>
                  </div>
                  {t.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-none" />
                      <span className="break-all font-mono">{t.email}</span>
                    </div>
                  )}
                  {t.location && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-none" />
                      <span>{t.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs pt-2 border-t border-slate-100 text-slate-500">
                    <Activity className={`w-3.5 h-3.5 flex-none ${on ? "text-emerald-600" : "text-slate-400"}`} />
                    {t.last_activity ? `Dernière activité : ${format(new Date(t.last_activity), "d MMM yyyy à HH:mm", { locale: fr })}` : "Aucune activité enregistrée"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{editing ? "Modifier la tablette" : "Nouvelle tablette de pointage"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="t_office">Bureau *</Label>
              <Input id="t_office" value={form.office_name} onChange={(e) => setForm({ ...form, office_name: e.target.value })} placeholder="Ex. Abidjan, CAG, Yamoussoukro" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t_email">E-mail de connexion de la tablette *</Label>
              <Input id="t_email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Ex. abidjan.cgesn@gmail.com" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t_loc">Localisation</Label>
              <Input id="t_loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Adresse ou localisation" className="h-11 rounded-xl" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <Label htmlFor="t_active">Tablette active</Label>
              <Switch id="t_active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
            {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}
          </div>
          <DialogFooter className="gap-2">
            {editing && <Button variant="destructive" onClick={remove} disabled={busy} className="sm:mr-auto rounded-xl">Supprimer</Button>}
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy} className="rounded-xl">Annuler</Button>
            <Button onClick={save} disabled={busy} className="bg-[#0C3D85] hover:bg-[#0c4c44] text-white rounded-xl">{busy ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
