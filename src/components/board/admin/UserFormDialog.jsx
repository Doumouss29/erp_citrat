import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { FONCTIONS } from '@/lib/userFonctions';

const empty = { nom: '', prenom: '', email: '', telephone: '', fonction: 'secretaire', bureau_ids: [], statut: 'actif' };

export default function UserFormDialog({ open, onOpenChange, bureaux, editingUser, presetBureauId, onRefresh }) {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingUser) {
      setForm({
        nom: editingUser.nom || '',
        prenom: editingUser.prenom || '',
        email: editingUser.email || '',
        telephone: editingUser.telephone || '',
        fonction: editingUser.fonction || (editingUser.role === 'admin' ? 'admin' : 'secretaire'),
        bureau_ids: editingUser.bureau_ids || (editingUser.bureau_id ? [editingUser.bureau_id] : []),
        statut: editingUser.statut || 'actif',
      });
    } else {
      setForm({ ...empty, bureau_ids: presetBureauId ? [presetBureauId] : [] });
    }
  }, [open, editingUser, presetBureauId]);

  const toggleBureau = (id) => setForm((f) => ({
    ...f,
    bureau_ids: f.bureau_ids.includes(id) ? f.bureau_ids.filter((b) => b !== id) : [...f.bureau_ids, id],
  }));

  useEffect(() => {
    if (form.fonction === 'admin') {
      const allIds = (bureaux || []).filter((b) => b.actif !== false).map((b) => b.id);
      setForm((f) => ({ ...f, bureau_ids: allIds }));
    }
  }, [form.fonction, bureaux]);

  const buildBureauPayload = (fonction, bureauIds) => {
    if (fonction === 'admin') {
      const allIds = (bureaux || []).filter((b) => b.actif !== false).map((b) => b.id);
      const primary = allIds[0] || '';
      const code = bureaux?.find((b) => b.id === primary)?.code || '';
      return { bureau_id: primary, bureau_code: code, bureau_ids: allIds };
    }
    const ids = bureauIds || [];
    const primary = ids[0] || '';
    const code = bureaux?.find((b) => b.id === primary)?.code || '';
    return { bureau_id: primary, bureau_code: code, bureau_ids: ids };
  };

  const submit = async (e, invite = true) => {
    e.preventDefault();
    if (!editingUser && !form.email) { toast.error("Email obligatoire"); return; }
    if (form.fonction !== 'admin' && form.bureau_ids.length === 0) {
      toast.error("Sélectionnez au moins un bureau");
      return;
    }
    setLoading(true);
    try {
      const bp = buildBureauPayload(form.fonction, form.bureau_ids);
      const namePatch = { nom: form.nom, prenom: form.prenom };
      if (editingUser) {
        const platformRole = form.fonction === 'admin' ? 'admin' : 'user';
        await base44.entities.User.update(editingUser.id, {
          ...namePatch,
          telephone: form.telephone,
          fonction: form.fonction,
          role: platformRole,
          statut: form.statut,
          ...bp,
        });
        toast.success("Utilisateur modifié");
      } else if (invite) {
        const platformRole = form.fonction === 'admin' ? 'admin' : 'user';
        await base44.users.inviteUser(form.email, platformRole);
        const refreshed = await base44.entities.User.list();
        const created = refreshed.find((u) => u.email === form.email);
        if (created) {
          await base44.entities.User.update(created.id, {
            ...namePatch,
            telephone: form.telephone,
            fonction: form.fonction,
            statut: 'actif',
            ...bp,
          });
        }
        toast.success("Utilisateur invité");
      } else {
        await base44.entities.AnnuaireAttente.create({
          ...namePatch,
          email: form.email,
          telephone: form.telephone,
          fonction: form.fonction,
          bureau_ids: bp.bureau_ids,
          bureau_codes: bp.bureau_ids.map((id) => bureaux?.find((b) => b.id === id)?.code).filter(Boolean),
          statut: 'actif',
          invite: false,
        });
        toast.success("Utilisateur enregistré dans l'annuaire (en attente d'invitation)");
      }
      onOpenChange(false);
      onRefresh();
    } catch (err) {
      toast.error("Erreur : " + (err.message || "échec"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingUser ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                placeholder="Prénom"
              />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Nom"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email {editingUser ? '' : '*'}</Label>
              <Input
                type="email"
                required={!editingUser}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!editingUser}
                placeholder="prenom.nom@cgesn.com"
              />
              {editingUser && <p className="text-xs text-slate-400">L'email ne peut pas être modifié</p>}
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                placeholder="+225 07 XX XX XX XX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fonction *</Label>
            <Select value={form.fonction} onValueChange={(v) => setForm({ ...form, fonction: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONCTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bureau(x) rattaché(s) {form.fonction !== 'admin' ? '*' : ''}</Label>
            <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 max-h-56 overflow-y-auto">
              {(bureaux || []).filter((b) => b.actif !== false).map((b) => (
                <label key={b.id} className={`flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ${form.fonction === 'admin' ? 'opacity-70' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.bureau_ids.includes(b.id)}
                    onChange={() => toggleBureau(b.id)}
                    disabled={form.fonction === 'admin'}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">{b.nom}</span>
                    <span className="block text-xs text-slate-500">{b.code}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              {form.fonction === 'admin' ? 'Tous les bureaux sont automatiquement rattachés à la Direction.' : 'Le premier bureau sélectionné devient le bureau principal.'}
            </p>
          </div>

          {editingUser && (
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            {!editingUser && (
              <Button type="button" variant="secondary" disabled={loading} onClick={(e) => submit(e, false)}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : editingUser ? 'Enregistrer' : 'Inviter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}