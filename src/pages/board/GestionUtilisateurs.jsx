import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Shield, Plus, User as UserIcon, Pencil, KeyRound, Trash2, Clock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import BureauCapsule from '@/components/board/admin/BureauCapsule';
import UserFormDialog from '@/components/board/admin/UserFormDialog';
import { fonctionLabel, fonctionBadge, userDisplayName } from '@/lib/userFonctions';
import { toast } from 'sonner';

export default function GestionUtilisateurs() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me().catch(() => null) });
  const { data: users, refetch: refetchUsers } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });
  const { data: bureaux, refetch: refetchBureaux } = useQuery({ queryKey: ['bureaux'], queryFn: () => base44.entities.Bureau.list() });
  const { data: annuaire, refetch: refetchAnnuaire } = useQuery({ queryKey: ['annuaire-attente'], queryFn: () => base44.entities.AnnuaireAttente.list() });

  const refresh = () => { refetchUsers(); refetchBureaux(); refetchAnnuaire(); };

  const [userDialog, setUserDialog] = useState({ open: false, editing: null, presetBureau: null });
  const [bureauDialog, setBureauDialog] = useState({ open: false, editing: null });
  const [bureauForm, setBureauForm] = useState({ nom: '', code: '', actif: true });
  const [bureauLoading, setBureauLoading] = useState(false);
  const [search, setSearch] = useState('');

  const openCreateUser = (bureau = null) => setUserDialog({ open: true, editing: null, presetBureau: bureau?.id || null });
  const openEditUser = (u) => setUserDialog({ open: true, editing: u, presetBureau: null });
  const openCreateBureau = () => { setBureauForm({ nom: '', code: '', actif: true }); setBureauDialog({ open: true, editing: null }); };
  const openEditBureau = (b) => { setBureauForm({ nom: b.nom || '', code: b.code || '', actif: b.actif !== false }); setBureauDialog({ open: true, editing: b }); };

  const submitBureau = async (e) => {
    e.preventDefault();
    if (!bureauForm.nom || !bureauForm.code) { toast.error("Nom et code obligatoires"); return; }
    if (bureauForm.code.length < 2 || bureauForm.code.length > 6) { toast.error("Code : 2 à 6 caractères"); return; }
    setBureauLoading(true);
    try {
      const payload = { nom: bureauForm.nom, code: bureauForm.code.toUpperCase(), actif: bureauForm.actif };
      if (bureauDialog.editing) {
        await base44.entities.Bureau.update(bureauDialog.editing.id, payload);
        toast.success("Bureau modifié");
      } else {
        await base44.entities.Bureau.create(payload);
        toast.success("Bureau créé");
      }
      setBureauDialog({ open: false, editing: null });
      refresh();
    } catch (err) {
      toast.error("Erreur : " + (err.message || "échec"));
    } finally {
      setBureauLoading(false);
    }
  };

  const deleteUser = async (u) => {
    if (u.id === user?.id) { toast.error("Vous ne pouvez pas supprimer votre propre compte"); return; }
    if (!confirm(`Supprimer définitivement ${u.full_name || u.email} ?`)) return;
    try {
      await base44.entities.User.delete(u.id);
      toast.success("Utilisateur supprimé");
      refresh();
    } catch (e) {
      toast.error("Erreur : " + e.message);
    }
  };

  const resetPassword = async (u) => {
    if (!confirm(`Réinitialiser le mot de passe de ${u.full_name || u.email} ?`)) return;
    try {
      await base44.entities.User.update(u.id, { must_change_password: true });
      toast.success("Mot de passe à changer à la prochaine connexion");
      refresh();
    } catch (e) {
      toast.error("Erreur : " + e.message);
    }
  };

  const inviteFromAnnuaire = async (a) => {
    if (!confirm(`Inviter ${a.prenom || ''} ${a.nom || ''} (${a.email}) ? Un email lui sera envoyé.`)) return;
    try {
      const platformRole = a.fonction === 'admin' ? 'admin' : 'user';
      await base44.users.inviteUser(a.email, platformRole);
      const refreshed = await base44.entities.User.list();
      const created = refreshed.find((u) => u.email === a.email);
      if (created) {
        const allIds = (bureaux || []).filter((b) => b.actif !== false).map((b) => b.id);
        const bp = a.fonction === 'admin'
          ? { bureau_id: allIds[0] || '', bureau_code: bureaux?.find((b) => b.id === allIds[0])?.code || '', bureau_ids: allIds }
          : { bureau_id: (a.bureau_ids || [])[0] || '', bureau_code: (a.bureau_codes || [])[0] || '', bureau_ids: a.bureau_ids || [] };
        await base44.entities.User.update(created.id, {
          nom: a.nom, prenom: a.prenom, telephone: a.telephone, fonction: a.fonction, statut: 'actif', ...bp,
        });
      }
      await base44.entities.AnnuaireAttente.delete(a.id);
      toast.success("Utilisateur invité");
      refresh();
    } catch (e) {
      toast.error("Erreur : " + e.message);
    }
  };

  const deleteAnnuaire = async (a) => {
    if (!confirm(`Supprimer la fiche de ${a.prenom || ''} ${a.nom || ''} ?`)) return;
    try {
      await base44.entities.AnnuaireAttente.delete(a.id);
      toast.success("Fiche supprimée");
      refetchAnnuaire();
    } catch (e) {
      toast.error("Erreur : " + e.message);
    }
  };

  const directionUsers = useMemo(() => {
    return (users || []).filter((u) => u.id !== user?.id && (u.fonction === 'admin' || (!u.bureau_id && !(u.bureau_ids || []).length)));
  }, [users, user]);

  const filteredBureaux = useMemo(() => {
    const q = search.toLowerCase();
    return [...(bureaux || [])]
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }))
      .filter((b) => !q || b.nom.toLowerCase().includes(q) || b.code.toLowerCase().includes(q));
  }, [bureaux, search]);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm max-w-md">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Accès réservé</h2>
          <p className="text-slate-500">Cette page est réservée à l'administrateur.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Gestion des utilisateurs</h1>
            <p className="text-sm sm:text-base text-slate-500">Utilisateurs regroupés par bureau — rôles et affectations modifiables à tout moment.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openCreateBureau} className="gap-2 flex-1 sm:flex-initial">
              <Plus className="w-4 h-4" /> <span className="whitespace-nowrap">Nouveau bureau</span>
            </Button>
            <Button onClick={() => openCreateUser()} className="gap-2 flex-1 sm:flex-initial">
              <Plus className="w-4 h-4" /> <span className="whitespace-nowrap">Nouvel utilisateur</span>
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un bureau par nom ou code"
            className="w-full sm:max-w-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBureaux.map((b) => (
            <BureauCapsule
              key={b.id}
              bureau={b}
              users={users || []}
              onEditBureau={openEditBureau}
              onEditUser={openEditUser}
              onAddUser={openCreateUser}
              onResetPassword={resetPassword}
              onDeleteUser={deleteUser}
            />
          ))}

          {/* Capsule Direction & non rattachés */}
          <div className="rounded-2xl border border-purple-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between bg-purple-600 px-3 sm:px-4 py-2.5 sm:py-3">
              <div className="flex items-center gap-1.5 sm:gap-2 text-white min-w-0">
                <Shield className="w-4 h-4 shrink-0" />
                <span className="text-sm sm:text-base font-semibold truncate">Direction & non rattachés</span>
              </div>
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8 shrink-0" onClick={() => openCreateUser()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-3 space-y-2 flex-1">
              {directionUsers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Aucun utilisateur</p>
              ) : (
                directionUsers.map((u) => (
                  <div key={u.id} className={`flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2.5 sm:px-3 py-2 ${u.statut === 'inactif' ? 'opacity-50' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">{userDisplayName(u)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                        <Badge className={fonctionBadge(u.fonction) + ' text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 sm:py-0.5'}>{fonctionLabel(u.fonction)}</Badge>
                        {u.statut === 'inactif' && <Badge variant="outline" className="text-slate-500 text-[10px] px-1.5 py-0">Inactif</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => openEditUser(u)} title="Modifier">
                        <Pencil className="w-3 sm:w-3.5 sm:h-3.5 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-amber-600 hover:bg-amber-50" onClick={() => resetPassword(u)} title="Réinitialiser le mot de passe">
                        <KeyRound className="w-3 sm:w-3.5 sm:h-3.5 h-3" />
                      </Button>
                      {u.id !== user?.id && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 hover:bg-red-50" onClick={() => deleteUser(u)} title="Supprimer">
                          <Trash2 className="w-3 sm:w-3.5 sm:h-3.5 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Capsule Annuaire en attente */}
          <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between bg-amber-600 px-3 sm:px-4 py-2.5 sm:py-3">
              <div className="flex items-center gap-1.5 sm:gap-2 text-white min-w-0">
                <Clock className="w-4 h-4 shrink-0" />
                <span className="text-sm sm:text-base font-semibold truncate">Annuaire en attente</span>
              </div>
              <span className="text-xs text-amber-100">{(annuaire || []).length}</span>
            </div>
            <div className="p-3 space-y-2 flex-1">
              {(!annuaire || annuaire.length === 0) ? (
                <p className="text-sm text-slate-400 text-center py-6">Aucun utilisateur en attente</p>
              ) : (
                annuaire.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-800 truncate">{userDisplayName(a)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge className={fonctionBadge(a.fonction) + ' text-[10px] px-1.5 py-0'}>{fonctionLabel(a.fonction)}</Badge>
                        <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px] px-1.5 py-0">En attente</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" className="h-7 px-2.5 text-xs" onClick={() => inviteFromAnnuaire(a)} title="Inviter">
                        Inviter
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50" onClick={() => deleteAnnuaire(a)} title="Supprimer">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <UserFormDialog
        open={userDialog.open}
        onOpenChange={(o) => setUserDialog((s) => ({ ...s, open: o }))}
        bureaux={bureaux}
        editingUser={userDialog.editing}
        presetBureauId={userDialog.presetBureau}
        onRefresh={refresh}
      />

      <Dialog open={bureauDialog.open} onOpenChange={(o) => setBureauDialog((s) => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bureauDialog.editing ? 'Modifier le bureau' : 'Nouveau bureau'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitBureau} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nom du bureau *</Label>
              <Input value={bureauForm.nom} onChange={(e) => setBureauForm({ ...bureauForm, nom: e.target.value })} placeholder="Ex: Abidjan" />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input value={bureauForm.code} onChange={(e) => setBureauForm({ ...bureauForm, code: e.target.value.toUpperCase() })} placeholder="Ex: ABJ" maxLength={6} />
              <p className="text-xs text-slate-500">2 à 6 caractères</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={bureauForm.actif} onCheckedChange={(v) => setBureauForm({ ...bureauForm, actif: v })} />
              <Label>Bureau actif</Label>
            </div>
            <DialogFooter className="gap-2 sm:justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setBureauDialog({ open: false, editing: null })}>Annuler</Button>
              <Button type="submit" disabled={bureauLoading}>{bureauLoading ? 'Enregistrement...' : 'Enregistrer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}