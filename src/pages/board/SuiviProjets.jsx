import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter } from 'lucide-react';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { createBoardPageUrl as createPageUrl } from "@/lib/boardPageUrl";
import PageHeader from "@/components/board/layout/PageHeader";
import ProjetsList from "@/components/board/projets/ProjetsList";
import ProjetForm from "@/components/board/projets/ProjetForm";
import ChangePasswordModal from "@/components/board/auth/ChangePasswordModal";
import ProjetsKPI from "@/components/board/projets/ProjetsKPI";

export default function SuiviProjets() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedProjet, setSelectedProjet] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [filtreBureau, setFiltreBureau] = useState('tous');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtreType, setFiltreType] = useState('tous');
  const [filtreBloques, setFiltreBloques] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser?.must_change_password) setShowChangePassword(true);
    };
    loadUser();
  }, []);

  const { data: bureaux } = useQuery({ queryKey: ['bureaux'], queryFn: () => base44.entities.Bureau.list() });

  const isAdmin = user?.role === 'admin' || user?.fonction === 'admin';

  const { data: projets, isLoading } = useQuery({
    queryKey: ['projets', user?.bureau_id, isAdmin],
    queryFn: async () => {
      if (isAdmin) return base44.entities.Projet.list('-created_date');
      if (user?.bureau_id) return base44.entities.Projet.filter({ bureau_id: user.bureau_id }, '-created_date');
      return [];
    },
    enabled: !!user
  });

  const userBureau = bureaux?.find(b => b.id === user?.bureau_id);

  const typesDisponibles = [...new Set((projets || []).map(p => p.type_activite).filter(Boolean))];

  const projetsFiltres = (projets || []).filter(p => {
    if (filtreBureau !== 'tous' && p.bureau_id !== filtreBureau) return false;
    if (filtreStatut !== 'tous' && p.statut !== filtreStatut) return false;
    if (filtreType !== 'tous' && p.type_activite !== filtreType) return false;
    if (filtreBloques && !p.bloque) return false;
    return true;
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['projets'] });
    setShowForm(false);
    setSelectedProjet(null);
  };
  const handleView = (projet) => navigate(createPageUrl(`ProjetDetailPage?id=${projet.id}`));
  const handleEdit = (projet) => { setSelectedProjet(projet); setShowForm(true); };
  const handleDelete = async (projet) => {
    await base44.entities.Projet.delete(projet.id);
    queryClient.invalidateQueries({ queryKey: ['projets'] });
    toast.success(`Projet "${projet.titre}" supprimé`);
  };
  const handlePasswordChanged = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setShowChangePassword(false);
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <ChangePasswordModal open={showChangePassword} onSuccess={handlePasswordChanged} user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Suivi des Projets"
          align="left"
          action={{
            icon: Plus,
            label: "Nouveau projet",
            tooltip: "Créer un nouveau projet",
            onClick: () => { setSelectedProjet(null); setShowForm(true); }
          }}
        />

        <ProjetsKPI projets={projetsFiltres} />

        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500"><Filter className="w-4 h-4" /> Filtres</div>
          {isAdmin && (
            <Select value={filtreBureau} onValueChange={setFiltreBureau}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Bureau" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les bureaux</SelectItem>
                {(bureaux || []).map(b => <SelectItem key={b.id} value={b.id}>{b.nom} ({b.code})</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={filtreStatut} onValueChange={setFiltreStatut}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous statuts</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="termine">Terminé</SelectItem>
              <SelectItem value="en_arret">En arrêt</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtreType} onValueChange={setFiltreType}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous types</SelectItem>
              {typesDisponibles.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={filtreBloques ? 'default' : 'outline'} size="sm" onClick={() => setFiltreBloques(v => !v)}>
            Bloqués uniquement
          </Button>
        </div>

        <ProjetsList projets={projetsFiltres} bureaux={bureaux} isLoading={isLoading} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />

        <ProjetForm open={showForm} onOpenChange={setShowForm} projet={selectedProjet} bureau={userBureau} bureaux={bureaux} isAdmin={isAdmin} onSuccess={handleSuccess} />
      </div>
    </div>
  );
}