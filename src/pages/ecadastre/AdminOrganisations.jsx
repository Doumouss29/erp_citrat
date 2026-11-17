import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, UserPlus, UserMinus, MapPin, X, ShieldCheck, Layers, Plus, Settings } from 'lucide-react';
import { CadastreManagerPanel } from '@/components/ecadastre/cadastre/CadastreManagerDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createEcadastrePageUrl } from '@/lib/ecadastrePageUrl';
import { useCabinetOrg } from '@/lib/ecadastreCabinet';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

/**
 * Administration e-Cadastre (application interne au cabinet, sans notion d'organisation) :
 *   - Utilisateurs : équipe, rôles (agent / superviseur) et communes supervisées
 *   - Communes     : communes du projet
 *   - Couches      : sections cadastrales GeoJSON par commune
 * La configuration est enregistrée dans l'unique fiche « Organisation » du cabinet, invisible pour les utilisateurs.
 */
const TABS = [
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'communes', label: 'Communes', icon: MapPin },
  { id: 'couches', label: 'Couches', icon: Layers },
];
const ROLE_LABEL = { admin: 'Administrateur', superviseur: 'Superviseur', user: 'Agent' };

export default function AdminOrganisations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('users');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('user');
  const [newCommune, setNewCommune] = useState('');
  const [editing, setEditing] = useState(null); // utilisateur dont on règle le rôle

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  const isAdmin = user?.role === 'admin';
  const { data: cabinet, isLoading: cabinetLoading } = useCabinetOrg();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => { const r = await base44.entities.User.list(); return Array.isArray(r) ? r : r?.items || []; },
    enabled: isAdmin,
  });
  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => { const r = await base44.entities.Invitation.list(); return Array.isArray(r) ? r : r?.items || []; },
    enabled: isAdmin,
  });

  const refreshCabinet = () => queryClient.invalidateQueries({ queryKey: ['cabinet-org'] });

  const initMutation = useMutation({
    mutationFn: () => base44.entities.Organisation.create({ nom: 'CGESN', description: 'Cabinet de Géomètre Expert Soro Nanga', statut: 'active', communes: [] }),
    onSuccess: () => { refreshCabinet(); toast.success('Projet initialisé'); },
    onError: () => toast.error("Erreur lors de l'initialisation"),
  });
  const updateCabinet = useMutation({
    mutationFn: (data) => base44.entities.Organisation.update(cabinet.id, data),
    onSuccess: () => { refreshCabinet(); queryClient.invalidateQueries({ queryKey: ['organisations'] }); },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });
  const updateUser = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allUsers'] }),
    onError: () => toast.error("Erreur lors de la mise à jour de l'utilisateur"),
  });
  const inviteMutation = useMutation({
    mutationFn: async (email) => {
      await base44.users.inviteUser(email, 'user');
      await base44.entities.Invitation.create({ email, organisation_id: cabinet.id, statut: 'en_attente' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invitations'] }); toast.success('Invitation envoyée'); },
    onError: () => toast.error("Erreur lors de l'invitation"),
  });

  const team = cabinet ? allUsers.filter((u) => u.organisation_id === cabinet.id) : [];
  const pending = cabinet ? invitations.filter((i) => i.organisation_id === cabinet.id && i.statut === 'en_attente') : [];
  const communes = cabinet?.communes || [];

  const handleAddMember = async () => {
    const email = memberEmail.trim().toLowerCase();
    if (!email.includes('@')) { toast.error('Email invalide'); return; }
    const existing = allUsers.find((u) => (u.email || '').toLowerCase() === email);
    if (existing) {
      await updateUser.mutateAsync({ userId: existing.id, data: { organisation_id: cabinet.id, ...(existing.role !== 'admin' ? { role: memberRole } : {}) } });
      toast.success('Utilisateur ajouté à l’équipe');
    } else {
      await inviteMutation.mutateAsync(email);
    }
    setMemberEmail('');
    setMemberRole('user');
  };

  const handleRemoveMember = (m) => {
    if (confirm(`Retirer ${m.full_name || m.email} de l'équipe e-Cadastre ?`)) {
      updateUser.mutate({ userId: m.id, data: { organisation_id: null } }, { onSuccess: () => toast.success('Utilisateur retiré') });
    }
  };

  const handleAddCommune = () => {
    const c = newCommune.trim().toUpperCase();
    if (!c) { toast.error('Veuillez entrer un nom de commune'); return; }
    if (communes.includes(c)) { toast.error('Cette commune existe déjà'); return; }
    updateCabinet.mutate({ communes: [...communes, c] }, { onSuccess: () => toast.success('Commune ajoutée') });
    setNewCommune('');
  };
  const handleRemoveCommune = (c) => {
    if (!confirm(`Retirer la commune ${c} ?`)) return;
    updateCabinet.mutate({ communes: communes.filter((x) => x !== c) }, { onSuccess: () => toast.success('Commune retirée') });
  };

  if (userLoading || cabinetLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-800" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Accès refusé</h2>
        <p className="text-slate-600 mb-4">Seuls les administrateurs peuvent accéder à cette page</p>
        <Button onClick={() => navigate(createEcadastrePageUrl('Accueil'))}>Retour à l'accueil</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-8">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <span className="w-11 h-11 rounded-xl bg-blue-800 text-white flex items-center justify-center flex-none"><Settings className="w-5 h-5" /></span>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">Administration</h1>
            <p className="text-sm text-slate-500">Utilisateurs, communes et couches cadastrales</p>
          </div>
        </div>

        {!cabinet ? (
          <Card className="border border-slate-200 rounded-2xl">
            <CardContent className="py-10 text-center space-y-4">
              <p className="text-slate-600">Le projet e-Cadastre n'est pas encore configuré.</p>
              <Button className="bg-blue-800 hover:bg-blue-900" disabled={initMutation.isPending} onClick={() => initMutation.mutate()}>
                {initMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Initialiser le projet'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Onglets */}
            <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-white border border-slate-200 p-1 mb-4">
              {TABS.map((t) => {
                const n = t.id === 'users' ? team.length : t.id === 'communes' ? communes.length : null;
                const on = tab === t.id;
                return (
                  <button key={t.id} role="tab" aria-selected={on} type="button" onClick={() => setTab(t.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${on ? 'bg-blue-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                    <t.icon className="w-4 h-4" />
                    <span>{t.label}</span>
                    {n !== null && <span className={`hidden sm:inline text-xs rounded-full px-1.5 ${on ? 'bg-white/20' : 'bg-slate-100'}`}>{n}</span>}
                  </button>
                );
              })}
            </div>

            {/* ---------- Utilisateurs ---------- */}
            {tab === 'users' && (
              <Card className="border border-slate-200 rounded-2xl">
                <CardContent className="p-4 sm:p-6 space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Ajouter un utilisateur</label>
                    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_160px_auto] gap-2">
                      <Input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="Email de l'utilisateur" className="col-span-2 sm:col-span-1 h-10" onKeyDown={(e) => e.key === 'Enter' && handleAddMember()} />
                      <Select value={memberRole} onValueChange={setMemberRole}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Agent</SelectItem>
                          <SelectItem value="superviseur">Superviseur</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleAddMember} disabled={updateUser.isPending || inviteMutation.isPending} className="h-10 bg-blue-800 hover:bg-blue-900">
                        {(updateUser.isPending || inviteMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Ajouter</span></>}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">Un compte qui ouvre e-Cadastre rejoint automatiquement l'équipe en tant qu'agent.</p>
                  </div>

                  <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {team.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 p-3">
                        <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold flex-none">
                          {(m.full_name || m.email || '?').charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 text-sm truncate">{m.full_name || m.email}</p>
                          <p className="text-xs text-slate-500 truncate">{m.email}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            <Badge className={m.role === 'admin' ? 'bg-blue-100 text-blue-800' : m.role === 'superviseur' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'}>
                              {ROLE_LABEL[m.role] || 'Agent'}
                            </Badge>
                            {m.role === 'superviseur' && (m.communes_supervisees || []).map((c) => (
                              <Badge key={c} className="bg-slate-50 text-slate-600 border border-slate-200 text-xs">{c}</Badge>
                            ))}
                          </div>
                        </div>
                        {m.role !== 'admin' && (
                          <Button variant="outline" size="sm" className="h-9" onClick={() => setEditing({ ...m })} title="Rôle et communes">
                            <ShieldCheck className="w-4 h-4 text-indigo-600 sm:mr-1.5" /><span className="hidden sm:inline">Rôle</span>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => handleRemoveMember(m)} title="Retirer de l'équipe" aria-label="Retirer de l'équipe">
                          <UserMinus className="w-4 h-4 text-red-600" />
                        </Button>
                      </li>
                    ))}
                    {pending.map((inv) => (
                      <li key={inv.id} className="flex items-center gap-3 p-3 bg-amber-50/60">
                        <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold flex-none">@</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 text-sm truncate">{inv.email}</p>
                          <Badge className="mt-1 bg-amber-100 text-amber-800">Invitation en attente</Badge>
                        </div>
                      </li>
                    ))}
                    {team.length === 0 && pending.length === 0 && (
                      <li className="p-6 text-center text-sm text-slate-500">Aucun utilisateur pour le moment</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* ---------- Communes ---------- */}
            {tab === 'communes' && (
              <Card className="border border-slate-200 rounded-2xl">
                <CardContent className="p-4 sm:p-6 space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Ajouter une commune</label>
                    <div className="flex gap-2">
                      <Input value={newCommune} onChange={(e) => setNewCommune(e.target.value)} placeholder="Nom de la commune" className="flex-1 h-10" onKeyDown={(e) => e.key === 'Enter' && handleAddCommune()} />
                      <Button onClick={handleAddCommune} disabled={updateCabinet.isPending} className="h-10 bg-blue-800 hover:bg-blue-900">
                        {updateCabinet.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Ajouter</span></>}
                      </Button>
                    </div>
                  </div>
                  {communes.length === 0 ? (
                    <p className="text-center text-slate-500 py-8 bg-slate-50 rounded-xl">Aucune commune configurée</p>
                  ) : (
                    <ul className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' }}>
                      {communes.map((c) => (
                        <li key={c} className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="flex items-center gap-2 min-w-0">
                            <MapPin className="w-4 h-4 text-blue-700 flex-none" />
                            <span className="font-semibold text-slate-800 truncate">{c}</span>
                          </span>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleRemoveCommune(c)} disabled={updateCabinet.isPending} aria-label={`Retirer ${c}`}>
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ---------- Couches ---------- */}
            {tab === 'couches' && (
              <Card className="border border-slate-200 rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <CadastreManagerPanel organisation={cabinet} active />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Rôle et communes supervisées */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rôle de {editing?.full_name || editing?.email}</DialogTitle>
            <DialogDescription>Agent ou superviseur, et communes supervisées</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={editing?.role === 'superviseur' ? 'superviseur' : 'user'} onValueChange={(role) => setEditing((p) => ({ ...p, role }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Agent</SelectItem>
                <SelectItem value="superviseur">Superviseur</SelectItem>
              </SelectContent>
            </Select>
            {editing?.role === 'superviseur' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Communes supervisées</label>
                <div className="flex flex-wrap gap-2">
                  {communes.map((c) => {
                    const on = (editing?.communes_supervisees || []).includes(c);
                    return (
                      <button key={c} type="button"
                        onClick={() => setEditing((p) => ({ ...p, communes_supervisees: on ? (p.communes_supervisees || []).filter((x) => x !== c) : [...(p.communes_supervisees || []), c] }))}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
                        {c}
                      </button>
                    );
                  })}
                  {communes.length === 0 && <p className="text-xs text-slate-500">Ajoutez d'abord des communes.</p>}
                </div>
                <p className="text-xs text-slate-400 mt-2">Sans commune cochée, le superviseur voit toutes les communes.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button
              className="bg-blue-800 hover:bg-blue-900"
              disabled={updateUser.isPending}
              onClick={() => {
                const role = editing.role === 'superviseur' ? 'superviseur' : 'user';
                updateUser.mutate(
                  { userId: editing.id, data: { role, communes_supervisees: role === 'superviseur' ? (editing.communes_supervisees || []) : [] } },
                  { onSuccess: () => { toast.success('Rôle mis à jour'); setEditing(null); } }
                );
              }}
            >
              {updateUser.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
