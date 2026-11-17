import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useAuthRedirect() {
  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (!isAuth) {
        base44.auth.redirectToLogin();
      }
    });
  }, []);
}
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, UserPlus, MoreVertical, Edit, Trash2, Shield, 
  Eye, Calendar, Mail, Settings, Database, AlertCircle, Upload, Image as ImageIcon, CheckCircle2, Palette,
  UserX, UserCheck, Ban, FileText
} from 'lucide-react';
import ConfigStatuts from '@/components/eguide/admin/ConfigStatuts';
import ConfigTheme from '@/components/eguide/admin/ConfigTheme';
import ConfigCoverPage from '@/components/eguide/admin/ConfigCoverPage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const ROLE_CONFIG = {
  admin: { label: 'Administrateur', color: 'bg-red-100 text-red-700', icon: Shield },
  user: { label: 'Utilisateur', color: 'bg-blue-100 text-blue-700', icon: Users },
  viewer: { label: 'Consulteur', color: 'bg-slate-100 text-slate-700', icon: Eye }
};

function ArmoirieUpload() {
  const [uploading, setUploading] = useState(false);
  const [armoirieUrl, setArmoirieUrl] = useState('');

  useEffect(() => {
    // Charger l'URL actuelle de l'armoirie depuis la configuration
    const loadArmoirie = async () => {
      try {
        const configs = await base44.entities.ConfigurationApp.filter({ cle: 'armoirie' });
        if (configs.length > 0 && configs[0].valeur?.url) {
          setArmoirieUrl(configs[0].valeur.url);
        }
      } catch (error) {
        console.error('Erreur chargement armoirie:', error);
      }
    };
    loadArmoirie();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Vérifier si une config existe déjà
      const configs = await base44.entities.ConfigurationApp.filter({ cle: 'armoirie' });
      
      if (configs.length > 0) {
        // Mettre à jour la config existante
        await base44.entities.ConfigurationApp.update(configs[0].id, {
          valeur: { url: file_url },
          description: 'URL de l\'armoirie pour les guides PDF'
        });
      } else {
        // Créer une nouvelle config
        await base44.entities.ConfigurationApp.create({
          cle: 'armoirie',
          valeur: { url: file_url },
          description: 'URL de l\'armoirie pour les guides PDF'
        });
      }
      
      setArmoirieUrl(file_url);
      toast.success('Armoirie uploadée avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Label className="text-base font-semibold mb-3 block">Armoirie pour les guides PDF</Label>
      <p className="text-sm text-slate-500 mb-4">
        Cette image sera affichée sur la page de garde de chaque guide généré
      </p>

      <div className="flex items-start gap-4">
        {armoirieUrl ? (
          <div className="relative w-32 h-32 border-2 border-slate-200 rounded-lg overflow-hidden">
            <img 
              src={armoirieUrl} 
              alt="Armoirie" 
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 right-2">
              <Badge className="bg-green-100 text-green-700 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        ) : (
          <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400">
            <ImageIcon className="w-8 h-8 mb-1" />
            <span className="text-xs">Aucune image</span>
          </div>
        )}

        <div className="flex-1">
          <Label 
            htmlFor="armoirie-upload" 
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {uploading ? (
              <>
                <Upload className="w-4 h-4 animate-pulse" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {armoirieUrl ? 'Remplacer l\'image' : 'Uploader une image'}
              </>
            )}
          </Label>
          <Input
            id="armoirie-upload"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <p className="text-xs text-slate-500 mt-2">
            Format recommandé : JPG ou PNG, ratio 1:1
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  useAuthRedirect();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', role: 'user' });
  const [inviting, setInviting] = useState(false);
  const [selectedLotissementId, setSelectedLotissementId] = useState('');
  const [dateAttribution, setDateAttribution] = useState('');
  const [dateAttestation, setDateAttestation] = useState('');
  const [updatingDates, setUpdatingDates] = useState(false);

  const queryClient = useQueryClient();

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me()
  });

  const { data: lotissements = [] } = useQuery({
    queryKey: ['lotissements-eguide'],
    queryFn: () => base44.entities.LotissementEguide.filter({ commune: { $exists: true, $ne: "" } })
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['all-lots'],
    queryFn: () => base44.entities.Lot.list()
  });

  const { data: attributaires = [] } = useQuery({
    queryKey: ['all-attributaires'],
    queryFn: () => base44.entities.Attributaire.list()
  });

  const handleInvite = async () => {
    if (!inviteData.email) {
      toast.error('Veuillez entrer une adresse email');
      return;
    }

    setInviting(true);
    try {
      await base44.users.inviteUser(inviteData.email, inviteData.role);
      toast.success(`Invitation envoyée à ${inviteData.email}`);
      setIsInviteOpen(false);
      setInviteData({ email: '', role: 'viewer' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de l\'invitation');
      console.error(error);
    } finally {
      setInviting(false);
    }
  };

  const handleToggleSuspension = async (userId, currentStatut) => {
    try {
      const newStatut = currentStatut === 'actif' ? 'suspendu' : 'actif';
      await base44.functions.invoke('updateUserAccess', { user_id: userId, statut: newStatut });
      toast.success(newStatut === 'suspendu' ? 'Utilisateur suspendu' : 'Utilisateur réactivé');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      toast.error('Erreur lors de la modification');
      console.error(error);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${userEmail} ?`)) return;
    
    try {
      await base44.entities.User.delete(userId);
      toast.success('Utilisateur supprimé');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  // Accès réservé aux administrateurs
  if (currentUser && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-6 text-center">
          <CardTitle className="mb-2">Accès refusé</CardTitle>
          <p className="text-sm text-slate-500">Cette page est réservée aux administrateurs.</p>
        </Card>
      </div>
    );
  }

  const handleUpdateDates = async () => {
    if (!selectedLotissementId) {
      toast.error('Veuillez sélectionner un lotissement');
      return;
    }

    if (!dateAttribution && !dateAttestation) {
      toast.error('Veuillez renseigner au moins une date');
      return;
    }

    setUpdatingDates(true);
    try {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      
      // Récupérer les lots du lotissement
      const lots = await base44.entities.Lot.filter({ id_lotissement: selectedLotissementId });
      const lotIds = lots.map(l => l.id);
      
      let attestationsUpdated = 0;
      let attributairesUpdated = 0;

      // Mettre à jour les attestations par lot
      if (dateAttestation) {
        const attestations = await base44.entities.Attestation.filter({});
        const attestationsToUpdate = attestations.filter(att => lotIds.includes(att.id_lot));
        
        const batchSize = 10;
        for (let i = 0; i < attestationsToUpdate.length; i += batchSize) {
          const batch = attestationsToUpdate.slice(i, i + batchSize);
          await Promise.all(
            batch.map(att => 
              base44.entities.Attestation.update(att.id, { date_attestation: dateAttestation })
            )
          );
          attestationsUpdated += batch.length;
          if (i + batchSize < attestationsToUpdate.length) await sleep(300);
        }
      }

      // Mettre à jour les attributaires par lot
      if (dateAttribution) {
        const attributaires = await base44.entities.Attributaire.filter({});
        const attributairesToUpdate = attributaires.filter(attr => lotIds.includes(attr.id_lot));
        
        const batchSize = 10;
        for (let i = 0; i < attributairesToUpdate.length; i += batchSize) {
          const batch = attributairesToUpdate.slice(i, i + batchSize);
          await Promise.all(
            batch.map(attr => 
              base44.entities.Attributaire.update(attr.id, { date_attribution: dateAttribution })
            )
          );
          attributairesUpdated += batch.length;
          if (i + batchSize < attributairesToUpdate.length) await sleep(300);
        }
      }

      toast.success(`Mise à jour réussie: ${attestationsUpdated} attestations${dateAttribution ? `, ${attributairesUpdated} attributaires` : ''}`);
      setSelectedLotissementId('');
      setDateAttribution('');
      setDateAttestation('');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    } finally {
      setUpdatingDates(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Administration</h1>
            <p className="text-slate-500 mt-1 hidden sm:block">Gestion des utilisateurs et paramètres</p>
          </div>
          
          {isAdmin && (
            <Button 
              onClick={() => setIsInviteOpen(true)} 
              style={{ 
                backgroundColor: '#1e293b',
                color: '#ffffff'
              }}
              className="w-full sm:w-auto hover:opacity-90"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Inviter un utilisateur
            </Button>
          )}
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-6 w-full flex flex-wrap gap-2 md:flex-nowrap md:overflow-x-auto md:gap-0">
            <TabsTrigger value="users" className="flex items-center gap-2 whitespace-nowrap md:flex-1 md:min-w-[12rem] md:justify-center">
              <Users className="w-4 h-4" />
              <span className="hidden md:inline">Utilisateurs</span>
              <span className="md:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2 whitespace-nowrap md:flex-1 md:min-w-[12rem] md:justify-center">
              <Database className="w-4 h-4" />
              <span className="hidden md:inline">Base de données</span>
              <span className="md:hidden">Database</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 whitespace-nowrap md:flex-1 md:min-w-[12rem] md:justify-center">
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">Paramètres</span>
              <span className="md:hidden">Param</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Utilisateurs</CardTitle>
                <CardDescription>
                  {users.length} utilisateur{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile: cartes utilisateurs */}
                <div className="sm:hidden p-4 space-y-3">
                  {users.map((user) => {
                    const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.user;
                    const RoleIcon = roleConfig.icon;
                    return (
                      <div key={user.id} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <Avatar className="ring-2 ring-blue-200">
                                                        <AvatarFallback className="bg-blue-100 text-blue-700">
                              {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate leading-tight">{user.full_name || 'Sans nom'}</p>
                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          </div>
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="ml-auto text-xs">Vous</Badge>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <Badge className={roleConfig.color}>
                            <RoleIcon className="w-3 h-3 mr-1" />
                            {roleConfig.label}
                          </Badge>
                          <Badge className={`gap-1 ${user.statut === 'actif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {user.statut === 'actif' ? (
                              <>
                                <UserCheck className="w-3 h-3" />
                                Actif
                              </>
                            ) : (
                              <>
                                <Ban className="w-3 h-3" />
                                Suspendu
                              </>
                            )}
                          </Badge>
                        </div>
                        {user.id !== currentUser?.id && (
                          <div className="mt-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-center rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300">
                                  <MoreVertical className="w-4 h-4 mr-2" />
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem 
                                  onClick={() => handleToggleSuspension(user.id, user.statut || 'actif')}
                                >
                                  {user.statut === 'suspendu' ? (
                                    <>
                                      <UserCheck className="w-4 h-4 mr-2" />
                                      Réactiver
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="w-4 h-4 mr-2" />
                                      Suspendre
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {users.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                      <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500">Aucun utilisateur</p>
                    </div>
                  )}
                </div>
                <div className="hidden sm:block">
                  <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date d'inscription</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.user;
                      const RoleIcon = roleConfig.icon;
                      
                      return (
                        <TableRow key={user.id} className="hover:bg-slate-50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="ring-2 ring-blue-200">
                                <AvatarFallback className="bg-blue-100 text-blue-700">
                                  {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {user.full_name || 'Sans nom'}
                                </p>
                                {user.id === currentUser?.id && (
                                  <Badge variant="outline" className="text-xs">Vous</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Mail className="w-4 h-4 text-slate-400" />
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={roleConfig.color}>
                              <RoleIcon className="w-3 h-3 mr-1" />
                              {roleConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.statut === 'actif' ? 'outline' : 'destructive'} className="gap-1">
                              {user.statut === 'actif' ? (
                                <>
                                  <UserCheck className="w-3 h-3" />
                                  Actif
                                </>
                              ) : (
                                <>
                                  <Ban className="w-3 h-3" />
                                  Suspendu
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate-500">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {user.created_date 
                                ? format(new Date(user.created_date), 'dd/MM/yyyy', { locale: fr })
                                : '-'
                              }
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {user.id !== currentUser?.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => handleToggleSuspension(user.id, user.statut || 'actif')}
                                  >
                                    {user.statut === 'suspendu' ? (
                                      <>
                                        <UserCheck className="w-4 h-4 mr-2" />
                                        Réactiver
                                      </>
                                    ) : (
                                      <>
                                        <UserX className="w-4 h-4 mr-2" />
                                        Suspendre
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => handleDeleteUser(user.id, user.email)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12">
                          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-500">Aucun utilisateur</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Card className="rounded-2xl shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Statistiques de la base</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm md:text-base">
                    <span className="px-2.5 py-1 rounded-md bg-blue-200 text-blue-900 border border-blue-300 font-semibold">Lotissements</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-900 font-semibold">{lotissements.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm md:text-base">
                    <span className="px-2.5 py-1 rounded-md bg-blue-200 text-blue-900 border border-blue-300 font-semibold">Lots</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-900 font-semibold">{lots.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm md:text-base">
                    <span className="px-2.5 py-1 rounded-md bg-blue-200 text-blue-900 border border-blue-300 font-semibold">Attributaires</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-900 font-semibold">{attributaires.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm md:text-base">
                    <span className="px-2.5 py-1 rounded-md bg-blue-200 text-blue-900 border border-blue-300 font-semibold">Utilisateurs</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-900 font-semibold">{users.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Répartition des lots</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl text-sm md:text-base">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <span className="text-slate-700 font-medium">Lot en vente</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-900 font-medium">
                      {lots.filter(l => l.statut === 'Lot en vente').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl text-sm md:text-base">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                      <span className="text-slate-700 font-medium">Lot vendu</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-900 font-medium">
                      {lots.filter(l => l.statut === 'Lot vendu').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl text-sm md:text-base">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <span className="text-slate-700 font-medium">Lot réservé</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-900 font-medium">
                      {lots.filter(l => l.statut === 'Lot réservé').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl text-sm md:text-base">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <div className="w-3 h-3 rounded-full bg-orange-400" />
                      <span className="text-slate-700 font-medium">Lot non cessible</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-900 font-medium">
                      {lots.filter(l => l.statut === 'Lot non à vendre').length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <ConfigCoverPage />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dates d'attestation et d'attribution</CardTitle>
                <CardDescription>
                  Modifier les dates pour un lotissement existant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Lotissement</Label>
                  <Select 
                    value={selectedLotissementId} 
                    onValueChange={setSelectedLotissementId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un lotissement..." />
                    </SelectTrigger>
                    <SelectContent>
                      {lotissements.map((lot) => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.nom} - {lot.region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date_attestation">Date d'attestation</Label>
                    <Input
                      id="date_attestation"
                      type="date"
                      value={dateAttestation}
                      onChange={(e) => setDateAttestation(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="date_attribution">Date d'attribution</Label>
                    <Input
                      id="date_attribution"
                      type="date"
                      value={dateAttribution}
                      onChange={(e) => setDateAttribution(e.target.value)}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleUpdateDates} 
                  disabled={updatingDates || !selectedLotissementId}
                  className="w-full"
                >
                  {updatingDates ? (
                    'Mise à jour en cours...'
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Mettre à jour les dates
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <ConfigTheme />

            <ConfigStatuts />
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Modal */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter un utilisateur</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Adresse email</Label>
              <Input
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                placeholder="exemple@email.com"
              />
            </div>

            <div>
              <Label>Rôle</Label>
              <Select 
                value={inviteData.role} 
                onValueChange={(v) => setInviteData({...inviteData, role: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Eye className="w-4 h-4" />
                      Consulteur - Consultation carte uniquement
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Users className="w-4 h-4" />
                      Utilisateur - Consultation et édition
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Shield className="w-4 h-4" />
                      Administrateur - Accès complet
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>Un email d'invitation sera envoyé à cette adresse avec un lien pour créer un compte.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}